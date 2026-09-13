// DefiLlama public API (no key required). Best-effort match by symbol/name.
// Anything that fails is simply omitted — the fields fall back to manual entry.

const BASE = 'https://api.llama.fi'

async function getJson(url, { timeout = 15000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`DefiLlama ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

let protocolsCache = null

async function getProtocols() {
  if (protocolsCache) return protocolsCache
  const list = await getJson(`${BASE}/protocols`)
  protocolsCache = Array.isArray(list) ? list : []
  return protocolsCache
}

// Try to match a token to a DefiLlama protocol by symbol, then by name.
function matchProtocol(protocols, { symbol, name }) {
  const sym = (symbol || '').toUpperCase()
  const nm = (name || '').toLowerCase().trim()

  if (sym) {
    const bySym = protocols.filter((p) => (p.symbol || '').toUpperCase() === sym)
    if (bySym.length === 1) return bySym[0]
    if (bySym.length > 1) {
      // Prefer highest TVL among symbol matches.
      return bySym.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))[0]
    }
  }
  if (nm) {
    const exact = protocols.find((p) => (p.name || '').toLowerCase() === nm)
    if (exact) return exact
    const slugMatch = protocols.find((p) => (p.slug || '').toLowerCase() === nm.replace(/\s+/g, '-'))
    if (slugMatch) return slugMatch
  }
  return null
}

// Returns { ok, matched, slug, name, tvl, fees24h, revenue24h } — any monetary
// field may be null when DefiLlama has no data for it.
export async function fetchProtocol({ symbol, name }) {
  try {
    const protocols = await getProtocols()
    const match = matchProtocol(protocols, { symbol, name })
    if (!match) return { ok: true, matched: false }

    const slug = match.slug || slugify(match.name)
    const result = {
      ok: true,
      matched: true,
      slug,
      name: match.name,
      tvl: typeof match.tvl === 'number' ? match.tvl : null,
      fees24h: null,
      revenue24h: null,
    }

    // Fees / revenue are on a separate endpoint and often missing — try softly.
    try {
      const fees = await getJson(`${BASE}/summary/fees/${encodeURIComponent(slug)}?dataType=dailyFees`)
      if (typeof fees?.total24h === 'number') result.fees24h = fees.total24h
    } catch { /* no fee data — leave null */ }
    try {
      const rev = await getJson(`${BASE}/summary/fees/${encodeURIComponent(slug)}?dataType=dailyRevenue`)
      if (typeof rev?.total24h === 'number') result.revenue24h = rev.total24h
    } catch { /* no revenue data — leave null */ }

    return result
  } catch (e) {
    console.warn('DefiLlama fetchProtocol failed', e)
    return { ok: false, matched: false, error: String(e.message || e) }
  }
}

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
