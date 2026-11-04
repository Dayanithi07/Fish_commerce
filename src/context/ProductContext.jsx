// Product context and inventory management. Owner: A3 (Data and State).
// Implements contract in SYSTEM_ARCHITECTURE.md section 6.3.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { readJSON, writeJSON, subscribe } from '../utils/storage.js'
import { fishData } from '../data/fishData.js'
import { validateProduct } from '../utils/validators.js'

const ProductContext = createContext(null)

export function ProductProvider({ children }) {
  const [products, setProducts] = useState(() => {
    const stored = readJSON('products', null)
    if (Array.isArray(stored) && stored.length > 0) {
      return stored
    }
    // Seed on first launch
    writeJSON('products', fishData)
    return fishData
  })

  // Sync to localStorage
  useEffect(() => {
    writeJSON('products', products)
  }, [products])

  // Sync when another tab modifies products
  useEffect(() => {
    const unsubscribe = subscribe('products', (newProducts) => {
      if (Array.isArray(newProducts)) {
        setProducts(newProducts)
      }
    })
    return unsubscribe
  }, [])

  const availableProducts = useMemo(() => {
    return products.filter((p) => p.isAvailable)
  }, [products])

  const getProductById = useCallback(
    (id) => {
      return products.find((p) => p.id === id)
    },
    [products]
  )

  const addProduct = useCallback(
    (input) => {
      const validation = validateProduct(input, products)
      if (!validation.valid) {
        return {
          ok: false,
          error: { code: 'VALIDATION', message: 'Product validation failed', details: validation.errors },
        }
      }

      const slug = (input.name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const id = slug || `prod_${Date.now()}`

      const now = new Date().toISOString()
      const newProduct = {
        id,
        name: input.name.trim(),
        price: Number(input.price),
        image: input.image.trim(),
        waterType: input.waterType || 'Freshwater',
        careLevel: input.careLevel || 'Beginner',
        temperament: input.temperament || 'Peaceful',
        minTankSize: Number(input.minTankSize),
        diet: input.diet || 'Flakes',
        description: input.description.trim(),
        stock: Number(input.stock),
        isAvailable: input.isAvailable !== undefined ? input.isAvailable : true,
        badges: Array.isArray(input.badges) ? input.badges : [],
        createdAt: now,
        updatedAt: now,
      }

      setProducts((prev) => {
        const next = [newProduct, ...prev]
        writeJSON('products', next)
        return next
      })

      return { ok: true, product: newProduct }
    },
    [products]
  )

  const updateProduct = useCallback(
    (id, patch) => {
      const existing = products.find((p) => p.id === id)
      if (!existing) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }
      }

      const merged = { ...existing, ...patch, id }
      const validation = validateProduct(merged, products)
      if (!validation.valid) {
        return {
          ok: false,
          error: { code: 'VALIDATION', message: 'Product validation failed', details: validation.errors },
        }
      }

      const updated = {
        ...merged,
        price: Number(merged.price),
        stock: Number(merged.stock),
        minTankSize: Number(merged.minTankSize),
        updatedAt: new Date().toISOString(),
      }

      setProducts((prev) => {
        const next = prev.map((p) => (p.id === id ? updated : p))
        writeJSON('products', next)
        return next
      })

      return { ok: true, product: updated }
    },
    [products]
  )

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id)
      writeJSON('products', next)
      return next
    })
    return { ok: true }
  }, [])

  const toggleAvailability = useCallback((id) => {
    let target = null
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id === id) {
          target = { ...p, isAvailable: !p.isAvailable, updatedAt: new Date().toISOString() }
          return target
        }
        return p
      })
      writeJSON('products', next)
      return next
    })

    if (!target) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }
    }
    return { ok: true, product: target }
  }, [])

  const resetToSeed = useCallback(() => {
    setProducts(fishData)
    writeJSON('products', fishData)
  }, [])

  /**
   * Internal helper for OrderContext to atomically verify and decrement stock.
   * deltas: array of { productId, quantity }
   */
  const applyStockDeltas = useCallback(
    (deltas) => {
      // Re-read current storage to ensure atomic verification
      const currentProducts = readJSON('products', products)

      // 1. Verify all stock is sufficient
      for (const item of deltas) {
        const prod = currentProducts.find((p) => p.id === item.productId)
        if (!prod) {
          return {
            ok: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${item.productId} not found.` },
          }
        }
        if (prod.stock < item.quantity) {
          return {
            ok: false,
            error: {
              code: 'OUT_OF_STOCK',
              message: `Not enough stock for ${prod.name} (available: ${prod.stock}, requested: ${item.quantity}).`,
            },
          }
        }
      }

      // 2. Decrement stock
      const updatedProducts = currentProducts.map((p) => {
        const delta = deltas.find((d) => d.productId === p.id)
        if (!delta) return p
        return {
          ...p,
          stock: p.stock - delta.quantity,
          updatedAt: new Date().toISOString(),
        }
      })

      setProducts(updatedProducts)
      writeJSON('products', updatedProducts)
      return { ok: true }
    },
    [products]
  )

  const value = useMemo(
    () => ({
      products,
      availableProducts,
      getProductById,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleAvailability,
      resetToSeed,
      applyStockDeltas,
    }),
    [
      products,
      availableProducts,
      getProductById,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleAvailability,
      resetToSeed,
      applyStockDeltas,
    ]
  )

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}

export function useProducts() {
  const ctx = useContext(ProductContext)
  if (ctx === null) {
    throw new Error('useProducts must be used inside <ProductProvider>')
  }
  return ctx
}
