// Number / value formatting. All values render in a monospace face in the UI.

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(String(value).replace(/[, ]/g, ''))
  return Number.isNaN(n) ? null : n
}

export function compactNumber(value: unknown): string {
  const n = toNumber(value)
  if (n === null) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function formatUsd(value: unknown, opts: { compact?: boolean } = {}): string {
  const { compact = true } = opts
  const n = toNumber(value)
  if (n === null) return '—'
  if (compact) return '$' + compactNumber(n)
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function formatPrice(value: unknown): string {
  const n = toNumber(value)
  if (n === null) return '—'
  if (n === 0) return '$0'
  if (n >= 1) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 0.01) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 8 })
}

export function formatPct(value: unknown, opts: { sign?: boolean; digits?: number } = {}): string {
  const { sign = false, digits = 1 } = opts
  const n = toNumber(value)
  if (n === null) return '—'
  const s = sign && n > 0 ? '+' : ''
  return `${s}${n.toFixed(digits)}%`
}

export function formatX(value: unknown, digits = 1): string {
  const n = toNumber(value)
  if (n === null) return '—'
  return `${n.toFixed(digits)}×`
}

export function formatDate(dateStr: unknown): string {
  if (!dateStr) return '—'
  const d = new Date(String(dateStr))
  if (Number.isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD
}

export function daysUntil(dateStr: unknown): number | null {
  if (!dateStr) return null
  const d = new Date(String(dateStr))
  if (Number.isNaN(d.getTime())) return null
  return Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
