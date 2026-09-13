// Cloudflare Worker — token research backend for the Token Research Checklist.
// GET /api/token?q=<coingecko id | ticker | name>
// Gathers market data (CoinGecko) + fees/revenue (DefiLlama) server-side, then
// uses Claude with web search for the deep metrics (unlocks, buyback, value
// accrual, distribution) that no public API exposes, and returns a filled
// analysis JSON the static site imports. No CORS issues — this runs server-side.

export interface Env {
  ANTHROPIC_API_KEY: string
  MODEL?: string // default claude-opus-5; set claude-sonnet-5 / claude-haiku-4-5 to cut cost
  COINGECKO_KEY?: string // optional CoinGecko demo key (x-cg-demo-api-key)
  ALLOW_ORIGIN?: string // default * ; set to your Pages origin to lock down
}

const CG = 'https://api.coingecko.com/api/v3'
const LLAMA = 'https://api.llama.fi'

// Sector leaders auto-loaded as upside comps (MC pulled live).
const SECTOR_LEADERS: Record<string, string[]> = {
  DeFi: ['AAVE', 'UNI'], AI: ['TAO', 'RENDER'], RWA: ['ONDO', 'PENDLE'],
  DePIN: ['RENDER', 'HNT'], L1: ['SOL', 'AVAX'], L2: ['ARB', 'OP'],
  Gaming: ['IMX', 'BEAM'], Meme: ['DOGE', 'PEPE'], Infra: ['LINK', 'FIL'],
  'Perp DEX': ['HYPE', 'GMX'], Restaking: ['EIGEN', 'ETHFI'],
  'Liquid Staking': ['LDO', 'JTO'], SocialFi: ['MASK'], Oracle: ['LINK', 'PYTH'],
  Bridge: ['AXL', 'W'], Other: [],
}

const SECTOR_RULES: [RegExp, string][] = [
  [/liquid staking|lsd|lst/i, 'Liquid Staking'], [/restaking|eigen/i, 'Restaking'],
  [/perpetual|perp/i, 'Perp DEX'], [/oracle/i, 'Oracle'],
  [/bridge|interoperab|cross-chain/i, 'Bridge'], [/depin/i, 'DePIN'],
  [/real world asset|rwa|tokeniz/i, 'RWA'], [/artificial intelligence|\bai\b/i, 'AI'],
  [/socialfi|social/i, 'SocialFi'], [/gaming|game|metaverse|gamefi/i, 'Gaming'],
  [/meme/i, 'Meme'], [/layer 2|rollup|\bl2\b/i, 'L2'],
  [/layer 1|smart contract platform|\bl1\b/i, 'L1'],
  [/decentralized finance|defi|dex|lending|yield/i, 'DeFi'],
  [/infrastructure|infra|data availability/i, 'Infra'],
]

function guessSector(categories: string[]): string {
  for (const [re, s] of SECTOR_RULES) if (categories.some((c) => re.test(c))) return s
  return ''
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOW_ORIGIN || '*'
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET,OPTIONS',
      'access-control-allow-headers': 'content-type',
    }
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })

    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/token')) {
      return json({ error: 'Not found. Use /api/token?q=TICKER' }, 404, cors)
    }
    const q = (url.searchParams.get('q') || '').trim()
    if (!q) return json({ error: 'Missing ?q=' }, 400, cors)

    try {
      const analysis = await buildAnalysis(q, env)
      return json(analysis, 200, cors)
    } catch (e: any) {
      return json({ error: String(e?.message || e) }, 500, cors)
    }
  },
}

