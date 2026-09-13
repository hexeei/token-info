// CoinGecko public API (no key). Free tier is rate-limited, so every call
// fails soft: on error we return a typed "not ok" result and the UI leaves
// fields empty for manual entry instead of crashing.

const BASE = 'https://api.coingecko.com/api/v3'

export interface CoinSearchHit {
  id: string
  name: string
  symbol: string
  rank: number | null
  thumb: string
}

export interface CoinData {
  ok: true
  id: string
  name: string
  symbol: string
  logo: string
  chain: string
  contract: string
  website: string
  docs: string
  twitter: string
  categories: string[]
  price: number | null
  marketCap: number | null
  fdv: number | null
  volume24h: number | null
  circulatingSupply: number | null
  totalSupply: number | null
  maxSupply: number | null
  ath: number | null
  athChangePct: number | null
  priceChange7d: number | null
  priceChange30d: number | null
}
export interface CoinError {
  ok: false
  error: string
}
export type CoinResult = CoinData | CoinError

export interface CompMarketData {
  ok: boolean
  id?: string
  name?: string
  symbol?: string
  marketCap?: number | null
  fdv?: number | null
}

async function getJson<T>(url: string, timeout = 12000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`) // 429 = rate limited
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/** Resolve a free-text query (ticker or name) into coin candidates. */
export async function searchCoins(query: string): Promise<CoinSearchHit[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const data = await getJson<{ coins?: any[] }>(`${BASE}/search?query=${encodeURIComponent(q)}`)
    const coins = Array.isArray(data.coins) ? data.coins : []
    return coins.slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      symbol: (c.symbol || '').toUpperCase(),
      rank: c.market_cap_rank ?? null,
      thumb: c.thumb || c.large || '',
    }))
  } catch (e) {
    console.warn('CoinGecko search failed', e)
    return []
  }
}

/** Full coin profile → the fields we auto-fill. */
export async function fetchCoin(id: string): Promise<CoinResult> {
  try {
    const url =
      `${BASE}/coins/${encodeURIComponent(id)}` +
      `?localization=false&tickers=false&market_data=true` +
      `&community_data=false&developer_data=false&sparkline=false`
    const c = await getJson<any>(url)
    const md = c.market_data || {}
    const links = c.links || {}
    const platforms: Record<string, string> = c.platforms || {}
    const platformKeys = Object.keys(platforms).filter((k) => k && platforms[k])
    const chain = c.asset_platform_id || platformKeys[0] || ''
    const contract = platforms[chain] || (platformKeys[0] ? platforms[platformKeys[0]] : '') || ''

    return {
      ok: true,
      id: c.id,
      name: c.name,
      symbol: (c.symbol || '').toUpperCase(),
      logo: c.image?.large || c.image?.small || c.image?.thumb || '',
      chain: prettifyChain(chain),
      contract,
      website: (links.homepage || []).find(Boolean) || '',
      docs:
        (links.whitepaper && String(links.whitepaper)) ||
        (links.official_forum_url || []).find(Boolean) ||
        '',
      twitter: links.twitter_screen_name ? `https://x.com/${links.twitter_screen_name}` : '',
      categories: (c.categories || []).filter(Boolean),
      price: usd(md.current_price),
      marketCap: usd(md.market_cap),
      fdv: usd(md.fully_diluted_valuation),
      volume24h: usd(md.total_volume),
      circulatingSupply: md.circulating_supply ?? null,
      totalSupply: md.total_supply ?? null,
      maxSupply: md.max_supply ?? null,
      ath: usd(md.ath),
      athChangePct: usd(md.ath_change_percentage),
      priceChange7d: md.price_change_percentage_7d ?? null,
      priceChange30d: md.price_change_percentage_30d ?? null,
    }
  } catch (e: any) {
    console.warn('CoinGecko fetchCoin failed', e)
    return { ok: false, error: String(e?.message || e) }
  }
}

/**
 * Look up a competitor's market cap / FDV by ticker (for the upside comps).
 * Uses /search to resolve the id, then /coins/markets for the numbers.
 */
export async function fetchCompByTicker(ticker: string): Promise<CompMarketData> {
  const t = ticker.trim()
  if (!t) return { ok: false }
  try {
    const hits = await searchCoins(t)
    // Prefer an exact symbol match, else the top-ranked hit.
    const exact = hits.find((h) => h.symbol.toUpperCase() === t.toUpperCase())
    const hit = exact || hits[0]
    if (!hit) return { ok: false }
    const markets = await getJson<any[]>(
      `${BASE}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(hit.id)}&per_page=1`,
    )
    const m = Array.isArray(markets) ? markets[0] : null
    if (!m) return { ok: false }
    return {
      ok: true,
      id: m.id,
      name: m.name,
      symbol: (m.symbol || '').toUpperCase(),
      marketCap: m.market_cap ?? null,
      fdv: m.fully_diluted_valuation ?? null,
    }
  } catch (e) {
    console.warn('CoinGecko fetchCompByTicker failed', e)
    return { ok: false }
  }
}

// market_data values are keyed by currency; we want USD.
function usd(obj: unknown): number | null {
  if (obj == null) return null
  if (typeof obj === 'number') return obj
  if (typeof obj === 'object') return (obj as Record<string, number>).usd ?? null
  return null
}

function prettifyChain(chain: string): string {
  if (!chain) return ''
  const map: Record<string, string> = {
    ethereum: 'Ethereum',
    'binance-smart-chain': 'BNB Chain',
    'polygon-pos': 'Polygon',
    'arbitrum-one': 'Arbitrum',
    'optimistic-ethereum': 'Optimism',
    solana: 'Solana',
    avalanche: 'Avalanche',
    base: 'Base',
    'sui-network': 'Sui',
    aptos: 'Aptos',
  }
  return map[chain] || chain.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}
