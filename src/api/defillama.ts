// DefiLlama public API (no key). Best-effort match by symbol/name; anything
// that fails is simply omitted and the fields fall back to manual entry.

const BASE = 'https://api.llama.fi'

export interface ProtocolResult {
  ok: boolean
  matched: boolean
  slug?: string
  name?: string
  tvl?: number | null
  fees24h?: number | null
  revenue24h?: number | null
  error?: string
}

interface ProtocolListEntry {
  name: string
  symbol?: string
  slug?: string
  tvl?: number
}

async function getJson<T>(url: string, timeout = 15000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`DefiLlama ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

let protocolsCache: ProtocolListEntry[] | null = null

async function getProtocols(): Promise<ProtocolListEntry[]> {
  if (protocolsCache) return protocolsCache
  const list = await getJson<ProtocolListEntry[]>(`${BASE}/protocols`)
  protocolsCache = Array.isArray(list) ? list : []
  return protocolsCache
}

function matchProtocol(
  protocols: ProtocolListEntry[],
  { symbol, name }: { symbol: string; name: string },
): ProtocolListEntry | null {
  const sym = (symbol || '').toUpperCase()
  const nm = (name || '').toLowerCase().trim()

  if (sym) {
    const bySym = protocols.filter((p) => (p.symbol || '').toUpperCase() === sym)
    if (bySym.length === 1) return bySym[0]
    if (bySym.length > 1) return bySym.sort((a, b) => (b.tvl || 0) - (a.tvl || 0))[0]
  }
  if (nm) {
    const exact = protocols.find((p) => (p.name || '').toLowerCase() === nm)
    if (exact) return exact
    const slugMatch = protocols.find((p) => (p.slug || '').toLowerCase() === nm.replace(/\s+/g, '-'))
    if (slugMatch) return slugMatch
  }
  return null
}

/** Match a token to a DefiLlama protocol and pull TVL / fees / revenue. */
export async function fetchProtocol({
  symbol,
  name,
}: {
  symbol: string
  name: string
}): Promise<ProtocolResult> {
  try {
    const protocols = await getProtocols()
    const match = matchProtocol(protocols, { symbol, name })
    if (!match) return { ok: true, matched: false }

    const slug = match.slug || slugify(match.name)
    const result: ProtocolResult = {
      ok: true,
      matched: true,
      slug,
      name: match.name,
      tvl: typeof match.tvl === 'number' ? match.tvl : null,
      fees24h: null,
      revenue24h: null,
    }

    // Fees / revenue live on a separate endpoint and are often missing.
    try {
      const fees = await getJson<{ total24h?: number }>(
        `${BASE}/summary/fees/${encodeURIComponent(slug)}?dataType=dailyFees`,
      )
      if (typeof fees.total24h === 'number') result.fees24h = fees.total24h
    } catch {
      /* no fee data */
    }
    try {
      const rev = await getJson<{ total24h?: number }>(
        `${BASE}/summary/fees/${encodeURIComponent(slug)}?dataType=dailyRevenue`,
      )
      if (typeof rev.total24h === 'number') result.revenue24h = rev.total24h
    } catch {
      /* no revenue data */
    }

    return result
  } catch (e: any) {
    console.warn('DefiLlama fetchProtocol failed', e)
    return { ok: false, matched: false, error: String(e?.message || e) }
  }
}

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
