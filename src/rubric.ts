// ---------------------------------------------------------------------------
// СКОРИНГ-БАЗА (рубрика).
// Каждая метрика → лестница порогов → скор 0–10. Это единственный источник
// правды для авто-скоринга: правишь здесь — меняется весь расчёт и таблица
// «Методика» на сайте. Пороговые значения подобраны так, чтобы, например,
// капитализация $1B давала 8 (якорь пользователя).
// ---------------------------------------------------------------------------

export interface RubricMetric {
  key: string
  label: string
  unit: '$' | '%' | '×' | ''
  higherIsBetter: boolean
  /** [порог, скор]. Для higherIsBetter: value >= порог. Иначе: value <= порог.
   *  Порог null — «всё остальное» (catch-all). Порядок — от лучшего к худшему. */
  bands: [number | null, number][]
  hint?: string
}

export const RUBRIC: Record<string, RubricMetric> = {
  // Капитализация → апсайд: МЕНЬШЕ = ВЫШЕ потенциал роста (место для икса).
  // У мегакапов апсайд ограничен, у микрокапов — большой (но риск отдельно).
  marketCap: {
    key: 'marketCap',
    label: 'Капитализация → апсайд',
    unit: '$',
    higherIsBetter: false,
    bands: [
      [25e6, 9], // ≤ $25M   микрокап — максимум потенциала
      [100e6, 8], // ≤ $100M
      [300e6, 7], // ≤ $300M
      [1e9, 6], // ≤ $1B
      [3e9, 5], // ≤ $3B
      [10e9, 4], // ≤ $10B
      [30e9, 3], // ≤ $30B
      [null, 2], // > $30B  мегакап — потолок близко
    ],
    hint: 'меньше капа = больше места для роста',
  },

  // FDV / MC: меньше = лучше (меньше навес будущей эмиссии).
  fdvMc: {
    key: 'fdvMc',
    label: 'FDV / MC',
    unit: '×',
    higherIsBetter: false,
    bands: [
      [1.1, 10],
      [1.5, 8],
      [2, 7],
      [3, 5],
      [5, 3],
      [null, 1],
    ],
    hint: 'навес ещё не разлоченных токенов',
  },

  // % в обращении: больше = лучше.
  pctCirc: {
    key: 'pctCirc',
    label: '% в обращении',
    unit: '%',
    higherIsBetter: true,
    bands: [
      [80, 10],
      [60, 8],
      [40, 6],
      [25, 5],
      [15, 3],
      [null, 2],
    ],
    hint: 'доля circulating от max supply',
  },

  // Анлок в ближайшие 90 дней (% от circ): меньше = лучше.
  unlock90d: {
    key: 'unlock90d',
    label: 'Анлок ≤ 90 дн.',
    unit: '%',
    higherIsBetter: false,
    bands: [
      [1, 10],
      [3, 8],
      [5, 7],
      [10, 5],
      [20, 3],
      [null, 1],
    ],
    hint: 'навес предложения в ближайшие 3 месяца',
  },

  // MC / годовая выручка (≈P/S): меньше = лучше (дешевле по выручке).
  ps: {
    key: 'ps',
    label: 'MC / годовая выручка',
    unit: '×',
    higherIsBetter: false,
    bands: [
      [10, 10],
      [20, 9],
      [40, 7],
      [80, 5],
      [150, 3],
      [null, 2],
    ],
    hint: 'оценка по фундаменталу выручки',
  },

  // Средний тренд (7д/30д, %): больше = лучше.
  trend: {
    key: 'trend',
    label: 'Тренд (7д/30д)',
    unit: '%',
    higherIsBetter: true,
    bands: [
      [25, 10],
      [10, 8],
      [0, 6],
      [-10, 4],
      [-25, 3],
      [null, 2],
    ],
    hint: 'моментум цены',
  },

  // Buyback yield (годовой байбек / MC, %): больше = лучше.
  buybackYield: {
    key: 'buybackYield',
    label: 'Buyback yield',
    unit: '%',
    higherIsBetter: true,
    bands: [
      [10, 10],
      [5, 8],
      [2, 6],
      [0.0001, 5],
      [null, 4], // байбека нет / данных нет
    ],
    hint: 'возврат стоимости через выкуп',
  },
}

// Сектор (нарратив) — базовый скор + бонусы.
export const SECTOR_RUBRIC = {
  base: 5,
  hotSectors: ['AI', 'RWA', 'DePIN', 'Restaking', 'Liquid Staking', 'Perp DEX'],
  hotBonus: 2,
  momentum30dThreshold: 25, // сильный приток за 30д
  momentumBonus: 1,
}

// Апсайд — корректировки поверх лестницы капитализации.
export const UPSIDE_RUBRIC = {
  deepBelowAthPct: -85, // глубоко ниже ATH → есть куда восстанавливаться
  deepBelowAthBonus: 1,
  nearAthPct: -20, // близко к ATH → апсайд ограничен
  nearAthPenalty: -1,
}

/** Скор по одной метрике. Возвращает null, если значение неизвестно. */
export function scoreMetric(value: number | null | undefined, metric: RubricMetric): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  for (const [threshold, score] of metric.bands) {
    if (threshold === null) return score
    if (metric.higherIsBetter ? value >= threshold : value <= threshold) return score
  }
  return metric.bands[metric.bands.length - 1][1]
}
