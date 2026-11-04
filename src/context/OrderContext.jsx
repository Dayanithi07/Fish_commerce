// Order context, history, and status updates. Owner: A3 (Data and State).
// Implements contract in SYSTEM_ARCHITECTURE.md section 6.5.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { readJSON, writeJSON, subscribe } from '../utils/storage.js'
import { newId, newOrderReference } from '../utils/id.js'
import { toCents, fromCents, sumMoney, lineTotal } from '../utils/money.js'
import { SHIPPING_FLAT } from '../config.js'
import { validateCheckout } from '../utils/validators.js'
import { useProducts } from './ProductContext.jsx'
import { useAuth } from './AuthContext.jsx'
import { useCart } from './CartContext.jsx'
import { mockOrders } from '../data/mockOrders.js'

const OrderContext = createContext(null)

const ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed'],
  Confirmed: ['Shipped'],
  Shipped: ['Delivered'],
  Delivered: [],
}

export function OrderProvider({ children }) {
  const { products, applyStockDeltas } = useProducts()
  const { user } = useAuth()
  const { clearCart } = useCart()

  const [orders, setOrders] = useState(() => {
    const stored = readJSON('orders', null)
    if (Array.isArray(stored) && stored.length > 0) {
      return stored
    }
    // Seed sample orders for demo/testing
    writeJSON('orders', mockOrders)
    return mockOrders
  })

  // Set when an order arrives from ANOTHER tab (FR-ADM-03)
  const [latestIncoming, setLatestIncoming] = useState(null)

  // Sync to storage
  useEffect(() => {
    writeJSON('orders', orders)
  }, [orders])

  // Listen for storage events from other tabs
  useEffect(() => {
    const unsubscribe = subscribe('orders', (newOrders) => {
      if (Array.isArray(newOrders) && newOrders.length > 0) {
        // If an order was added that wasn't previously in our local orders list
        const newest = newOrders[0]
        setOrders((prev) => {
          if (newest && !prev.some((o) => o.id === newest.id)) {
            setLatestIncoming({
              id: newest.id,
              reference: newest.reference,
              at: Date.now(),
            })
          }
          return newOrders
        })
      }
    })
    return unsubscribe
  }, [])

  const activeOrders = useMemo(() => {
    return orders.filter((o) => ['Pending', 'Confirmed', 'Shipped'].includes(o.status))
  }, [orders])

  const deliveredOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'Delivered')
  }, [orders])

  const pendingCount = useMemo(() => {
    return orders.filter((o) => o.status === 'Pending').length
  }, [orders])

  const getOrderById = useCallback(
    (id) => {
      return orders.find((o) => o.id === id)
    },
    [orders]
  )

  const getOrderByReference = useCallback(
    (reference) => {
      return orders.find((o) => o.reference.toUpperCase() === (reference || '').trim().toUpperCase())
    },
    [orders]
  )

  /**
   * Place a new order.
   * Decrements stock, generates unique reference, creates order object, clears cart.
   */
  const placeOrder = useCallback(
    (data) => {
      const { items, customer, address, notes = '' } = data

      if (!items || items.length === 0) {
        return { ok: false, error: { code: 'EMPTY_CART', message: 'Cannot place an empty order.' } }
      }

      // 1. Validate fields
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
          ok: false,
          error: { code: 'VALIDATION', message: 'Please correct checkout errors.', details: validation.errors },
        }
      }

      // 2. Prepare order lines and verify stock
      const orderItems = []
      const stockDeltas = []

      for (const item of items) {
        const prod = products.find((p) => p.id === item.productId)
        if (!prod) {
          return {
            ok: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${item.productId} was not found.` },
          }
        }
        orderItems.push({
          productId: prod.id,
          name: prod.name,
          price: prod.price,
          quantity: item.quantity,
          image: prod.image,
        })
        stockDeltas.push({
          productId: prod.id,
          quantity: item.quantity,
        })
      }

      // 3. Atomically decrement stock
      const stockResult = applyStockDeltas(stockDeltas)
      if (!stockResult.ok) {
        return stockResult
      }

      // 4. Calculate totals
      const subtotal = sumMoney(orderItems.map((i) => lineTotal(i.price, i.quantity)))
      const shipping = SHIPPING_FLAT
      const total = fromCents(toCents(subtotal) + toCents(shipping))

      // 5. Generate reference and order record
      const now = new Date().toISOString()
      const reference = newOrderReference()
      const order = {
        id: newId(),
        reference,
        userId: user?.id || null,
        customerName: customer.name.trim(),
        customerEmail: customer.email.trim().toLowerCase(),
        customerPhone: customer.phone.trim(),
        street: address.street.trim(),
        city: address.city.trim(),
        postalCode: address.postalCode.trim(),
        notes: notes ? notes.trim() : '',
        items: orderItems,
        subtotal,
        shipping,
        total,
        status: 'Pending',
        timeline: [{ status: 'Pending', at: now }],
        createdAt: now,
        updatedAt: now,
      }

      // 6. Update orders list (newest first)
      setOrders((prev) => {
        const next = [order, ...prev]
        writeJSON('orders', next)
        return next
      })

      // 7. Clear cart
      clearCart()

      return { ok: true, order }
    },
    [products, applyStockDeltas, user, clearCart]
  )

  /**
   * Admin transitions order status: Pending -> Confirmed -> Shipped -> Delivered
   */
  const updateOrderStatus = useCallback(
    (orderId, nextStatus) => {
      const order = orders.find((o) => o.id === orderId)
      if (!order) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Order not found.' } }
      }

      const allowed = ALLOWED_TRANSITIONS[order.status] || []
      if (!allowed.includes(nextStatus)) {
        return {
          ok: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot transition status from ${order.status} to ${nextStatus}.`,
          },
        }
      }

      const now = new Date().toISOString()
      const updatedOrder = {
        ...order,
        status: nextStatus,
        timeline: [...order.timeline, { status: nextStatus, at: now }],
        updatedAt: now,
      }

      setOrders((prev) => {
        const next = prev.map((o) => (o.id === orderId ? updatedOrder : o))
        writeJSON('orders', next)
        return next
      })

      return { ok: true, order: updatedOrder }
    },
    [orders]
  )

  const getUserOrders = useCallback(
    (targetUserId, targetEmail) => {
      const uid = targetUserId || user?.id
      const mail = (targetEmail || user?.email || '').toLowerCase().trim()
      return orders.filter(
        (o) =>
          (uid && o.userId === uid) ||
          (mail && o.customerEmail?.toLowerCase() === mail)
      )
    },
    [orders, user]
  )

  const value = useMemo(
    () => ({
      orders,
      activeOrders,
      deliveredOrders,
      pendingCount,
      latestIncoming,
      placeOrder,
      updateOrderStatus,
      getOrderById,
      getOrderByReference,
      getUserOrders,
    }),
    [
      orders,
      activeOrders,
      deliveredOrders,
      pendingCount,
      latestIncoming,
      placeOrder,
      updateOrderStatus,
      getOrderById,
      getOrderByReference,
      getUserOrders,
    ]
  )

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrderContext)
  if (ctx === null) {
    throw new Error('useOrders must be used inside <OrderProvider>')
  }
  return ctx
}
