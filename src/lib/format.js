// Number / value formatting helpers. All monospace-rendered in the UI.

export function formatUsd(value, { compact = true } = {}) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  if (compact) return '$' + compactNumber(n)
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function formatPrice(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  if (n === 0) return '$0'
  if (n >= 1) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 0.01) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 8 })
}

export function compactNumber(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  const abs = Math.abs(n)
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function formatPct(value, { sign = false, digits = 1 } = {}) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  const s = sign && n > 0 ? '+' : ''
  return `${s}${n.toFixed(digits)}%`
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(String(value).replace(/[, ]/g, ''))
  return Number.isNaN(n) ? null : n
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const ms = d.getTime() - Date.now()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}
