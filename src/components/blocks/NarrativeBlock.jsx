import { Block, Select, TextArea, ScoreSlider } from '../ui.jsx'
import { SECTORS } from '../../lib/sectors.js'

// Block 2 — Sector & narrative.
export default function NarrativeBlock({ a, set, setScore, setNote, isAuto }) {
  return (
    <Block
      index={2}
      title="Сектор и нарратив"
      subtitle="Насколько сектор в фокусе рынка прямо сейчас"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Сектор"
          value={a.narrative.sector}
          onChange={(v) => set('narrative.sector', v)}
          options={SECTORS}
          auto={isAuto('narrative.sector')}
          placeholder="Выбрать сектор"
        />
        <div className="rounded-lg border border-bg-2 bg-bg-0 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-muted">Подсказка</div>
          <div className="mt-1 text-xs text-secondary">
            Сектор предзаполнен из категорий CoinGecko — проверьте и при необходимости
            уточните вручную.
          </div>
        </div>
      </div>

      <div className="mt-3">
        <TextArea
          label="Текущий нарратив"
          value={a.narrative.narrativeNote}
          onChange={(v) => set('narrative.narrativeNote', v)}
          placeholder="В фокусе ли сектор сейчас? Есть ли приток внимания/ликвидности, свежие катализаторы, ротация капитала в этот нарратив?"
        />
      </div>

      <ScoreSlider
        score={a.scores.narrative}
        onScore={(n) => setScore('narrative', n)}
        note={a.notes.narrative}
        onNote={(v) => setNote('narrative', v)}
        notePlaceholder="Аргументация скора силы нарратива…"
      />
    </Block>
  )
}
