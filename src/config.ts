import type {
  ScoredBlockId,
  Sector,
  ValueAccrualMechanism,
  BuybackCadence,
  TokenAnalysis,
} from './types'

export const SCHEMA_VERSION = 2

// ---- Scoring weights (edit here to retune the aggregate) -------------------
// Sum = 100. Tokenomics and value accrual are the heaviest per the brief.
export const WEIGHTS: Record<ScoredBlockId, number> = {
  tokenomics: 25,
  valueAccrual: 25,
  upside: 15,
  buyback: 13,
  sector: 12,
  trend: 10,
}

// Display order + titles for the scored blocks (radar & contribution list).
export const SCORED_BLOCKS: { id: ScoredBlockId; title: string; short: string }[] = [
  { id: 'sector', title: 'Сектор и нарратив', short: 'Нарратив' },
  { id: 'tokenomics', title: 'Токеномика', short: 'Токеномика' },
  { id: 'valueAccrual', title: 'Value accrual', short: 'Value accrual' },
  { id: 'buyback', title: 'Байбек и сжигание', short: 'Байбек' },
  { id: 'trend', title: 'Тренд', short: 'Тренд' },
  { id: 'upside', title: 'Апсайд', short: 'Апсайд' },
]

// ---- Verdict thresholds (0–10 scale) --------------------------------------
export const VERDICT_THRESHOLDS = {
  strong: 7.5, // > 7.5  → сильный кандидат (зелёный)
  medium: 5, // 5–7.5  → средний (нейтральный/фиолетовый)
  // < 5 → пас (красный)
}

// ---- Enumerations ---------------------------------------------------------
export const SECTORS: Sector[] = [
  'DeFi',
  'AI',
  'RWA',
  'DePIN',
  'L1',
  'L2',
  'Gaming',
  'Meme',
  'Infra',
  'Perp DEX',
  'Restaking',
  'Liquid Staking',
  'SocialFi',
  'Oracle',
  'Bridge',
  'Other',
]

export const MECHANISMS: { id: ValueAccrualMechanism; label: string }[] = [
  { id: 'governance', label: 'Governance' },
  { id: 'staking', label: 'Staking rewards' },
  { id: 'feeShare', label: 'Fee share' },
  { id: 'realYield', label: 'Real yield' },
  { id: 'none', label: 'Ничего' },
]

export const CADENCES: { id: BuybackCadence; label: string; perYear: number }[] = [
  { id: 'once', label: 'Разово', perYear: 1 },
  { id: 'daily', label: 'Ежедневно', perYear: 365 },
  { id: 'weekly', label: 'Еженедельно', perYear: 52 },
  { id: 'monthly', label: 'Ежемесячно', perYear: 12 },
  { id: 'quarterly', label: 'Ежеквартально', perYear: 4 },
  { id: 'annual', label: 'Ежегодно', perYear: 1 },
]

export function cadencePerYear(cadence: string): number | null {
  const c = CADENCES.find((x) => x.id === cadence)
  return c ? c.perYear : null
}

// Sector leaders auto-loaded as upside comps (MC pulled from CoinGecko by ticker).
// Excludes the analysed token itself. Used only to give an instant X-potential.
export const SECTOR_LEADERS: Record<string, string[]> = {
  DeFi: ['AAVE', 'UNI'],
  AI: ['TAO', 'RENDER'],
  RWA: ['ONDO', 'PENDLE'],
  DePIN: ['RENDER', 'HNT'],
  L1: ['SOL', 'AVAX'],
  L2: ['ARB', 'OP'],
  Gaming: ['IMX', 'BEAM'],
  Meme: ['DOGE', 'PEPE'],
  Infra: ['LINK', 'FIL'],
  'Perp DEX': ['HYPE', 'GMX'],
  Restaking: ['EIGEN', 'ETHFI'],
  'Liquid Staking': ['LDO', 'JTO'],
  SocialFi: ['MASK'],
  Oracle: ['LINK', 'PYTH'],
  Bridge: ['AXL', 'W'],
  Other: [],
}

// ---- Factory --------------------------------------------------------------
function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'a_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function createEmptyAnalysis(): TokenAnalysis {
  const now = new Date().toISOString()
  return {
    meta: { id: newId(), createdAt: now, updatedAt: now, schemaVersion: SCHEMA_VERSION },
    identity: {
      ticker: '',
      name: '',
      logo: '',
      coingeckoId: '',
      chain: '',
      contract: '',
      website: '',
      docs: '',
      twitter: '',
    },
    sector: { sector: '', narrativeNote: '' },
    tokenomics: {
      totalSupply: '',
      circulatingSupply: '',
      maxSupply: '',
      fdv: '',
      marketCap: '',
      price: '',
      priceChange7d: '',
      priceChange30d: '',
      ath: '',
      athChangePct: '',
      distribution: { team: '', investors: '', community: '', treasury: '', other: '' },
      unlocks: [],
    },
    valueAccrual: { revenueModel: '', fees: '', revenue: '', mechanisms: [], note: '' },
    buyback: {
      hasBuyback: null,
      amountUsd: '',
      pctOfRevenue: '',
      cadence: '',
      burnMechanics: '',
      note: '',
    },
    trend: { direction: '', momentumNote: '' },
    upside: { targetMc: '', targetX: '', comps: [], note: '' },
    scores: { sector: 5, tokenomics: 5, valueAccrual: 5, buyback: 5, trend: 5, upside: 5 },
    notes: { sector: '', tokenomics: '', valueAccrual: '', buyback: '', trend: '', upside: '' },
    autoFields: {},
  }
}

export function newUnlockId(): string {
  return 'u_' + Math.random().toString(36).slice(2)
}
export function newCompId(): string {
  return 'c_' + Math.random().toString(36).slice(2)
}
