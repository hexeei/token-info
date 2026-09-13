import type { ReactNode } from 'react'

// Shared UI primitives. Color semantics are strict:
// accent = score/neutral, success = good/upside, danger = risk/flag.

type Tone = 'primary' | 'accent' | 'success' | 'danger' | 'muted'

const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  success: 'text-success',
  danger: 'text-danger',
  muted: 'text-secondary',
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-bg-2 bg-bg-1 ${className}`}>{children}</section>
}

export function Block({
  index,
  title,
  subtitle,
  right,
  children,
}: {
  index: number
  title: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <header className="flex items-start justify-between gap-4 border-b border-bg-2 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="tabular mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-2 text-sm font-semibold text-accent">
            {index}
          </span>
          <div>
            <h2 className="text-[15px] font-semibold leading-tight text-primary">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {right}
      </header>
      <div className="px-5 py-4">{children}</div>
    </Card>
  )
}

export function AutoBadge({ show }: { show?: boolean }) {
  if (!show) return null
  return (
    <span
      title="Автоматически подтянуто из API — можно отредактировать"
      className="tabular ml-2 inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent"
    >
      auto
    </span>
  )
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  auto,
  mono,
  type = 'text',
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  auto?: boolean
  mono?: boolean
  type?: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="flex items-center text-xs font-medium text-secondary">
        {label}
        <AutoBadge show={auto} />
      </span>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-lg border border-bg-2 bg-bg-0 px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent/60 focus:outline-none ${
          mono ? 'tabular' : ''
        }`}
      />
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="block">
      {label && <span className="text-xs font-medium text-secondary">{label}</span>}
      <textarea
        value={value ?? ''}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full resize-y rounded-lg border border-bg-2 bg-bg-0 px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent/60 focus:outline-none"
      />
    </label>
  )
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = '—',
  auto,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[] | string[]
  placeholder?: string
  auto?: boolean
}) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <label className="block">
      <span className="flex items-center text-xs font-medium text-secondary">
        {label}
        <AutoBadge show={auto} />
      </span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-bg-2 bg-bg-0 px-3 py-2 text-sm text-primary focus:border-accent/60 focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Metric({
  label,
  value,
  tone = 'primary',
  hint,
}: {
  label: string
  value: ReactNode
  tone?: Tone
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-bg-2 bg-bg-0 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`tabular mt-1 text-lg font-semibold leading-none ${TONE_TEXT[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  )
}

export function ScoreSlider({
  score,
  onScore,
  note,
  onNote,
  notePlaceholder,
}: {
  score: number
  onScore: (n: number) => void
  note: string
  onNote: (v: string) => void
  notePlaceholder?: string
}) {
  return (
    <div className="mt-5 border-t border-bg-2 pt-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-secondary">Скор блока</span>
        <span className="tabular text-sm font-semibold text-accent">{score}/10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={score}
        onChange={(e) => onScore(Number(e.target.value))}
        className="mt-2"
      />
      <div className="tabular mt-1 flex justify-between text-[10px] text-muted">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
      <TextArea value={note} onChange={onNote} placeholder={notePlaceholder} rows={2} />
    </div>
  )
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="h-px flex-1 bg-bg-2" />
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'default',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'success' | 'ghost'
  className?: string
}) {
  const styles = {
    default: 'border border-bg-2 bg-bg-1 text-secondary hover:border-accent/40 hover:text-primary',
    primary: 'bg-accent text-bg-0 hover:opacity-90',
    success: 'bg-success text-bg-0',
    ghost: 'text-secondary hover:text-primary',
  }[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${styles} ${className}`}
    >
      {children}
    </button>
  )
}
