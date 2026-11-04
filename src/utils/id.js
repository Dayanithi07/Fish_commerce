// ID helpers. Owner: A3 (Data and State).
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O, 1/I

/** UUID when available (secure contexts), otherwise a time + random fallback. */
export function newId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `id_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/** Display reference such as FC-20261104-A7K3 (BR-08). Caller must check uniqueness. */
export function newOrderReference(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  let suffix = ''
  for (let i = 0; i < 4; i += 1) {
    suffix += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)]
  }
  return `FC-${ymd}-${suffix}`
}
