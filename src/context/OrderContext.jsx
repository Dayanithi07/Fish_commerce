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
    return []
  })

  const [latestIncoming, setLatestIncoming] = useState(null)

  // Map a DB row (snake_case) to our camelCase format
  const mapDbOrder = (o) => ({
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
  })

  // Fetch orders from Supabase if configured
  const fetchSupabaseOrders = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      // 1. Try direct table query (RLS will filter: admins see all, customers see own)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*),
          timeline:order_status_events(*)
        `)
        .order('created_at', { ascending: false })

      let dbOrders = []
      let fetchSucceeded = false
      if (!error && data) {
        dbOrders = data.map(mapDbOrder)
        fetchSucceeded = true
      } else if (error) {
        console.warn('[OrderContext] Direct orders fetch note:', error.message || error)
      }

      // 2. For authenticated customers, also fetch via RPC (SECURITY DEFINER bypasses RLS)
      if (user?.email) {
        try {
          const { data: custOrders, error: custErr } = await supabase.rpc('get_customer_orders', {
            p_email: user.email,
          })
          if (!custErr && Array.isArray(custOrders)) {
            fetchSucceeded = true
            // RPC returns camelCase JSONB — merge with direct results, dedup by id
            const existingIds = new Set(dbOrders.map((o) => o.id))
            const newFromRpc = custOrders.filter((o) => !existingIds.has(o.id))
            dbOrders = [...dbOrders, ...newFromRpc]
          }
        } catch (e) {
          // RPC may not exist if migration not applied — silent fallback
        }
      }

      // 3. Sort by date and update state
      dbOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      if (fetchSucceeded) {
        setOrders(dbOrders)
        writeJSON('orders', dbOrders)
      }
    } catch (err) {
      console.warn('[OrderContext] Fetch orders error:', err)
    }
  }, [user])

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

  const fetchOrderByReference = useCallback(
    async (reference) => {
      const clean = (reference || '').trim().toUpperCase()
      if (!clean) return null
      const local = orders.find((o) => o.reference?.toUpperCase() === clean)
      if (local) return local

      if (isSupabaseConfigured) {
        try {
          // 1. Try secure RPC lookup first
          const { data: rpcData, error: rpcErr } = await supabase.rpc('get_order_by_reference', {
            p_ref: clean,
          })
          if (!rpcErr && rpcData && rpcData.id) {
            return rpcData
          }

          // 2. Direct query fallback
          const { data, error } = await supabase
            .from('orders')
            .select(`
              *,
              items:order_items(*),
              timeline:order_status_events(*)
            `)
            .ilike('reference', clean)
            .maybeSingle()

          if (!error && data) {
            const formatted = {
              id: data.id,
              reference: data.reference,
              userId: data.user_id,
              customerName: data.customer_name,
              customerEmail: data.customer_email,
              customerPhone: data.customer_phone,
              street: data.street,
              city: data.city,
              postalCode: data.postal_code,
              notes: data.notes,
              subtotal: data.subtotal_cents / 100,
              shipping: data.shipping_cents / 100,
              total: data.total_cents / 100,
              status: data.status,
              items: (data.items || []).map((it) => ({
                productId: it.product_id,
                name: it.name,
                price: it.price_cents / 100,
                quantity: it.quantity,
                image: it.image_url,
              })),
              timeline: (data.timeline || []).map((ev) => ({
                status: ev.status,
                at: ev.at,
              })),
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            }
            return formatted
          }
        } catch (err) {
          console.warn('[OrderContext] fetchOrderByReference error:', err)
        }
      }
      return null
    },
    [orders]
  )

  /**
   * Place a new order
   */
  const placeOrder = useCallback(
    async (data) => {
      const { items, customer, address, notes = '', paymentMethod = 'UPI QR', paymentRef = '' } = data

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

      const paymentNote = `[Payment: ${paymentMethod}${paymentRef ? ` | Ref: ${paymentRef}` : ''}]`
      const combinedNotes = [notes ? notes.trim() : '', paymentNote].filter(Boolean).join('\n')

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
        notes: combinedNotes,
        paymentMethod,
        paymentRef,
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
          const { data: rpcData, error: rpcErr } = await supabase.rpc('place_order', {
            p_reference: reference,
            p_user_id: user?.id || null,
            p_customer_name: customer.name.trim(),
            p_customer_phone: customer.phone.trim(),
            p_customer_email: customer.email.trim().toLowerCase(),
            p_street: address.street.trim(),
            p_city: address.city.trim(),
            p_postal_code: address.postalCode.trim(),
            p_notes: combinedNotes,
            p_subtotal_cents: toCents(subtotal),
            p_shipping_cents: toCents(shipping),
            p_total_cents: toCents(total),
            p_items: orderItems,
          })

          if (!rpcErr && rpcData?.orderId) {
            newOrderRecord.id = rpcData.orderId
          } else if (rpcErr) {
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
                  notes: combinedNotes,
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
      return orders.filter((o) => {
        const orderEmail = (o.customerEmail || '').toLowerCase().trim()
        const isUserMatch = Boolean(uid && o.userId && o.userId === uid)
        const isEmailMatch = Boolean(mail && orderEmail && orderEmail === mail)
        return isUserMatch || isEmailMatch
      })
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
      fetchOrderByReference,
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
      fetchOrderByReference,
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
