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
    }
    this.init()
  }

  init() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8')
        this.data = JSON.parse(raw)
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
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf8')
    } catch (err) {
      console.error('Failed to write database file:', err)
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
    this.data.products[index] = {
      ...this.data.products[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    this.save()
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
    this.save()
    return order
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