async function buildAnalysis(q: string, env: Env) {
  const cgHeaders: Record<string, string> = { accept: 'application/json' }
  if (env.COINGECKO_KEY) cgHeaders['x-cg-demo-api-key'] = env.COINGECKO_KEY

  // 1) Resolve id
  let id = q.toLowerCase()
  const looksLikeId = /^[a-z0-9-]+$/.test(id) && id.includes('-')
  if (!looksLikeId) {
    const s = await getJson<any>(`${CG}/search?query=${encodeURIComponent(q)}`, cgHeaders)
    id = s?.coins?.[0]?.id || id
  }

  // 2) CoinGecko coin data
  const c = await getJson<any>(
    `${CG}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
    cgHeaders,
  )
  const md = c.market_data || {}
  const links = c.links || {}
  const platforms: Record<string, string> = c.platforms || {}
  const chain = c.asset_platform_id || Object.keys(platforms)[0] || ''
  const categories: string[] = (c.categories || []).filter(Boolean)
  const sector = guessSector(categories)
  const symbol = (c.symbol || '').toUpperCase()
  const marketCap = md.market_cap?.usd ?? null

  // 3) DefiLlama fees/revenue (best-effort)
  let fees: number | null = null
  let revenue: number | null = null
  try {
    const protos = await getJson<any[]>(`${LLAMA}/protocols`)
    const match =
      protos.find((p) => (p.symbol || '').toUpperCase() === symbol) ||
      protos.find((p) => (p.name || '').toLowerCase() === (c.name || '').toLowerCase())
    if (match) {
      const slug = match.slug || slugify(match.name)
      revenue = await llamaTotal(`${LLAMA}/summary/fees/${slug}?dataType=dailyRevenue`)
      fees = await llamaTotal(`${LLAMA}/summary/fees/${slug}?dataType=dailyFees`)
    }
  } catch { /* no match */ }

  // 4) Upside comps (sector leaders)
  const comps = await fetchComps(sector, symbol, cgHeaders)

  // 5) Deep metrics via Claude + web search
  const deep = await researchDeep(
    { name: c.name, symbol, marketCap, circulating: md.circulating_supply, sector },
    env,
  )

  // 6) Assemble import-ready analysis (scores left default → site scores it)
  return {
    identity: {
      ticker: symbol,
      name: c.name,
      coingeckoId: c.id,
      chain: prettifyChain(chain),
      contract: platforms[chain] || '',
      website: (links.homepage || []).find(Boolean) || '',
      docs: links.whitepaper ? String(links.whitepaper) : '',
      twitter: links.twitter_screen_name ? `https://x.com/${links.twitter_screen_name}` : '',
    },
    sector: { sector, narrativeNote: deep.sectorNarrative || '' },
    tokenomics: {
      totalSupply: str(md.total_supply),
      circulatingSupply: str(md.circulating_supply),
      maxSupply: str(md.max_supply),
      fdv: str(md.fully_diluted_valuation?.usd),
      marketCap: str(marketCap),
      price: str(md.current_price?.usd),
      priceChange7d: str(md.price_change_percentage_7d),
      priceChange30d: str(md.price_change_percentage_30d),
      ath: str(md.ath?.usd),
      athChangePct: str(md.ath_change_percentage?.usd),
      distribution: normDist(deep.distribution),
      unlocks: (deep.unlocks || []).slice(0, 6).map((u: any) => ({
        date: str(u.date), amount: str(u.amount), pctOfCirc: str(u.pctOfCirc),
      })),
    },
    valueAccrual: {
      revenueModel: deep.valueAccrual?.revenueModel || '',
      fees: str(fees),
      revenue: str(revenue),
      mechanisms: Array.isArray(deep.valueAccrual?.mechanisms) ? deep.valueAccrual.mechanisms : [],
      note: deep.valueAccrual?.note || '',
    },
    buyback: {
      hasBuyback: typeof deep.buyback?.hasBuyback === 'boolean' ? deep.buyback.hasBuyback : null,
      amountUsd: str(deep.buyback?.amountUsd),
      pctOfRevenue: str(deep.buyback?.pctOfRevenue),
      cadence: deep.buyback?.cadence || '',
      burnMechanics: deep.buyback?.burnMechanics || '',
      note: deep.buyback?.note || '',
    },
    trend: { direction: '', momentumNote: deep.trendMomentum || '' },
    upside: { targetMc: '', targetX: '', comps, note: deep.notes?.upside || '' },
    notes: deep.notes || {},
  }
}

