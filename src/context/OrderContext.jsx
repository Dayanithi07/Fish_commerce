// Order context, history, Supabase integration, and automated Resend notifications.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { readJSON, writeJSON, subscribe } from '../utils/storage.js'
import { validateCheckout } from '../utils/validators.js'
import { useProducts } from './ProductContext.jsx'
import { useAuth } from './AuthContext.jsx'
import { useCart } from './CartContext.jsx'
import { mockOrders } from '../data/mockOrders.js'
import { sendOrderNotifications } from '../services/notificationService.js'
import { payWithRazorpay } from '../services/paymentService.js'

const OrderContext = createContext(null)

const ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed'],
  Confirmed: ['Shipped'],
  Shipped: ['Delivered'],
  Delivered: [],
}

export function OrderProvider({ children }) {
  const { products, applyStockDeltas, refreshProducts } = useProducts()
  const { user } = useAuth()
  const { clearCart } = useCart()

  const [orders, setOrders] = useState(() => {
    const stored = readJSON('orders', null)
    if (Array.isArray(stored) && stored.length > 0) {
      return stored
    }
    return mockOrders
  })

  const [latestIncoming, setLatestIncoming] = useState(null)

  // Fetch orders from Supabase if configured
  const fetchSupabaseOrders = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*),
          timeline:order_status_events(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) {
        const formatted = data.map((o) => ({
          id: o.id,
          reference: o.reference,
          userId: o.user_id,
          customerName: o.customer_name,
          customerEmail: o.customer_email,
          customerPhone: o.customer_phone,
          street: o.street,
          city: o.city,
          postalCode: o.postal_code,
          notes: o.notes,
          subtotal: o.subtotal_cents / 100,
          shipping: o.shipping_cents / 100,
          total: o.total_cents / 100,
          status: o.status,
          items: (o.items || []).map((it) => ({
            productId: it.product_id,
            name: it.name,
            price: it.price_cents / 100,
            quantity: it.quantity,
            image: it.image_url,
          })),
          timeline: (o.timeline || []).map((ev) => ({
            status: ev.status,
            at: ev.at,
          })),
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        }))

        const storedOrders = readJSON('orders', [])
        const locallyPaidOrders = (Array.isArray(storedOrders) ? storedOrders : []).filter(
          (order) =>
            order.paymentProvider === 'Razorpay' &&
            !formatted.some((storedOrder) => storedOrder.reference === order.reference)
        )
        const mergedOrders = [...locallyPaidOrders, ...formatted]
        setOrders(mergedOrders)
        writeJSON('orders', mergedOrders)
      }
    } catch (err) {
      console.warn('[OrderContext] Fetch orders error:', err)
    }
  }, [])

  // Supabase Realtime Listener for new orders
  useEffect(() => {
    let channel = null
    if (isSupabaseConfigured) {
      fetchSupabaseOrders()

      channel = supabase
        .channel('orders-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            setLatestIncoming({
              id: payload.new.id,
              reference: payload.new.reference,
              at: Date.now(),
            })
            fetchSupabaseOrders()
            if (refreshProducts) refreshProducts()
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          () => {
            fetchSupabaseOrders()
          }
        )
        .subscribe()
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchSupabaseOrders, refreshProducts])

  // Cross-tab sync for localStorage fallback
  useEffect(() => {
    const unsubscribe = subscribe('orders', (newOrders) => {
      if (Array.isArray(newOrders) && newOrders.length > 0) {
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
    (id) => orders.find((o) => o.id === id),
    [orders]
  )

  const getOrderByReference = useCallback(
    (reference) => {
      return orders.find(
        (o) => o.reference?.toUpperCase() === (reference || '').trim().toUpperCase()
      )
    },
    [orders]
  )

  /**
   * Place a new order
   */
  const placeOrder = useCallback(
    async (data) => {
      const { items, customer, address, notes = '' } = data

      if (!items || items.length === 0) {
        return { ok: false, error: { code: 'EMPTY_CART', message: 'Cannot place an empty order.' } }
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
          ok: false,
          error: { code: 'VALIDATION', message: 'Please correct checkout errors.', details: validation.errors },
        }
      }

      for (const item of items) {
        const product = products.find((p) => p.id === item.productId)
        if (!product) {
          return {
            ok: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: 'A product in your cart was not found.' },
          }
        }
        if (product.stock < item.quantity) {
          return {
            ok: false,
            error: { code: 'OUT_OF_STOCK', message: `Only ${product.stock} items currently in stock.` },
          }
        }
      }

      let paymentResult
      try {
        paymentResult = await payWithRazorpay(data)
      } catch (error) {
        return {
          ok: false,
          error: {
            code: 'PAYMENT_ERROR',
            message: error.message || 'Unable to start online payment. Please try again.',
          },
        }
      }
      if (!paymentResult.ok) return paymentResult

      const newOrderRecord = paymentResult.order
      const stockResult = applyStockDeltas(
        newOrderRecord.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      )
      if (!stockResult.ok) {
        console.error('[OrderContext] Payment succeeded but local stock could not be synchronized:', stockResult.error)
        if (refreshProducts) await refreshProducts()
      }

      setOrders((prev) => {
        const next = [newOrderRecord, ...prev]
        writeJSON('orders', next)
        return next
      })

      sendOrderNotifications(newOrderRecord).catch((err) =>
        console.warn('[Notification Error]:', err)
      )

      clearCart()
      return { ok: true, order: newOrderRecord }
    },
    [products, applyStockDeltas, refreshProducts, clearCart]
  )

  /**
   * Admin transitions order status
   */
  const updateOrderStatus = useCallback(
    async (orderId, nextStatus) => {
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

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('orders')
            .update({ status: nextStatus, updated_at: now })
            .eq('id', orderId)

          await supabase.from('order_status_events').insert([
            { order_id: orderId, status: nextStatus },
          ])
        } catch (err) {
          console.warn('[OrderContext] Supabase status update error:', err)
        }
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
      refreshOrders: fetchSupabaseOrders,
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
      fetchSupabaseOrders,
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
