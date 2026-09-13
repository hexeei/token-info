// ---------------------------------------------------------------------------
// Data schema for a single token research analysis.
// Numeric fields are kept as strings (raw user/API input) and parsed on demand
// via lib/format.toNumber — this keeps inputs editable and avoids NaN churn.
// ---------------------------------------------------------------------------

export type Sector =
  | 'DeFi'
  | 'AI'
  | 'RWA'
  | 'DePIN'
  | 'L1'
  | 'L2'
  | 'Gaming'
  | 'Meme'
  | 'Infra'
  | 'Perp DEX'
  | 'Restaking'
  | 'Liquid Staking'
  | 'SocialFi'
  | 'Oracle'
  | 'Bridge'
  | 'Other'

/** What holding the token actually gives you (block 4 checkboxes). */
export type ValueAccrualMechanism =
  | 'governance'
  | 'staking' // staking rewards
  | 'feeShare' // share of protocol fees
  | 'realYield' // real yield (revenue paid to holders)
  | 'none'

export type TrendDirection = 'uptrend' | 'downtrend' | 'range'

export type BuybackCadence =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annual'

/** The six blocks that carry a 0–10 score and feed the radar / aggregate. */
export type ScoredBlockId =
  | 'sector'
  | 'tokenomics'
  | 'valueAccrual'
  | 'buyback'
  | 'trend'
  | 'upside'

export type FlagSeverity = 'critical' | 'warning' | 'info'
export type FlagSource = 'tokenomics' | 'valueAccrual'

export interface RedFlag {
  id: string
  severity: FlagSeverity
  source: FlagSource
  title: string
  detail: string
}

// ---- Block 1: Identity ----------------------------------------------------
export interface Identity {
  ticker: string
  name: string
  logo: string
  coingeckoId: string
  chain: string
  contract: string
  website: string
  docs: string
  twitter: string
}

// ---- Block 2: Sector & narrative ------------------------------------------
export interface SectorBlock {
  sector: Sector | ''
  narrativeNote: string
}

// ---- Block 3: Tokenomics --------------------------------------------------
export interface UnlockEvent {
  id: string
  date: string // ISO yyyy-mm-dd
  amount: string // token amount
  pctOfCirc: string // % of circulating supply (optional; derived if empty)
}

export interface Distribution {
  team: string
  investors: string
  community: string
  treasury: string
  other: string
}

export interface Tokenomics {
  totalSupply: string
  circulatingSupply: string
  maxSupply: string
  fdv: string
  marketCap: string
  price: string
  priceChange7d: string
  priceChange30d: string
  ath: string
  athChangePct: string
  distribution: Distribution
  unlocks: UnlockEvent[]
}

// ---- Block 4: Value accrual (how the token earns) -------------------------
export interface ValueAccrual {
  revenueModel: string // note
  fees: string // $ (auto from DefiLlama if matched)
  revenue: string // $ (auto from DefiLlama if matched)
  mechanisms: ValueAccrualMechanism[]
  note: string
}

// ---- Block 5: Buyback & burn ----------------------------------------------
export interface Buyback {
  hasBuyback: boolean | null
  amountUsd: string // $ per cadence period
  pctOfRevenue: string // % of revenue directed to buyback
  cadence: BuybackCadence | ''
  burnMechanics: string // note
  note: string
}

// ---- Block 6: Trend -------------------------------------------------------
export interface Trend {
  direction: TrendDirection | ''
  momentumNote: string
}

// ---- Block 7: Upside ------------------------------------------------------
export interface Comp {
  id: string
  ticker: string
  name: string
  marketCap: string // $ (optionally auto from CoinGecko by ticker)
  fdv: string // $
}

export interface Upside {
  targetMc: string // target market cap ($)
  targetX: string // or an explicit X potential
  comps: Comp[]
  note: string
}

// ---- Scores & notes (keyed by scored block) -------------------------------
export type Scores = Record<ScoredBlockId, number> // each 0–10
export type Notes = Record<ScoredBlockId, string>

// ---- Meta -----------------------------------------------------------------
export interface Meta {
  id: string
  createdAt: string
  updatedAt: string
  schemaVersion: number
}

// ---- The whole analysis ---------------------------------------------------
export interface TokenAnalysis {
  meta: Meta
  identity: Identity
  sector: SectorBlock
  tokenomics: Tokenomics
  valueAccrual: ValueAccrual
  buyback: Buyback
  trend: Trend
  upside: Upside
  scores: Scores
  notes: Notes
  /** Dotted field paths that were auto-filled from an API (drives the "auto" badge). */
  autoFields: Record<string, boolean>
}

// ---- Derived / computed shapes --------------------------------------------
export interface BlockContribution {
  id: ScoredBlockId
  title: string
  weight: number
  score: number
  /** score × weight ÷ 100, i.e. this block's share of the 0–10 overall. */
  points: number
}

export type VerdictTier = 'strong' | 'medium' | 'pass'

export interface Verdict {
  tier: VerdictTier
  label: string
  tone: 'success' | 'accent' | 'danger'
}

export interface Summary {
  /** Weighted overall on a 0–10 scale. */
  overall: number
  contributions: BlockContribution[]
  redFlags: RedFlag[]
  verdict: Verdict
}
