// Order context, history, Supabase integration, and automated Resend notifications.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { readJSON, writeJSON, subscribe } from '../utils/storage.js'
import { newId, newOrderReference } from '../utils/id.js'
import { toCents, fromCents, sumMoney, lineTotal } from '../utils/money.js'
import { SHIPPING_FLAT } from '../config.js'
import { validateCheckout } from '../utils/validators.js'
import { useProducts } from './ProductContext.jsx'
import { useAuth } from './AuthContext.jsx'
import { useCart } from './CartContext.jsx'
import { mockOrders } from '../data/mockOrders.js'
import { sendOrderNotifications } from '../services/notificationService.js'

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

        setOrders(formatted)
        writeJSON('orders', formatted)
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
          priceCents: Math.round(prod.price * 100),
          quantity: item.quantity,
          image: prod.image,
        })
        stockDeltas.push({
          productId: prod.id,
          quantity: item.quantity,
        })
      }

      // Check stock
      const stockResult = applyStockDeltas(stockDeltas)
      if (!stockResult.ok) {
        return stockResult
      }

      const subtotal = sumMoney(orderItems.map((i) => lineTotal(i.price, i.quantity)))
      const shipping = SHIPPING_FLAT
      const total = fromCents(toCents(subtotal) + toCents(shipping))
      const now = new Date().toISOString()
      const reference = newOrderReference()

      const newOrderRecord = {
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
        subtotalCents: toCents(subtotal),
        shipping,
        shippingCents: toCents(shipping),
        total,
        totalCents: toCents(total),
        status: 'Pending',
        timeline: [{ status: 'Pending', at: now }],
        createdAt: now,
        updatedAt: now,
      }

      // If Supabase is active, persist to PostgreSQL
      if (isSupabaseConfigured) {
        try {
          // Attempt atomic RPC call
          const { error: rpcErr } = await supabase.rpc('place_order', {
            p_reference: reference,
            p_user_id: user?.id || null,
            p_customer_name: customer.name.trim(),
            p_customer_phone: customer.phone.trim(),
            p_customer_email: customer.email.trim().toLowerCase(),
            p_street: address.street.trim(),
            p_city: address.city.trim(),
            p_postal_code: address.postalCode.trim(),
            p_notes: notes ? notes.trim() : '',
            p_subtotal_cents: toCents(subtotal),
            p_shipping_cents: toCents(shipping),
            p_total_cents: toCents(total),
            p_items: orderItems,
          })

          if (rpcErr) {
            console.warn('[OrderContext] RPC failed, falling back to direct inserts:', rpcErr)
            // Direct insert fallback
            const { data: insertedOrder, error: orderErr } = await supabase
              .from('orders')
              .insert([
                {
                  reference,
                  user_id: user?.id || null,
                  customer_name: customer.name.trim(),
                  customer_phone: customer.phone.trim(),
                  customer_email: customer.email.trim().toLowerCase(),
                  street: address.street.trim(),
                  city: address.city.trim(),
                  postal_code: address.postalCode.trim(),
                  notes: notes ? notes.trim() : '',
                  subtotal_cents: toCents(subtotal),
                  shipping_cents: toCents(shipping),
                  total_cents: toCents(total),
                  status: 'Pending',
                },
              ])
              .select()
              .single()

            if (!orderErr && insertedOrder) {
              newOrderRecord.id = insertedOrder.id
              const itemRows = orderItems.map((it) => ({
                order_id: insertedOrder.id,
                product_id: it.productId,
                name: it.name,
                price_cents: it.priceCents,
                image_url: it.image,
                quantity: it.quantity,
              }))
              await supabase.from('order_items').insert(itemRows)
              await supabase.from('order_status_events').insert([
                { order_id: insertedOrder.id, status: 'Pending' },
              ])
            }
          }
        } catch (dbErr) {
          console.warn('[OrderContext] Supabase order placement error:', dbErr)
        }
      }

      // Update state
      setOrders((prev) => {
        const next = [newOrderRecord, ...prev]
        writeJSON('orders', next)
        return next
      })

      // Send notifications (Customer Confirmation + Admin Alert via Resend)
      sendOrderNotifications(newOrderRecord).catch((err) =>
        console.warn('[Notification Error]:', err)
      )

      clearCart()
      return { ok: true, order: newOrderRecord }
    },
    [products, applyStockDeltas, user, clearCart]
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
