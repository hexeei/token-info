# Token Research API (Cloudflare Worker)

Бэкенд для сайта Token Research Checklist. По тикеру собирает **все** метрики
(рынок, выручка, анлоки, байбек, value accrual) и отдаёт готовый разбор, который
сайт заполняет автоматически. Deep-метрики (анлоки/байбек/распределение) research'атся
через Claude с веб-поиском — того, чего нет в бесплатных API.

## Endpoint

```
GET /api/token?q=<тикер | coingecko-id | название>
→ JSON разбора (импортируется сайтом автоматически)
```

## Деплой (один раз, ~2 минуты)

Нужен аккаунт Cloudflare (free tier подходит) и Anthropic API-ключ.

```bash
cd worker
npm install
npx wrangler login                       # войти в свой Cloudflare (откроется браузер)
npx wrangler secret put ANTHROPIC_API_KEY # вставить ключ sk-ant-...
npx wrangler deploy
```

После деплоя получишь URL вида `https://token-research-api.<subdomain>.workers.dev`.
Вставь его на сайте в поле **«API бэкенд»** (кнопка ⚙, сохраняется в браузере).

## Настройки

- `MODEL` (`wrangler.toml` → vars) — модель research. По умолчанию `claude-opus-5`.
  Для экономии поставь `claude-sonnet-5` или `claude-haiku-4-5` и передеплой.
- `ALLOW_ORIGIN` — для продакшена смени `*` на свой Pages-origin
  (`https://<user>.github.io`), чтобы бэкендом не пользовались чужие.
- `COINGECKO_KEY` — если ловишь лимиты CoinGecko:
  `npx wrangler secret put COINGECKO_KEY`.

## Стоимость

Плата — за токены Claude на research-запрос (веб-поиск + генерация). Ориентировочно
центы за токен при `claude-opus-5`; дешевле на `claude-sonnet-5`/`claude-haiku-4-5`.
Кэшируй разборы (сайт хранит их в LocalStorage) — повторные открытия бесплатны.

## Как это работает

1. CoinGecko (server-side) → цена, капа, FDV, supply, ATH, тренд, сектор, ссылки.
2. DefiLlama → fees/revenue (если протокол найден).
3. Claude + web_search → анлоки, байбек, распределение, механики value accrual
   (строго факты с источником; неизвестное остаётся пустым).
4. Возвращает разбор по схеме приложения; **скоры считает сам сайт** по своей базе
   (`src/rubric.ts`), чтобы методика была единой.
