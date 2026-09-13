---
name: token-check
description: Автоматический разбор крипто-токена по всем метрикам Token Research Checklist для последующего импорта в дашборд (hexeei/token-info). Given a ticker, gathers market data (CoinGecko), fees/revenue (DefiLlama), on-chain holders/liquidity/smart-money flows (Nansen), and token unlocks + buyback/fee-switch status (WebSearch across tokenomist/cryptorank/messari/project forums), then scores all six blocks by the rubric and emits an import-ready JSON. Trigger when the user names a ticker to check/research for the checklist app, e.g. "проверь SOL по всем метрикам", "собери разбор X под импорт", "разбери X для дашборда", "/token-check TICKER".
---

# token-check — авто-разбор токена под импорт в дашборд

Цель: по тикеру собрать данные со всех источников, проставить скоры по базе и выдать
JSON, который пользователь зальёт кнопкой «Импорт JSON» на сайте (hexeei/token-info,
GitHub Pages). Схема JSON и веса должны совпадать с `src/types.ts`, `src/config.ts`,
`src/rubric.ts` этого репозитория — сверяйся с ними, они источник правды.

## Порядок сбора данных

Собирай параллельно, где можно. Каждый факт помечай источником; числа — на дату сбора.

1. **Рынок (CoinGecko)** — `mcp__doubletopteamhub__coingecko__execute`, метод `coins.getID(id, {market_data:true})`.
   Берёшь: name, symbol, price, market_cap, fdv, total_volume, circulating/total/max supply,
   ath + ath_change_percentage, price_change_percentage_7d/30d, categories (→ сектор),
   platforms (chain+contract), links (site/twitter). Сектор маппишь через `src/lib/sectors.ts`.
2. **Доход (DefiLlama)** — `get_summary_fees__by_protocol` (dataType dailyFees и dailyRevenue).
   Если результат огромный — читай только поля total24h/total7d/total30d/total1y из
   сохранённого файла (jq/python по срезу). Учитывай, КОМУ идёт выручка (протокол vs держатель).
3. **Ончейн (Nansen)** — `nansen__token_info` (holders, liquidity, volume, buys/sells),
   `nansen__token_recent_flows_summary` (7d: биржи/свежие/смарт-мани/whale потоки),
   при желании `nansen__token_current_top_holders`. Чейн ставь по CoinGecko platforms.
4. **Анлоки (WebSearch)** — запрос вида "TICKER token unlock schedule 2026 next amount cliff end date".
   Источники: tokenomist.ai, cryptorank.io, messari, dropstab, биржевые блоги. Прямой WebFetch
   на defillama.com / tokenomist.ai часто заблокирован egress — бери из сниппетов поиска.
   Нужно: ближайшие 1–3 события (дата, объём токенов, % от circ), месячный темп, дата конца
   вестинга, суммарный навес впереди.
5. **Value accrual / байбек / fee-switch (WebSearch)** — "TICKER staking fee switch buyback
   revenue share holders 2026". Ищи: есть ли реальный fee-share держателю, стейкинг (эмиссия
   vs real yield), выкуп/burn токена, статус пропозалов. Честно различай факт и гипотезу.
6. **Распределение** — из офиц. доков/отчётов (WebSearch): % команда / инвесторы / комьюнити /
   казна / прочее. Сумма ДОЛЖНА давать 100. Если точных цифр нет — оставь пустым, не выдумывай.

## Скоринг (по `src/rubric.ts`, шкала 0–10)

- **marketCap → апсайд** (меньше = выше): ≤$25M→9, ≤$100M→8, ≤$300M→7, ≤$1B→6, ≤$3B→5, ≤$10B→4, ≤$30B→3, иначе→2. +1 если ≤−85% от ATH, −1 если ≥−20%.
- **fdvMc** (меньше=лучше): ≤1.1→10, ≤1.5→8, ≤2→7, ≤3→5, ≤5→3, иначе→1.
- **pctCirc** (больше=лучше): ≥80→10, ≥60→8, ≥40→6, ≥25→5, ≥15→3, иначе→2.
- **unlock90d %** (меньше=лучше): ≤1→10, ≤3→8, ≤5→7, ≤10→5, ≤20→3, иначе→1.
- **ps** MC/годовая выручка (меньше=лучше): ≤10→10, ≤20→9, ≤40→7, ≤80→5, ≤150→3, иначе→2.
- **trend** avg(7д,30д) (больше=лучше): ≥25→10, ≥10→8, ≥0→6, ≥−10→4, ≥−25→3, иначе→2.
- **buybackYield** годовой байбек/MC (больше=лучше): ≥10%→10, ≥5%→8, ≥2%→6, >0→5, нет→4.

