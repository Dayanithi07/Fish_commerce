// Cart context and drawer state. Owner: A3 (Data and State).
// Implements contract in SYSTEM_ARCHITECTURE.md section 6.4.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { readJSON, writeJSON } from '../utils/storage.js'
import { toCents, fromCents, lineTotal, sumMoney } from '../utils/money.js'
import { useProducts } from './ProductContext.jsx'
import { useToast } from '../components/Toast.jsx'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { products } = useProducts()
  const { showToast } = useToast()

  const [items, setItems] = useState(() => {
    return readJSON('cart', [])
  })

  const [isOpen, setIsOpen] = useState(false)

  // Sync to storage
  useEffect(() => {
    writeJSON('cart', items)
  }, [items])

  // Reconcile cart items when products list or stock changes (FR-CART-05)
  useEffect(() => {
    if (!products || products.length === 0 || items.length === 0) return

    let modified = false
    const removedNames = []
    const clampedNames = []

    const reconciled = []

    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId)
      // Removed or completely out of stock or unavailable
      if (!prod || !prod.isAvailable || prod.stock <= 0) {
        modified = true
        removedNames.push(prod?.name || 'A product')
        continue
      }

      // Quantity exceeds available stock
      if (item.quantity > prod.stock) {
        modified = true
        clampedNames.push(`${prod.name} (adjusted to ${prod.stock})`)
        reconciled.push({ productId: item.productId, quantity: prod.stock })
      } else {
        reconciled.push(item)
      }
    }

    if (modified) {
      setItems(reconciled)
      writeJSON('cart', reconciled)

      if (removedNames.length > 0) {
        showToast(`${removedNames.join(', ')} is no longer available and was removed from your cart.`, {
          type: 'warning',
        })
      }
      if (clampedNames.length > 0) {
        showToast(`Quantity reduced for ${clampedNames.join(', ')} due to limited stock.`, {
          type: 'info',
        })
      }
    }
  }, [products, items, showToast])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  // Join items with product details and compute lineTotals
  const lines = useMemo(() => {
    return items
      .map((item) => {
        const prod = products.find((p) => p.id === item.productId)
        if (!prod) return null
        return {
          product: prod,
          quantity: item.quantity,
          lineTotal: lineTotal(prod.price, item.quantity),
        }
      })
      .filter(Boolean)
  }, [items, products])

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }, [items])

  const subtotal = useMemo(() => {
    return sumMoney(lines.map((line) => line.lineTotal))
  }, [lines])

  const addToCart = useCallback(
    (productId, quantity = 1) => {
      const prod = products.find((p) => p.id === productId)
      if (!prod) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } }
      }
      if (!prod.isAvailable || prod.stock <= 0) {
        return { ok: false, error: { code: 'OUT_OF_STOCK', message: 'This item is out of stock.' } }
      }

      let resultError = null

      setItems((prev) => {
        const existing = prev.find((item) => item.productId === productId)
        const currentQty = existing ? existing.quantity : 0
        const desiredQty = currentQty + quantity

        if (desiredQty > prod.stock) {
          resultError = {
            code: 'OUT_OF_STOCK',
            message: `Only ${prod.stock} in stock. Added maximum available.`,
          }
        }

        const finalQty = Math.min(desiredQty, prod.stock)
        if (finalQty <= 0) return prev

        if (existing) {
          return prev.map((item) =>
            item.productId === productId ? { ...item, quantity: finalQty } : item
          )
        } else {
          return [...prev, { productId, quantity: finalQty }]
        }
      })

      if (resultError) {
        return { ok: false, error: resultError }
      }
      return { ok: true }
    },
    [products]
  )

  const updateQuantity = useCallback(
    (productId, quantity) => {
      if (quantity <= 0) {
        setItems((prev) => prev.filter((item) => item.productId !== productId))
        return { ok: true }
      }

      const prod = products.find((p) => p.id === productId)
      if (!prod) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } }
      }

      const clampedQty = Math.min(quantity, prod.stock)
      setItems((prev) =>
        prev.map((item) => (item.productId === productId ? { ...item, quantity: clampedQty } : item))
      )

      if (quantity > prod.stock) {
        return {
          ok: false,
          error: { code: 'OUT_OF_STOCK', message: `Only ${prod.stock} items currently in stock.` },
        }
      }
      return { ok: true }
    },
    [products]
  )

  const removeFromCart = useCallback((productId) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    writeJSON('cart', [])
  }, [])

  const value = useMemo(
    () => ({
      items,
      lines,
      itemCount,
      subtotal,
      isOpen,
      openCart,
      closeCart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [
      items,
      lines,
      itemCount,
      subtotal,
      isOpen,
      openCart,
      closeCart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (ctx === null) {
    throw new Error('useCart must be used inside <CartProvider>')
  }
  return ctx
}
