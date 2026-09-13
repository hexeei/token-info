// CoinGecko public API (no key required). Free tier is rate-limited, so every
// call fails soft: on error we return null and the UI leaves fields for manual
// entry instead of crashing.

const BASE = 'https://api.coingecko.com/api/v3'

async function getJson(url, { timeout = 12000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!res.ok) {
      // 429 = rate limited; treat like any other soft failure.
      throw new Error(`CoinGecko ${res.status}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// Resolve a free-text query (ticker or name) into a list of coin candidates.
export async function searchCoins(query) {
  const q = query.trim()
  if (!q) return []
  try {
    const data = await getJson(`${BASE}/search?query=${encodeURIComponent(q)}`)
    const coins = Array.isArray(data?.coins) ? data.coins : []
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

// Full coin profile → the fields we auto-fill.
export async function fetchCoin(id) {
  try {
    const url =
      `${BASE}/coins/${encodeURIComponent(id)}` +
      `?localization=false&tickers=false&market_data=true` +
      `&community_data=false&developer_data=false&sparkline=false`
    const c = await getJson(url)
    const md = c?.market_data || {}
    const links = c?.links || {}

    // Primary chain / contract: prefer the first platform entry.
    const platforms = c?.platforms || {}
    const platformKeys = Object.keys(platforms).filter((k) => k && platforms[k])
    const chain = c?.asset_platform_id || platformKeys[0] || ''
    const contract = platforms[chain] || platforms[platformKeys[0]] || ''

    return {
      ok: true,
      id: c.id,
      name: c.name,
      symbol: (c.symbol || '').toUpperCase(),
      logo: c?.image?.large || c?.image?.small || c?.image?.thumb || '',
      chain: prettifyChain(chain),
      contract: contract || '',
      website: (links.homepage || []).find(Boolean) || '',
      docs:
        (links.whitepaper && String(links.whitepaper)) ||
        (links.official_forum_url || []).find(Boolean) ||
        '',
      twitter: links.twitter_screen_name ? `https://x.com/${links.twitter_screen_name}` : '',
      categories: (c.categories || []).filter(Boolean),

      price: pick(md.current_price),
      marketCap: pick(md.market_cap),
      fdv: pick(md.fully_diluted_valuation),
      volume24h: pick(md.total_volume),
      circulatingSupply: md.circulating_supply ?? null,
      totalSupply: md.total_supply ?? null,
      maxSupply: md.max_supply ?? null,
      ath: pick(md.ath),
      athChangePct: pick(md.ath_change_percentage),
      priceChange7d: md.price_change_percentage_7d ?? null,
      priceChange30d: md.price_change_percentage_30d ?? null,
    }
  } catch (e) {
    console.warn('CoinGecko fetchCoin failed', e)
    return { ok: false, error: String(e.message || e) }
  }
}

function pick(obj) {
  // market_data values are keyed by currency; we want USD.
  if (obj == null) return null
  if (typeof obj === 'number') return obj
  if (typeof obj === 'object') return obj.usd ?? null
  return null
}

function prettifyChain(chain) {
  if (!chain) return ''
  const map = {
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
