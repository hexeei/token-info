# MEMORY PROFILE: ojasagos

> Machine-readable context for any Claude session working with this user or this
> repository. Written for a Claude to parse quickly, not for narrative reading.
> Last compiled: 2026-09-24. Regenerate by re-running the sources listed at the
> bottom — do not treat this file itself as a live data source for prices/facts.

## user

```yaml
nick: ojasagos
email: doubletop.ed09@gmail.com
dt_hub_role: analyst
domain: crypto trading + portfolio construction
goals:
  - deep research on tokens before adding to portfolio
  - learning trading (technical analysis, execution)
claude_memory_prefs:  # from claude.ai Settings > Memory
  - "занимаюсь криптой, собираю портфель — от Клода нужен глубокий ресерч по токенам"
  - "учусь трейдингу"
dt_graph_memory_status: BROKEN — write attempts return
  "EACCES: permission denied .../server-memory/dist/memory.jsonl" (2026-09-24).
  Do not rely on memory__create_entities/read_graph until this is fixed server-side.
```

## primary_repo

```yaml
repo: hexeei/token-info
name: Token Research Checklist
purpose: dashboard for scoring crypto tokens before adding to portfolio
stack: React + Vite + TypeScript, TailwindCSS (Violet Quant theme), Recharts, LocalStorage (no backend)
autofill_sources: CoinGecko (price/MC/FDV/supply/ATH/sector), DefiLlama (fees/revenue)
scoring_blocks: [sector, tokenomics, valueAccrual, buyback, trend, upside]
weights: {tokenomics: 25, valueAccrual: 25, upside: 15, buyback: 13, sector: 12, trend: 10}
verdict_thresholds: {strong: ">7.5", medium: "5-7.5", pass: "<5"}
source_of_truth_for_schema: [src/types.ts, src/config.ts, src/rubric.ts]
related_skill: .claude/skills/token-check/SKILL.md
```

## skills_relevant_to_this_user

```yaml
- id: token-check
  scope: this repo (.claude/skills/token-check/SKILL.md)
  does: ticker -> CoinGecko+DefiLlama+Nansen+WebSearch -> scored JSON for "Импорт JSON" button
  trigger: "/token-check TICKER", "проверь X по всем метрикам"
- id: analys
  does: fast skeptical chat-brief on one token, self-verifies numbers against 2 sources
  trigger: "/analys TICKER", "проанализируй X"
- id: 2top-research
  does: full multi-page PDF deep-dive in DOUBLETOP house style, ends with position thesis
  trigger: explicit "2TOP research по X" only
- id: token-scout
  does: discovery — finds candidate tokens itself, no ticker input needed
  trigger: "/scout", "/scout solana", "найди перспективные токены"
- id: dataviz
  does: chart/dashboard color and layout standards, used when building charts for token-info
```

## data_sources_available (via doubletopteamhub MCP)

```yaml
market: [coingecko, dexscreener, ccxt (incl. user's own exchange accounts/orders/PnL)]
onchain_smart_money: [nansen, etherscan, dune]
defi: [defillama, pendle]
derivatives_sentiment: [coinglass (funding/liq/OI/long-short/ETF), fear_greed]
news_social: [free_crypto_news, sources (telegram/discord/x/rss/youtube feed+digest+trending), youtube_transcript]
prediction_markets: [graph_polymarket]
team_kb: [dt_db (static, dated by kb_as_of), dt_admin.team_search_context (live notes, 30-90d TTL)]
browser_automation: [playwright]
```

## session_history_highlights (from dt_admin.my_sessions, TTL 30-90d — will expire)

```yaml
- MT5 forex-gold trading bot in Python (multiple attempts)
- Bybit trading bot ("торговать за меня")
- FVG/iFVG indicator for TradingView
- Trade-journal website: screenshots, comments per trade, amounts, TP/SL, %PnL — wanted simple/convenient
- Unified task tracker app with a clarifying-questions-first interface
- Several long sessions redesigning personal site via Claude in Chrome / computer-use
- Installed vercel-labs/skills via npx (find-skills)
```

## regeneration_sources

To refresh this file, re-run:
- `mcp__doubletopteamhub__dt_admin__whoami`
- `mcp__doubletopteamhub__dt_admin__my_sessions` (days=365)
- `mcp__doubletopteamhub__memory__read_graph` (once the EACCES bug above is fixed)
- claude.ai Settings > Memory (preferences block injected into system prompt)
