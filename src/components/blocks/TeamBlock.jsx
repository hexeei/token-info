import { Block, TextArea, ScoreSlider } from '../ui.jsx'

// Block 4 — Team & backers (manual).
export default function TeamBlock({ a, set, setScore, setNote }) {
  return (
    <Block index={4} title="Команда и бэкеры" subtitle="Кто строит и кто занёс деньги">
      <TextArea
        label="Команда, бэкеры, раунды"
        value={a.team.backers}
        onChange={(v) => set('team.backers', v)}
        rows={4}
        placeholder="Публичность команды, прошлый трек-рекорд, фонды/ангелы в кап-тейбле, суммы и оценки раундов, репутация лидов…"
      />
      <ScoreSlider
        score={a.scores.team}
        onScore={(n) => setScore('team', n)}
        note={a.notes.team}
        onNote={(v) => setNote('team', v)}
        notePlaceholder="Насколько сильна команда и качество бэкеров…"
      />
    </Block>
  )
}
