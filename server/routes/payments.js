import { Router } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import { db } from '../db/database.js'
import { validateCheckout } from '../../src/utils/validators.js'
import { newId, newOrderReference } from '../../src/utils/id.js'
import { fromCents, lineTotal, sumMoney, toCents } from '../../src/utils/money.js'
import { SHIPPING_FLAT, CURRENCY } from '../../src/config.js'

export const paymentRouter = Router()

function getRazorpayCredentials() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null
  return { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET }
}

async function razorpayRequest(path, credentials, options = {}) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('[Payments] Razorpay API request failed:', response.status)
    throw new Error('The payment provider could not process the request.')
  }
  return result
}

function getCheckoutData(body) {
  const { items, customer, address, notes = '' } = body || {}
  if (!Array.isArray(items) || items.length === 0) {
    return { error: { code: 'EMPTY_CART', message: 'Cart items cannot be empty.' } }
  }
  if (typeof notes !== 'string') {
    return { error: { code: 'VALIDATION', message: 'Delivery notes must be text.' } }
  }

  const validation = validateCheckout({
    customerName: customer?.name,
    customerEmail: customer?.email,
    customerPhone: customer?.phone,
    street: address?.street,
    city: address?.city,
    postalCode: address?.postalCode,
    notes,
  })
  if (!validation.valid) {
    return {
      error: {
        code: 'VALIDATION',
        message: 'Please correct checkout errors.',
        details: validation.errors,
      },
    }
  }

  const quantities = new Map()
  for (const item of items) {
    if (
      typeof item?.productId !== 'string' ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    ) {
      return { error: { code: 'VALIDATION', message: 'Cart contains an invalid item.' } }
    }
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity)
  }

  const orderItems = []
  for (const [productId, quantity] of quantities) {
    const product = db.getProductById(productId)
    if (!product || !product.isAvailable) {
      return {
        error: { code: 'PRODUCT_NOT_FOUND', message: 'A product in your cart is no longer available.' },
      }
    }
    if (product.stock < quantity) {
      return {
        error: {
          code: 'OUT_OF_STOCK',
          message: `Insufficient stock for ${product.name} (available: ${product.stock}).`,
        },
      }
    }
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image,
    })
  }

  return {
    orderItems,
    customer: {
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.trim(),
    },
    address: {
      street: address.street.trim(),
      city: address.city.trim(),
      postalCode: address.postalCode.trim(),
    },
    notes: notes.trim(),
  }
}

paymentRouter.post('/razorpay/order', async (req, res) => {
  const credentials = getRazorpayCredentials()
  if (!credentials) {
    return res.status(503).json({
      ok: false,
      error: { code: 'PAYMENT_NOT_CONFIGURED', message: 'Online payment is not configured. Contact the store.' },
    })
  }

  const checkout = getCheckoutData(req.body)
  if (checkout.error) {
    return res.status(checkout.error.code === 'OUT_OF_STOCK' ? 409 : 400).json({
      ok: false,
      error: checkout.error,
    })
  }

  const subtotal = sumMoney(checkout.orderItems.map((item) => lineTotal(item.price, item.quantity)))
  const total = fromCents(toCents(subtotal) + toCents(SHIPPING_FLAT))
  if (!Number.isSafeInteger(req.body?.expectedTotalCents) || req.body.expectedTotalCents !== toCents(total)) {
    return res.status(409).json({
      ok: false,
      error: {
        code: 'PRICE_CHANGED',
        message: 'Your cart total changed. Review the updated total before trying again.',
      },
    })
  }
  const reference = newOrderReference()

  try {
    const gatewayOrder = await razorpayRequest('/orders', credentials, {
      method: 'POST',
      body: JSON.stringify({
        amount: toCents(total),
        currency: CURRENCY,
        receipt: reference,
      }),
    })

    const intent = db.createPaymentIntent({
      id: newId(),
      reference,
      gatewayOrderId: gatewayOrder.id,
      amount: toCents(total),
      currency: CURRENCY,
      orderItems: checkout.orderItems,
      customer: checkout.customer,
      address: checkout.address,
      notes: checkout.notes,
      status: 'created',
      createdAt: new Date().toISOString(),
    })

    res.status(201).json({
      ok: true,
      payment: {
        keyId: credentials.keyId,
        orderId: intent.gatewayOrderId,
        amount: intent.amount,
        currency: intent.currency,
        name: 'Fishcommerce',
        description: `Order ${intent.reference}`,
        prefill: {
          name: intent.customer.name,
          email: intent.customer.email,
          contact: intent.customer.phone,
        },
      },
    })
  } catch (error) {
    console.error('[Payments] Could not create Razorpay order:', error.message)
    res.status(502).json({
      ok: false,
      error: { code: 'PAYMENT_PROVIDER_ERROR', message: 'Unable to start online payment. Please try again.' },
    })
  }
})

