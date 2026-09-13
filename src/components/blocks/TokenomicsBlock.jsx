import { Block, Field, Metric, ScoreSlider, Divider } from '../ui.jsx'
import UnlockTimeline from '../charts/UnlockTimeline.jsx'
import { computeTokenomics } from '../../lib/scoring.js'
import { formatPct, toNumber } from '../../lib/format.js'

const DIST_FIELDS = [
  ['team', 'Команда'],
  ['investors', 'Инвесторы'],
  ['community', 'Комьюнити'],
  ['treasury', 'Казна'],
  ['other', 'Прочее'],
]

// Block 3 — Tokenomics: supply, FDV/MC, distribution, unlock timeline.
export default function TokenomicsBlock({ a, set, setScore, setNote, isAuto }) {
  const t = a.tokenomics
  const tk = computeTokenomics(a)
  const distOk = !tk.distFilled || Math.abs(tk.distSum - 100) <= 0.5

  function addUnlock() {
    const next = [
      ...(t.unlocks || []),
      { id: 'u_' + Math.random().toString(36).slice(2), date: '', amount: '', pctOfCirc: '' },
    ]
    set('tokenomics.unlocks', next)
  }
  function updateUnlock(id, key, value) {
    set(
      'tokenomics.unlocks',
      (t.unlocks || []).map((u) => (u.id === id ? { ...u, [key]: value } : u)),
    )
  }
  function removeUnlock(id) {
    set(
      'tokenomics.unlocks',
      (t.unlocks || []).filter((u) => u.id !== id),
    )
  }

  return (
    <Block index={3} title="Токеномика" subtitle="Supply, разводнение, распределение и анлоки">
      {/* Supply */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Total supply" value={t.totalSupply} onChange={(v) => set('tokenomics.totalSupply', v)} auto={isAuto('tokenomics.totalSupply')} mono />
        <Field label="Circulating supply" value={t.circulatingSupply} onChange={(v) => set('tokenomics.circulatingSupply', v)} auto={isAuto('tokenomics.circulatingSupply')} mono />
        <Field label="Max supply" value={t.maxSupply} onChange={(v) => set('tokenomics.maxSupply', v)} auto={isAuto('tokenomics.maxSupply')} mono placeholder="∞ если нет" />
        <Field label="Market Cap" value={t.marketCap} onChange={(v) => set('tokenomics.marketCap', v)} auto={isAuto('tokenomics.marketCap')} mono />
        <Field label="FDV" value={t.fdv} onChange={(v) => set('tokenomics.fdv', v)} auto={isAuto('tokenomics.fdv')} mono />
        <Field label="Цена" value={t.price} onChange={(v) => set('tokenomics.price', v)} auto={isAuto('tokenomics.price')} mono />
      </div>

      {/* Derived metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric
          label="% в обращении"
          value={tk.pctCirculating != null ? formatPct(tk.pctCirculating) : '—'}
          tone={tk.pctCirculating != null && tk.pctCirculating < 20 ? 'danger' : 'accent'}
          hint="circ / max (или total)"
        />
        <Metric
          label="FDV / MC"
          value={tk.fdvMcRatio != null ? `${tk.fdvMcRatio.toFixed(2)}×` : '—'}
          tone={tk.fdvMcRatio != null && tk.fdvMcRatio >= 3 ? 'danger' : tk.fdvMcRatio != null && tk.fdvMcRatio <= 1.2 ? 'success' : 'accent'}
          hint="высокий = навес токенов впереди"
        />
        <Metric
          label="Анлок ≤ 90 дн."
          value={formatPct(tk.unlock90dPct)}
          tone={tk.unlock90dPct > 10 ? 'danger' : tk.unlock90dPct > 0 ? 'accent' : 'success'}
          hint="от circ supply"
        />
      </div>

      <Divider label="Распределение (%)" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {DIST_FIELDS.map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={t.distribution[key]}
            onChange={(v) => set(`tokenomics.distribution.${key}`, v)}
            auto={isAuto(`tokenomics.distribution.${key}`)}
            mono
            type="number"
            placeholder="0"
          />
        ))}
      </div>
      {tk.distFilled && (
        <div
          className={`mt-2 flex items-center gap-2 text-xs ${distOk ? 'text-success' : 'text-danger'}`}
        >
          <span className="tabular font-semibold">Σ = {tk.distSum.toFixed(1)}%</span>
          <span>
            {distOk ? 'сумма сходится к 100%' : 'сумма должна давать 100% — проверьте разбивку'}
          </span>
        </div>
      )}

      <Divider label="Таймлайн анлоков" />

      <div className="space-y-2">
        {(t.unlocks || []).map((u) => (
          <div key={u.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
            <MiniField label="Дата" type="date" value={u.date} onChange={(v) => updateUnlock(u.id, 'date', v)} />
            <MiniField label="Объём токенов" value={u.amount} onChange={(v) => updateUnlock(u.id, 'amount', v)} placeholder="напр. 5000000" />
            <MiniField label="% от circ" value={u.pctOfCirc} onChange={(v) => updateUnlock(u.id, 'pctOfCirc', v)} placeholder="авто, если пусто" />
            <button
              type="button"
              onClick={() => removeUnlock(u.id)}
              className="mb-0.5 rounded-lg border border-bg-2 px-2 py-2 text-muted hover:border-danger/50 hover:text-danger"
              title="Удалить запись"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addUnlock}
          className="mt-1 rounded-lg border border-dashed border-bg-2 px-3 py-2 text-xs text-secondary hover:border-accent/50 hover:text-accent"
        >
          + Добавить анлок
        </button>
      </div>

      <div className="mt-4">
        <UnlockTimeline unlocks={t.unlocks} circulating={toNumber(t.circulatingSupply)} />
      </div>

      {tk.unlock90dPct > 10 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <span className="mt-0.5">⚑</span>
          <span>
            Ред-флаг: суммарный анлок{' '}
            <span className="tabular font-semibold">{formatPct(tk.unlock90dPct)}</span> от circ
            supply в ближайшие 90 дней (&gt; 10%). Учтено в итоговом вердикте.
          </span>
        </div>
      )}

      <ScoreSlider
        score={a.scores.tokenomics}
        onScore={(n) => setScore('tokenomics', n)}
        note={a.notes.tokenomics}
        onNote={(v) => setNote('tokenomics', v)}
        notePlaceholder="Качество токеномики: эмиссия, навес, справедливость распределения…"
      />
    </Block>
  )
}

function MiniField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="tabular mt-1 w-full rounded-lg border border-bg-2 bg-bg-0 px-2.5 py-2 text-sm text-primary placeholder:text-muted focus:border-accent/60 focus:outline-none"
      />
    </label>
  )
}
