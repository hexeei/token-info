// Sector dropdown options and a best-effort mapper from CoinGecko categories.

export const SECTORS = [
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

// Ordered rules: first category string that matches maps to a sector.
const RULES = [
  [/liquid staking|lsd|lst/i, 'Liquid Staking'],
  [/restaking|eigen/i, 'Restaking'],
  [/perpetual|perp/i, 'Perp DEX'],
  [/oracle/i, 'Oracle'],
  [/bridge|interoperab|cross-chain/i, 'Bridge'],
  [/depin|physical infrastructure/i, 'DePIN'],
  [/real world asset|rwa|tokeniz/i, 'RWA'],
  [/artificial intelligence|\bai\b|machine learning/i, 'AI'],
  [/socialfi|social/i, 'SocialFi'],
  [/gaming|game|metaverse|play.to.earn|gamefi/i, 'Gaming'],
  [/meme/i, 'Meme'],
  [/layer 2|rollup|\bl2\b/i, 'L2'],
  [/layer 1|smart contract platform|\bl1\b/i, 'L1'],
  [/decentralized finance|defi|dex|lending|yield|derivatives/i, 'DeFi'],
  [/infrastructure|infra|data availability|node/i, 'Infra'],
]

// categories: array of strings from CoinGecko coin.categories
export function guessSector(categories = []) {
  const list = (categories || []).filter(Boolean)
  for (const [re, sector] of RULES) {
    if (list.some((c) => re.test(c))) return sector
  }
  return ''
}
