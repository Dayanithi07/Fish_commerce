/**
 * useStoreSettings — Fetches store configuration from Supabase store_settings table.
 * Falls back to localStorage cache, then hardcoded defaults if Supabase is unreachable.
 *
 * Usage:
 *   const { settings, saveSettings, loading } = useStoreSettings()
 *   settings.support_email  // "ganesh@example.com"
 *   settings.support_phone  // "+91 98765 43210"
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

const CACHE_KEY = 'vp_store_settings'

export const DEFAULT_SETTINGS = {
  store_name:      'VP Aquarium',
  support_email:   import.meta.env.VITE_ADMIN_EMAIL || 'starboy1s2s3s3@gmail.com',
  support_phone:   '+91 00000 00000',
  support_hours:   'Mon – Sat: 9:00 AM – 6:00 PM IST',
  upi_id:          'ganesh123madesh@okaxis',
  store_address:   'Chennai, Tamil Nadu, India',
  whatsapp_number: '910000000000',
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveCache(settings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings))
  } catch {}
}

export function useStoreSettings() {
  const [settings, setSettings] = useState(loadCache)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch from Supabase on mount
  const fetchSettings = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('key, value')

      if (error) {
        console.warn('[useStoreSettings] fetch error:', error.message)
        return
      }

      if (data && data.length > 0) {
        const merged = { ...DEFAULT_SETTINGS }
        data.forEach(({ key, value }) => { merged[key] = value })
        setSettings(merged)
        saveCache(merged)
      }
    } catch (err) {
      console.warn('[useStoreSettings] exception:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  /**
   * Save a partial or full settings object to Supabase.
   * Accepts an object like { support_phone: '+91 ...', support_hours: '...' }
   */
  const saveSettings = useCallback(async (updates) => {
    // Optimistic local update
    const merged = { ...settings, ...updates }
    setSettings(merged)
    saveCache(merged)

    if (!isSupabaseConfigured) return { ok: true, offline: true }

    setSaving(true)
    try {
      const rows = Object.entries(updates).map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('store_settings')
        .upsert(rows, { onConflict: 'key' })

      if (error) {
        console.warn('[useStoreSettings] save error:', error.message)
        return { ok: false, error: error.message }
      }

      return { ok: true }
    } catch (err) {
      console.warn('[useStoreSettings] save exception:', err)
      return { ok: false, error: err.message }
    } finally {
      setSaving(false)
    }
  }, [settings])

  return { settings, saveSettings, loading, saving, refetch: fetchSettings }
}