paymentRouter.post('/razorpay/verify', async (req, res) => {
  const credentials = getRazorpayCredentials()
  if (!credentials) {
    return res.status(503).json({
      ok: false,
      error: { code: 'PAYMENT_NOT_CONFIGURED', message: 'Online payment is not configured. Contact the store.' },
    })
  }

  const { razorpay_order_id: gatewayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {}
  if (
    typeof gatewayOrderId !== 'string' ||
    typeof paymentId !== 'string' ||
    typeof signature !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_PAYMENT_RESPONSE', message: 'The payment response is invalid.' },
    })
  }

  const intent = db.getPaymentIntentByGatewayOrderId(gatewayOrderId)
  if (!intent) {
    return res.status(404).json({
      ok: false,
      error: { code: 'PAYMENT_ORDER_NOT_FOUND', message: 'The payment session could not be found.' },
    })
  }
  if (intent.status === 'paid' && intent.order) {
    return res.json({ ok: true, order: intent.order })
  }
  if (intent.status === 'paid_needs_attention') {
    return res.status(409).json({
      ok: false,
      error: {
        code: 'PAID_ORDER_REQUIRES_SUPPORT',
        message: 'Payment succeeded, but stock changed. Contact the store with your payment reference.',
      },
    })
  }
  if (intent.status !== 'created') {
    return res.status(409).json({
      ok: false,
      error: { code: 'PAYMENT_VERIFICATION_IN_PROGRESS', message: 'This payment is already being verified.' },
    })
  }

  const expectedSignature = createHmac('sha256', credentials.keySecret)
    .update(`${gatewayOrderId}|${paymentId}`)
    .digest()
  const receivedSignature = Buffer.from(signature, 'hex')
  if (!timingSafeEqual(expectedSignature, receivedSignature)) {
    return res.status(400).json({
      ok: false,
      error: { code: 'PAYMENT_SIGNATURE_INVALID', message: 'Payment verification failed.' },
    })
  }

  db.updatePaymentIntent(intent.id, { status: 'verifying' })
  try {
    const payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`, credentials)
    if (
      payment.order_id !== gatewayOrderId ||
      payment.amount !== intent.amount ||
      payment.currency !== intent.currency ||
      payment.status !== 'captured' ||
      payment.captured !== true
    ) {
      db.updatePaymentIntent(intent.id, { status: 'created' })
      return res.status(409).json({
        ok: false,
        error: {
          code: 'PAYMENT_NOT_CAPTURED',
          message: 'Payment has not been captured yet. Please retry verification or contact the store.',
        },
      })
    }

    for (const item of intent.orderItems) {
      const product = db.getProductById(item.productId)
      if (!product || !product.isAvailable || product.stock < item.quantity) {
        db.updatePaymentIntent(intent.id, { status: 'paid_needs_attention', paymentId })
        return res.status(409).json({
          ok: false,
          error: {
            code: 'PAID_ORDER_REQUIRES_SUPPORT',
            message: 'Payment succeeded, but stock changed. Contact the store with your payment reference.',
          },
        })
      }
    }

    const subtotal = sumMoney(intent.orderItems.map((item) => lineTotal(item.price, item.quantity)))
    const shipping = SHIPPING_FLAT
    const now = new Date().toISOString()
    const order = {
      id: newId(),
      reference: intent.reference,
      userId: null,
      customerName: intent.customer.name,
      customerEmail: intent.customer.email,
      customerPhone: intent.customer.phone,
      street: intent.address.street,
      city: intent.address.city,
      postalCode: intent.address.postalCode,
      notes: intent.notes,
      items: intent.orderItems,
      subtotal,
      shipping,
      total: fromCents(toCents(subtotal) + toCents(shipping)),
      status: 'Pending',
      paymentMethod: 'Online',
      paymentProvider: 'Razorpay',
      paymentStatus: 'Paid',
      paymentId,
      gatewayOrderId,
      timeline: [{ status: 'Pending', at: now }],
      createdAt: now,
      updatedAt: now,
    }

    const savedOrder = db.createPaidOrder(order, intent.id, paymentId)
    if (!savedOrder.ok) {
      db.updatePaymentIntent(intent.id, { status: 'paid_needs_attention', paymentId })
      return res.status(409).json({
        ok: false,
        error: {
          code: 'PAID_ORDER_REQUIRES_SUPPORT',
          message: savedOrder.error.message,
        },
      })
    }
    return res.json({ ok: true, order })
  } catch (error) {
    db.updatePaymentIntent(intent.id, { status: 'created' })
    console.error('[Payments] Could not verify Razorpay payment:', error.message)
    return res.status(502).json({
      ok: false,
      error: { code: 'PAYMENT_VERIFICATION_ERROR', message: 'Unable to verify payment right now. Please retry.' },
    })
  }
})
