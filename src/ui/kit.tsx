import { useEffect, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { PALETTE } from '../data/defaults'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx('bg-paper-raised border border-line rounded-2xl', className)}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{children}</h2>
      {action}
    </div>
  )
}

export function PageHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub && <div className="text-xs text-ink-faint">{sub}</div>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </header>
  )
}

type BtnVariant = 'primary' | 'ghost' | 'soft' | 'danger'
export function Button({
  children,
  onClick,
  variant = 'soft',
  className,
  type = 'button',
  disabled,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: BtnVariant
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  title?: string
}) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-accent text-white hover:brightness-110',
    soft: 'bg-paper-sunk text-ink hover:bg-line/70',
    ghost: 'text-ink-soft hover:bg-paper-sunk',
    danger: 'bg-rose-600 text-white hover:brightness-110',
  }
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition disabled:opacity-40',
        v[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function IconButton({
  children,
  onClick,
  title,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  title: string
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cx('w-8 h-8 grid place-items-center rounded-lg text-ink-soft hover:bg-paper-sunk transition', className)}
    >
      {children}
    </button>
  )
}

export function CheckCircle({ done, color, onClick, size = 22 }: { done: boolean; color: string; onClick: () => void; size?: number }) {
  return (
    <button
      type="button"
      aria-label={done ? 'Poništi' : 'Označi kao urađeno'}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
        if ('vibrate' in navigator) navigator.vibrate?.(8)
      }}
      style={{ width: size, height: size, borderColor: color, background: done ? color : 'transparent' }}
      className="shrink-0 rounded-full border-2 grid place-items-center transition active:scale-90"
    >
      {done && <Check size={size * 0.6} strokeWidth={3} className="text-white" />}
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  tall = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  tall?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-label={title} className={cx('relative w-full max-h-[92vh] flex flex-col bg-paper-raised sm:rounded-2xl rounded-t-2xl shadow-2xl safe-bottom', wide ? cx('sm:max-w-6xl', tall && 'sm:h-[90vh]') : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <IconButton title="Zatvori" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="px-5 pb-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="px-5 py-2 border-t border-line flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="block mb-3">
      <span className="block text-xs font-medium text-ink-soft mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-faint mt-1">{hint}</span>}
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={cx('w-7 h-7 rounded-full transition', value === c && 'ring-2 ring-offset-2 ring-ink ring-offset-paper-raised')}
          style={{ background: c }}
        />
      ))}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function Progress({ value, max, color = 'rgb(var(--accent))', height = 8 }: { value: number; max: number; color?: string; height?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="w-full rounded-full bg-paper-sunk overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: color }} />
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm text-ink-faint text-center py-4">{children}</div>
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto scrollbar-none bg-paper-sunk rounded-xl p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'px-2.5 py-1 text-sm rounded-[9px] transition whitespace-nowrap',
            value === o.value ? 'bg-paper-raised shadow-sm font-medium' : 'text-ink-soft',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Jednostavan linijski grafikon (SVG). */
export function LineChart({
  points,
  height = 140,
  color = 'rgb(var(--accent))',
  unit = '',
  goal,
  ticks: tickCount = 3,
}: {
  points: { x: string; y: number }[]
  height?: number
  color?: string
  unit?: string
  goal?: number
  ticks?: number
}) {
  if (points.length === 0) return <Empty>Još nema podataka.</Empty>
  const W = 600
  const H = height
  const pad = { l: 36, r: 12, t: 12, b: 22 }
  const ys = points.map((p) => p.y).concat(goal !== undefined ? [goal] : [])
  let min = Math.min(...ys)
  let max = Math.max(...ys)
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min
  min -= span * 0.1
  max += span * 0.1
  const sx = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (W - pad.l - pad.r))
  const sy = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
  const ticks = Array.from({ length: tickCount }, (_, i) => min + ((max - min) * (i + 0.5)) / tickCount)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} stroke="rgb(var(--line))" strokeWidth={1} />
          <text x={pad.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="rgb(var(--ink-faint))">
            {t.toFixed(span < 5 ? 1 : 0)}
          </text>
        </g>
      ))}
      {goal !== undefined && (
        <line x1={pad.l} x2={W - pad.r} y1={sy(goal)} y2={sy(goal)} stroke={color} strokeDasharray="5 5" strokeOpacity={0.5} />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {points.map((p, i) => (
        <circle key={i} cx={sx(i)} cy={sy(p.y)} r={3.5} fill={color}>
          <title>
            {p.x}: {p.y}
            {unit}
          </title>
        </circle>
      ))}
      <text x={pad.l} y={H - 5} fontSize={11} fill="rgb(var(--ink-faint))">
        {points[0].x}
      </text>
      <text x={W - pad.r} y={H - 5} fontSize={11} textAnchor="end" fill="rgb(var(--ink-faint))">
        {points[points.length - 1].x}
      </text>
    </svg>
  )
}
