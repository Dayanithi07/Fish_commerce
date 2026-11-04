// Safe localStorage access. Owner: A3 (Data and State).
// Contexts and pages must use this module instead of touching localStorage directly.
import { STORAGE_PREFIX, SCHEMA_VERSION } from '../config.js'

const prefixed = (key) => `${STORAGE_PREFIX}${key}`

/**
 * Migrations keyed by the schema version they migrate TO.
 * Each function rewrites stored keys with readJSON / writeJSON.
 */
export const migrations = {}

export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(prefixed(key))
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** Returns true on success, false if storage is unavailable or full. */
export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(prefixed(key), JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`Storage error writing key "${prefixed(key)}":`, err)
    return false
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(prefixed(key))
  } catch {
    /* storage unavailable: nothing to remove */
  }
}

/**
 * Calls callback(newValue) when ANOTHER tab changes this key.
 * Returns an unsubscribe function.
 */
export function subscribe(key, callback) {
  const handler = (event) => {
    if (event.key === prefixed(key) || event.key === null) {
      callback(readJSON(key, null))
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

/** Writes fc_meta on first run and runs migrations when the stored schema is older. */
export function initStorage() {
  const meta = readJSON('meta', null)

  if (meta === null || typeof meta !== 'object') {
    writeJSON('meta', {
      schemaVersion: SCHEMA_VERSION,
      seededAt: new Date().toISOString(),
    })
    return { firstRun: true, newerThanApp: false }
  }

  if (meta.schemaVersion > SCHEMA_VERSION) {
    return { firstRun: false, newerThanApp: true }
  }

  if (meta.schemaVersion < SCHEMA_VERSION) {
    for (let version = meta.schemaVersion + 1; version <= SCHEMA_VERSION; version += 1) {
      if (typeof migrations[version] === 'function') {
        migrations[version]()
      }
    }
    writeJSON('meta', { ...meta, schemaVersion: SCHEMA_VERSION })
  }

  return { firstRun: false, newerThanApp: false }
}
