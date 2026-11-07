// Product context and inventory management with Supabase Realtime synchronization.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { readJSON, writeJSON, subscribe } from '../utils/storage.js'
import { fishData } from '../data/fishData.js'
import { validateProduct } from '../utils/validators.js'

const ProductContext = createContext(null)

// Helper: Map Supabase database row to frontend model
function mapFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    productType: row.product_type || 'fish',
    price: Number((row.price_cents / 100).toFixed(2)),
    image: row.image_url,
    waterType: row.water_type,
    careLevel: row.care_level,
    temperament: row.temperament,
    minTankSize: row.min_tank_gal,
    diet: row.diet,
    description: row.description,
    stock: row.stock,
    isAvailable: row.is_available,
    badges: Array.isArray(row.badges) ? row.badges : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Helper: Map frontend model to Supabase row
function mapToDb(item) {
  return {
    id: item.id,
    name: item.name,
    product_type: item.productType || 'fish',
    price_cents: Math.round(Number(item.price) * 100),
    image_url: item.image,
    water_type: item.waterType || null,
    care_level: item.careLevel || null,
    temperament: item.temperament || null,
    min_tank_gal: item.minTankSize == null ? null : Number(item.minTankSize),
    diet: item.diet,
    description: item.description,
    stock: Number(item.stock),
    is_available: item.isAvailable,
    badges: item.badges || [],
    updated_at: new Date().toISOString(),
  }
}

export function ProductProvider({ children }) {
  const [products, setProducts] = useState(() => {
    const stored = readJSON('products', null)
    if (Array.isArray(stored)) {
      return stored
    }
    return fishData
  })
  const [loading, setLoading] = useState(true)

  // Fetch from Supabase
  const fetchSupabaseProducts = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.warn('[ProductContext] Supabase fetch note (using local catalog):', error.message || error)
        return
      }
      if (Array.isArray(data)) {
        const mapped = data.map(mapFromDb)
        setProducts(mapped)
        writeJSON('products', mapped)
      }
    } catch (err) {
      console.warn('[ProductContext] Error fetching products from Supabase:', err.message || err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load & Realtime channel subscription
  useEffect(() => {
    let channel = null

    if (isSupabaseConfigured) {
      fetchSupabaseProducts()

      // Subscribe to Realtime updates on products table
      channel = supabase
        .channel('products-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          () => {
            fetchSupabaseProducts()
          }
        )
        .subscribe()
    } else {
      setLoading(false)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchSupabaseProducts])

  // Cross-tab sync for localStorage fallback
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
    (id) => products.find((p) => p.id === id),
    [products]
  )

  const addProduct = useCallback(
    async (input) => {
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

      const isFood = input.productType === 'food'
      const newProduct = {
        id,
        name: input.name.trim(),
        productType: input.productType || 'fish',
        price: Number(input.price),
        image: input.image.trim(),
        waterType: isFood ? null : (input.waterType || 'Freshwater'),
        careLevel: isFood ? null : (input.careLevel || 'Beginner'),
        temperament: isFood ? null : (input.temperament || 'Peaceful'),
        minTankSize: isFood ? null : Number(input.minTankSize || 10),
        diet: input.diet || (isFood ? 'Flakes' : 'Flakes'),
        description: input.description.trim(),
        stock: Number(input.stock),
        isAvailable: input.isAvailable !== undefined ? input.isAvailable : true,
        badges: Array.isArray(input.badges) ? input.badges : [],
        createdAt: now,
        updatedAt: now,
      }

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('products').insert([mapToDb(newProduct)])
          if (error) {
            console.warn('[ProductContext] Supabase insert note (saved locally):', error.message)
          }
        } catch (dbErr) {
          console.warn('[ProductContext] Supabase write exception:', dbErr)
        }
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
    async (id, patch) => {
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

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('products')
            .update(mapToDb(updated))
            .eq('id', id)
          if (error) {
            console.warn('[ProductContext] Supabase update note (saved locally):', error.message)
          }
        } catch (dbErr) {
          console.warn('[ProductContext] Supabase update exception:', dbErr)
        }
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

  const deleteProduct = useCallback(
    async (id) => {
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('products').delete().eq('id', id)
          if (error) {
            console.warn('[ProductContext] Supabase delete note (removed locally):', error.message)
          }
        } catch (dbErr) {
          console.warn('[ProductContext] Supabase delete exception:', dbErr)
        }
      }

      setProducts((prev) => {
        const next = prev.filter((p) => p.id !== id)
        writeJSON('products', next)
        return next
      })
      return { ok: true }
    },
    []
  )

  const toggleAvailability = useCallback(
    async (id) => {
      const target = products.find((p) => p.id === id)
      if (!target) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }
      }

      const newStatus = !target.isAvailable

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('products')
            .update({ is_available: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id)
          if (error) {
            console.warn('[ProductContext] Supabase toggle note (updated locally):', error.message)
          }
        } catch (dbErr) {
          console.warn('[ProductContext] Supabase toggle exception:', dbErr)
        }
      }

      let updated = null
      setProducts((prev) => {
        const next = prev.map((p) => {
          if (p.id === id) {
            updated = { ...p, isAvailable: newStatus, updatedAt: new Date().toISOString() }
            return updated
          }
          return p
        })
        writeJSON('products', next)
        return next
      })

      return { ok: true, product: updated }
    },
    [products]
  )

  const applyStockDeltas = useCallback(
    (deltas) => {
      const currentProducts = readJSON('products', products)

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
      loading,
      availableProducts,
      getProductById,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleAvailability,
      applyStockDeltas,
      refreshProducts: fetchSupabaseProducts,
    }),
    [
      products,
      loading,
      availableProducts,
      getProductById,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleAvailability,
      applyStockDeltas,
      fetchSupabaseProducts,
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