Скоры блоков:
- **sector**: база 5, +2 за горячий сектор (AI, RWA, DePIN, Restaking, Liquid Staking, Perp DEX), +1 при 30д>25%. Корректируй качественно по нарративу.
- **tokenomics**: среднее по fdvMc/pctCirc/unlock90d; дисконтируй за непрерывный вестинг/навес казны.
- **valueAccrual**: по ps, если выручка идёт держателю; если только governance / эмиссионный стейкинг / выручка в казну — 2–4 и ставь mechanisms по факту (флаг «слабый value accrual» срабатывает на только-governance или пусто).
- **buyback**: по buybackYield; нет выкупа → 3.
- **trend**: по среднему 7д/30д, но учитывай расхождение (резкий 7д откат при +30д → рейндж).
- **upside**: лестница капы ±ATH; comps — 2 крупнейших пира сектора (подтяни их MC из CoinGecko), посчитай X.

Веса (не менять без просьбы): tokenomics 25, valueAccrual 25, upside 15, buyback 13, sector 12, trend 10.
Вердикт: >7.5 сильный, 5–7.5 средний, <5 пас.

## Выдача

Собери объект по схеме ниже, сохрани в файл `<ticker>-research.json` в scratchpad и отдай
пользователю через SendUserFile с подсказкой «Залей через Импорт JSON». Числа — строками.
В `notes.*` клади короткое обоснование скора + источники и дату данных. Даты/объёмы анлоков,
если приблизительные, помечай «сверить на Token Unlocks».

```json
{
  "identity": { "ticker": "", "name": "", "coingeckoId": "", "chain": "", "contract": "", "website": "", "docs": "", "twitter": "" },
  "sector": { "sector": "", "narrativeNote": "" },
  "tokenomics": {
    "totalSupply": "", "circulatingSupply": "", "maxSupply": "", "fdv": "", "marketCap": "", "price": "",
    "priceChange7d": "", "priceChange30d": "", "ath": "", "athChangePct": "",
    "distribution": { "team": "", "investors": "", "community": "", "treasury": "", "other": "" },
    "unlocks": [ { "date": "YYYY-MM-DD", "amount": "", "pctOfCirc": "" } ]
  },
  "valueAccrual": { "revenueModel": "", "fees": "", "revenue": "", "mechanisms": [], "note": "" },
  "buyback": { "hasBuyback": false, "amountUsd": "", "pctOfRevenue": "", "cadence": "", "burnMechanics": "", "note": "" },
  "trend": { "direction": "", "momentumNote": "" },
  "upside": { "targetMc": "", "targetX": "", "comps": [ { "ticker": "", "name": "", "marketCap": "", "fdv": "" } ], "note": "" },
  "scores": { "sector": 5, "tokenomics": 5, "valueAccrual": 5, "buyback": 5, "trend": 5, "upside": 5 },
  "notes": { "sector": "", "tokenomics": "", "valueAccrual": "", "buyback": "", "trend": "", "upside": "" }
}
```

`mechanisms` ∈ governance | staking | feeShare | realYield | none. `cadence` ∈ once | daily |
weekly | monthly | quarterly | annual (или ''). `direction` ∈ uptrend | downtrend | range (или '').

## Принципы

- Не выдумывай числа. Нет источника — оставь поле пустым, скор ставь консервативно, пометь в note.
- Каждая нагруженная цифра — с датой; устаревшее помечай.
- Различай факт и гипотезу (напр. «fee-switch обсуждается» ≠ «есть fee-share»).
- Батч: если дали несколько тикеров — прогони каждый и отдай по файлу.
