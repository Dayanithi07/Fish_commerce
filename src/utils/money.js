// Cents-safe money helpers. Owner: A3 (Data and State).
// Never add or multiply prices with raw floating point (0.1 + 0.2 === 0.30000000000000004).
import { CURRENCY, LOCALE } from '../config.js'

const formatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
})

export const toCents = (amount) => Math.round(Number(amount) * 100)
export const fromCents = (cents) => cents / 100
export const roundMoney = (amount) => fromCents(toCents(amount))
export const lineTotal = (price, quantity) => fromCents(toCents(price) * quantity)
export const sumMoney = (amounts) => fromCents(amounts.reduce((sum, amount) => sum + toCents(amount), 0))
export const formatPrice = (amount) => formatter.format(roundMoney(amount))
