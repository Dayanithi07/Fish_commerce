import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { fishData } from '../../src/data/fishData.js'
import { mockOrders } from '../../src/data/mockOrders.js'
import { DEMO_ADMIN } from '../../src/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'dev_store.json')

class Database {
  constructor() {
    this.data = {
      users: [],
      products: [],
      orders: [],
      paymentIntents: [],
    }
    this.init()
  }

  init() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8')
        this.data = {
          users: [],
          products: [],
          orders: [],
          paymentIntents: [],
          ...JSON.parse(raw),
        }
      } else {
        this.seed()
      }
    } catch {
      this.seed()
    }
  }

  seed() {
    this.data.users = [
      {
        id: 'admin_root',
        name: DEMO_ADMIN.name,
        email: DEMO_ADMIN.email.toLowerCase(),
        password: DEMO_ADMIN.password,
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
    ]
    this.data.products = [...fishData]
    this.data.orders = [...mockOrders]
    this.save()
  }

  save() {
    const tempFile = `${DATA_FILE}.${process.pid}.tmp`
    try {
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf8')
      fs.renameSync(tempFile, DATA_FILE)
    } catch (err) {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile)
        } catch (cleanupError) {
          console.error('Failed to clean up temporary database file:', cleanupError)
        }
      }
      console.error('Failed to write database file:', err)
      throw err
    }
  }

  // --- Users ---
  findUserByEmail(email) {
    const normalized = (email || '').toLowerCase().trim()
    return this.data.users.find((u) => u.email.toLowerCase() === normalized)
  }

  findUserById(id) {
    return this.data.users.find((u) => u.id === id)
  }

  createUser(user) {
    this.data.users.push(user)
    this.save()
    return user
  }

  // --- Products ---
  getProducts(filters = {}) {
    let result = [...this.data.products]
    if (filters.waterType) {
      result = result.filter((p) => p.waterType.toLowerCase() === filters.waterType.toLowerCase())
    }
    if (filters.careLevel) {
      result = result.filter((p) => p.careLevel.toLowerCase() === filters.careLevel.toLowerCase())
    }
    if (filters.temperament) {
      result = result.filter((p) => p.temperament.toLowerCase() === filters.temperament.toLowerCase())
    }
    if (filters.isAvailable !== undefined) {
      result = result.filter((p) => p.isAvailable === (filters.isAvailable === 'true' || filters.isAvailable === true))
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }
    return result
  }

  getProductById(id) {
    return this.data.products.find((p) => p.id === id)
  }

  createProduct(product) {
    this.data.products.unshift(product)
    this.save()
    return product
  }

  updateProduct(id, patch) {
    const index = this.data.products.findIndex((p) => p.id === id)
    if (index === -1) return null
    const previous = this.data.products[index]
    this.data.products[index] = {
      ...this.data.products[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    try {
      this.save()
    } catch (error) {
      this.data.products[index] = previous
      throw error
    }
    return this.data.products[index]
  }

  deleteProduct(id) {
    const index = this.data.products.findIndex((p) => p.id === id)
    if (index === -1) return false
    this.data.products.splice(index, 1)
    this.save()
    return true
  }

  // --- Orders ---
  getOrders(status) {
    let result = [...this.data.orders]
    if (status) {
      result = result.filter((o) => o.status.toLowerCase() === status.toLowerCase())
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  getOrderById(id) {
    return this.data.orders.find((o) => o.id === id)
  }

  createOrder(order) {
    this.data.orders.unshift(order)
    try {
      this.save()
    } catch (error) {
      this.data.orders.shift()
      throw error
    }
    return order
  }

  createPaidOrder(order, paymentIntentId, paymentId) {
    const intent = (this.data.paymentIntents || []).find((item) => item.id === paymentIntentId)
    if (!intent || intent.status !== 'verifying') {
      throw new Error('Payment intent is not ready to be completed.')
    }

    const productUpdates = []
    for (const item of order.items) {
      const product = this.getProductById(item.productId)
      if (!product || !product.isAvailable || product.stock < item.quantity) {
        return {
          ok: false,
          error: {
            code: 'OUT_OF_STOCK',
            message: 'Payment succeeded, but stock changed. Contact the store with your payment reference.',
          },
        }
      }
      productUpdates.push({ product, stock: product.stock, quantity: item.quantity })
    }

    const previousIntent = { ...intent }
    for (const { product, quantity } of productUpdates) {
      product.stock -= quantity
      product.updatedAt = new Date().toISOString()
    }
    this.data.orders.unshift(order)
    Object.assign(intent, { status: 'paid', paymentId, order })

    try {
      this.save()
    } catch (error) {
      this.data.orders.shift()
      for (const { product, stock } of productUpdates) product.stock = stock
      Object.assign(intent, previousIntent)
      throw error
    }

    return { ok: true, order }
  }

  createPaymentIntent(intent) {
    this.data.paymentIntents ||= []
    this.data.paymentIntents.push(intent)
    try {
      this.save()
    } catch (error) {
      this.data.paymentIntents.pop()
      throw error
    }
    return intent
  }

  getPaymentIntentByGatewayOrderId(gatewayOrderId) {
    return (this.data.paymentIntents || []).find((intent) => intent.gatewayOrderId === gatewayOrderId)
  }

  updatePaymentIntent(id, patch) {
    const intent = (this.data.paymentIntents || []).find((item) => item.id === id)
    if (!intent) return null
    const previousIntent = { ...intent }
    Object.assign(intent, patch)
    try {
      this.save()
    } catch (error) {
      Object.assign(intent, previousIntent)
      throw error
    }
    return intent
  }

  updateOrderStatus(id, newStatus) {
    const order = this.data.orders.find((o) => o.id === id)
    if (!order) return null
    const now = new Date().toISOString()
    order.status = newStatus
    order.timeline.push({ status: newStatus, at: now })
    order.updatedAt = now
    this.save()
    return order
  }
}

export const db = new Database()
