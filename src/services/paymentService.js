import { api } from './api.js'

const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js'
let razorpayLoadPromise

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true)
  if (razorpayLoadPromise) return razorpayLoadPromise

  razorpayLoadPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = RAZORPAY_CHECKOUT_URL
    script.onload = () => resolve(true)
    script.onerror = () => {
      script.remove()
      razorpayLoadPromise = null
      resolve(false)
    }
    document.body.appendChild(script)
  })
  return razorpayLoadPromise
}

export async function payWithRazorpay(checkoutData) {
  const orderResult = await api.createRazorpayOrder(checkoutData)
  if (!orderResult.ok) return orderResult

  const loaded = await loadRazorpay()
  if (!loaded || !window.Razorpay) {
    return {
      ok: false,
      error: { code: 'PAYMENT_CHECKOUT_UNAVAILABLE', message: 'Unable to load online payment. Please try again.' },
    }
  }

  return new Promise((resolve) => {
    let settled = false
    let verificationStarted = false
    const finish = (result) => {
      if (!settled) {
        settled = true
        resolve(result)
      }
    }
    const { payment } = orderResult
    const checkout = new window.Razorpay({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      name: payment.name,
      description: payment.description,
      order_id: payment.orderId,
      prefill: payment.prefill,
      theme: { color: '#6842d9' },
      handler: async (response) => {
        verificationStarted = true
        try {
          finish(await api.verifyRazorpayPayment(response))
        } catch {
          finish({
            ok: false,
            error: {
              code: 'PAYMENT_VERIFICATION_ERROR',
              message: 'Payment may have succeeded, but confirmation failed. Please contact the store before retrying.',
            },
          })
        }
      },
      modal: {
        ondismiss: () => {
          if (!verificationStarted) {
            finish({
              ok: false,
              error: { code: 'PAYMENT_CANCELLED', message: 'Payment was cancelled. No order has been placed.' },
            })
          }
        },
      },
    })

    checkout.on('payment.failed', (response) => {
      finish({
        ok: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: response.error?.description || 'Payment failed. Please try another online payment method.',
        },
      })
    })
    checkout.open()
  })
}
