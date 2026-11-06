// Form and entity validation. Owner: A3 (Data and State).
// Rules from PROJECT_REQUIREMENTS.md section 6.
// Each validator returns { valid: boolean, errors: Record<string, string> }.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateSignup({ name, email, password }) {
  const errors = {}

  const trimmedName = (name || '').trim()
  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 60) {
    errors.name = 'Please enter your full name (2–60 characters).'
  }

  const trimmedEmail = (email || '').trim().toLowerCase()
  if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.length > 120) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password || password.length < 8) {
    errors.password = 'Use at least 8 characters.'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateLogin({ email, password }) {
  const errors = {}

  const trimmedEmail = (email || '').trim().toLowerCase()
  if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateCheckout({ customerName, customerEmail, customerPhone, street, city, postalCode, notes }) {
  const errors = {}

  const name = (customerName || '').trim()
  if (!name || name.length < 2 || name.length > 60) {
    errors.customerName = 'Please enter your full name.'
  }

  const email = (customerEmail || '').trim().toLowerCase()
  if (!email || !EMAIL_REGEX.test(email) || email.length > 120) {
    errors.customerEmail = 'Enter a valid email address.'
  }

  const digits = (customerPhone || '').replace(/[\s\-()+]/g, '')
  if (!digits || digits.length < 7 || digits.length > 15) {
    errors.customerPhone = 'Enter a valid phone number.'
  }

  const st = (street || '').trim()
  if (!st || st.length < 5 || st.length > 120) {
    errors.street = 'Enter your street address.'
  }

  const c = (city || '').trim()
  if (!c || c.length < 2 || c.length > 60) {
    errors.city = 'Enter your city.'
  }

  const pc = (postalCode || '').trim()
  if (!pc || pc.length < 3 || pc.length > 10) {
    errors.postalCode = 'Enter a valid postal code.'
  }

  if (notes && notes.length > 500) {
    errors.notes = 'Notes must be 500 characters or fewer.'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateProduct(product, existingProducts = []) {
  const errors = {}

  const name = (product.name || '').trim()
  if (!name || name.length < 2 || name.length > 60) {
    errors.name = 'Please enter a valid product name (2–60 characters).'
  } else {
    const isDuplicate = existingProducts.some(
      (p) => p.id !== product.id && p.name.trim().toLowerCase() === name.toLowerCase()
    )
    if (isDuplicate) {
      errors.name = 'Product name already exists.'
    }
  }

  const price = Number(product.price)
  if (isNaN(price) || price <= 0 || price > 99999) {
    errors.price = 'Enter a valid price between ₹1 and ₹99,999.'
  }

  const stock = Number(product.stock)
  if (!Number.isInteger(stock) || stock < 0 || stock > 9999) {
    errors.stock = 'Stock must be a whole number between 0 and 9,999.'
  }

  if (product.productType !== 'food') {
    const tank = Number(product.minTankSize)
    if (!Number.isInteger(tank) || tank < 1 || tank > 1000) {
      errors.minTankSize = 'Enter tank size in gallons (1–1,000).'
    }
  }

  const img = (product.image || '').trim()
  if (!img || (!img.startsWith('/') && !img.startsWith('http://') && !img.startsWith('https://') && !img.startsWith('data:image/'))) {
    errors.image = 'Provide a valid image file or URL.'
  }

  const desc = (product.description || '').trim()
  if (!desc || desc.length < 10 || desc.length > 600) {
    errors.description = 'Add a short description (10–600 characters).'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