// ---- Claude research (web search) -----------------------------------------
async function researchDeep(
  ctx: { name: string; symbol: string; marketCap: number | null; circulating: number | null; sector: string },
  env: Env,
) {
  const model = env.MODEL || 'claude-opus-5'
  const today = new Date().toISOString().slice(0, 10)
  const prompt = `Ты крипто-аналитик. Собери по токену ${ctx.name} (${ctx.symbol}) фактические данные, которых нет в стандартных ценовых API. Дата: ${today}. Текущая капитализация ~$${ctx.marketCap ?? '?'}, circulating supply ~${ctx.circulating ?? '?'}. Сектор: ${ctx.sector || '?'}.

Используй веб-поиск (tokenomist.ai, cryptorank, messari, defillama, dropstab, офиц. доки/форумы проекта). Верни ТОЛЬКО JSON (без пояснений вокруг) строго такой формы:
{
  "distribution": {"team":"","investors":"","community":"","treasury":"","other":""},
  "unlocks": [{"date":"YYYY-MM-DD","amount":"<токенов>","pctOfCirc":"<% от circ>"}],
  "valueAccrual": {"revenueModel":"<как зарабатывает, кому идёт выручка>","mechanisms":["governance"|"staking"|"feeShare"|"realYield"|"none"],"note":"<даёт ли держание доход, коротко + источник>"},
  "buyback": {"hasBuyback":true|false|null,"pctOfRevenue":"<% выручки на выкуп>","amountUsd":"<$ за период>","cadence":"once|daily|weekly|monthly|quarterly|annual|"","burnMechanics":"","note":"<коротко + источник>"},
  "trendMomentum":"<моментум/структура коротко>",
  "sectorNarrative":"<в фокусе ли сектор>",
  "notes": {"sector":"","tokenomics":"<в т.ч. ближайшие анлоки и навес>","valueAccrual":"","buyback":"","trend":"","upside":""}
}
Правила: только реальные факты с источником; неизвестное — пустая строка/пустой массив, НЕ выдумывай. distribution в % должна давать ~100 (или пусто). unlocks — ближайшие 1-3 события. Каждую нагруженную цифру датируй; отличай факт от предложения/гипотезы.`

  const body: any = {
    model,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    tools: [{ type: webSearchType(model), name: 'web_search', max_uses: 6 }],
    messages: [{ role: 'user', content: prompt }],
  }

  let messages = body.messages
  let text = ''
  for (let i = 0; i < 4; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ...body, messages }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
    const data: any = await res.json()
    text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
    if (data.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: data.content }]
      continue
    }
    break
  }
  return parseJson(text)
}

function webSearchType(model: string): string {
  // Newer models support the dynamic-filtering variant.
  return /opus-5|opus-4-8|opus-4-7|opus-4-6|sonnet-5|sonnet-4-6/.test(model)
    ? 'web_search_20260209'
    : 'web_search_20250305'
}

function parseJson(text: string): any {
  const a = text.indexOf('{')
  const b = text.lastIndexOf('}')
  if (a < 0 || b < 0) return {}
  try {
    return JSON.parse(text.slice(a, b + 1))
  } catch {
    return {}
  }
}

// ---- helpers ---------------------------------------------------------------
async function fetchComps(sector: string, selfSym: string, headers: Record<string, string>) {
  const tickers = (SECTOR_LEADERS[sector] || []).filter((t) => t !== selfSym).slice(0, 2)
  const comps: any[] = []
  for (const t of tickers) {
    try {
      const s = await getJson<any>(`${CG}/search?query=${encodeURIComponent(t)}`, headers)
      const hit = s?.coins?.find((c: any) => (c.symbol || '').toUpperCase() === t) || s?.coins?.[0]
      if (!hit) continue
      const m = await getJson<any[]>(`${CG}/coins/markets?vs_currency=usd&ids=${hit.id}&per_page=1`, headers)
      const row = m?.[0]
      if (row?.market_cap) {
        comps.push({ ticker: t, name: row.name, marketCap: String(row.market_cap), fdv: str(row.fully_diluted_valuation) })
      }
    } catch { /* skip */ }
  }
  return comps
}

async function llamaTotal(url: string): Promise<number | null> {
  try {
    const d = await getJson<any>(url)
    return typeof d.total24h === 'number' ? d.total24h : null
  } catch {
    return null
  }
}

function normDist(d: any) {
  const base = { team: '', investors: '', community: '', treasury: '', other: '' }
  if (!d || typeof d !== 'object') return base
  for (const k of Object.keys(base)) if (d[k] != null) (base as any)[k] = String(d[k])
  return base
}

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json', ...headers } })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return (await res.json()) as T
}

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v)
}
function slugify(s: string): string {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
function prettifyChain(chain: string): string {
  const map: Record<string, string> = {
    ethereum: 'Ethereum', 'binance-smart-chain': 'BNB Chain', 'polygon-pos': 'Polygon',
    'arbitrum-one': 'Arbitrum', 'optimistic-ethereum': 'Optimism', solana: 'Solana',
    avalanche: 'Avalanche', base: 'Base',
  }
  return map[chain] || (chain ? chain.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : '')
}
function json(obj: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  })
}
