// API Client for the standalone backend.
// Matches the suggested REST surface in DATABASE_SCHEMA.md Section 12.
import { API_BASE_URL } from '../config.js'

function getAuthHeaders() {
  const token = localStorage.getItem('fc_api_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {}),
  }

  const response = await fetch(url, { ...options, headers })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return { ok: false, error: data.error || { code: 'HTTP_ERROR', message: `Request failed with status ${response.status}` } }
  }

  return data
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (name, email, password) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  getMe: () => request('/auth/me'),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/products${query ? `?${query}` : ''}`)
  },
  getProductById: (id) => request(`/products/${id}`),
  createProduct: (product) => request('/products', { method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (id, patch) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  resetProducts: () => request('/products/reset', { method: 'POST' }),

  // Orders
  getOrders: (status) => request(`/orders${status ? `?status=${status}` : ''}`),
  getOrderById: (id) => request(`/orders/${id}`),
  createOrder: (orderData) => request('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  createRazorpayOrder: (checkoutData) => request('/payments/razorpay/order', { method: 'POST', body: JSON.stringify(checkoutData) }),
  verifyRazorpayPayment: (paymentData) => request('/payments/razorpay/verify', { method: 'POST', body: JSON.stringify(paymentData) }),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
