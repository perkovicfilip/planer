import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useKind } from '../lib/store'
import type { Category, EventData, Item } from '../lib/types'
import { DAYS_MIN, DAYS_SHORT, MONTHS, addDays, iso, isWeekend, monthGrid, parse, today, fmtShort } from '../lib/dates'
import { MAKEUPS, MILESTONES, PERIODS, examPeriod, isHoliday, noClasses, periodsOn } from '../data/ftn'
import { occursOn } from '../lib/logic'
import { go } from '../lib/router'
import { Button, Card, Dot, IconButton, PageHeader, Segmented, cx } from '../ui/kit'
import { EventEditor } from '../ui/EventEditor'

type View = 'godina' | 'mesec'

interface DayMark {
  colors: string[] // kružić (jednodnevni)
  bars: string[] // trake (višednevni)
  events: Item<EventData>[]
}

function useMarks(from: string, to: string, filter: string | null) {
  const events = useKind<EventData>('event')
  const cats = useKind<Category>('category')
  return useMemo(() => {
    const catColor = new Map(cats.map((c) => [c.id, c.data.color]))
    const marks = new Map<string, DayMark>()
    for (const e of events) {
      if (filter && e.data.categoryId !== filter) continue
      const color = (e.data.categoryId && catColor.get(e.data.categoryId)) || '#64748b'
      const multi = !!e.data.endDate && e.data.endDate !== e.data.date
      let d = e.data.date > from ? e.data.date : from
      const end = e.data.repeat === 'none' ? (e.data.endDate || e.data.date) : (e.data.repeatUntil || to)
      const last = end < to ? end : to
      let guard = 0
      while (d <= last && guard++ < 800) {
        if (occursOn(e.data, d)) {
          const m = marks.get(d) ?? { colors: [], bars: [], events: [] }
          if (multi) {
            if (!m.bars.includes(color)) m.bars.push(color)
          } else if (!m.colors.includes(color)) m.colors.push(color)
          m.events.push(e)
          marks.set(d, m)
        }
        d = addDays(d, 1)
      }
    }
    for (const m of marks.values())
      m.events.sort((a, b) => (a.data.start || '99').localeCompare(b.data.start || '99'))
    return marks
  }, [events, cats, from, to, filter])
}

function circleBg(colors: string[]) {
  if (colors.length === 0) return undefined
  if (colors.length === 1) return colors[0]
  const step = 360 / colors.length
  return `conic-gradient(${colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(', ')})`
}

function MiniDay({ date, mark, onClick }: { date: string; mark?: DayMark; onClick: () => void }) {
  const isToday = date === today()
  const weekend = isWeekend(date)
  const exam = examPeriod(date)
  const holiday = isHoliday(date)
  const bez = !holiday && noClasses(date)
  const filled = !!mark?.colors.length
  const n = parse(date).getDate()
  return (
    <button
      onClick={onClick}
      title={titleFor(date, mark)}
      className={cx('relative h-7 grid place-items-center', exam ? 'tint' : weekend && 'weekend')}
      style={exam ? ({ '--tint': exam.tint } as React.CSSProperties) : undefined}
    >
      <span
        className={cx(
          'w-6 h-6 rounded-full grid place-items-center text-xs tabular',
          filled ? 'text-white font-semibold' : holiday ? 'text-rose-600 font-semibold' : bez ? 'text-amber-600' : weekend ? 'text-ink-soft' : 'text-ink',
          isToday && 'ring-2 ring-ink ring-offset-1 ring-offset-transparent',
        )}
        style={{ background: circleBg(mark?.colors ?? []) }}
      >
        {n}
      </span>
      {!!mark?.bars.length && (
        <span className="absolute bottom-0.5 left-1 right-1 flex gap-px">
          {mark.bars.map((c) => (
            <span key={c} className="h-[3px] flex-1 rounded-full" style={{ background: c }} />
          ))}
        </span>
      )}
    </button>
  )
}

function titleFor(date: string, mark?: DayMark) {
  const lines = [fmtShort(date)]
  for (const p of periodsOn(date)) lines.push(p.name)
  const mk = MAKEUPS.find((m) => m.date === date)
  if (mk) lines.push(`Nadoknada — radi se po rasporedu za ${DAYS_SHORT[mk.asWeekday]}`)
  const ms = MILESTONES.find((m) => m.date === date)
  if (ms) lines.push(ms.name)
  for (const e of mark?.events ?? []) lines.push(`• ${e.data.start ? e.data.start + ' ' : ''}${e.data.title}`)
  return lines.join('\n')
}

function MiniMonth({ y, m, marks }: { y: number; m: number; marks: Map<string, DayMark> }) {
  const rows = monthGrid(y, m)
  return (
    <div>
      <div className="text-center text-sm font-semibold mb-0.5 capitalize">
        {MONTHS[m]} <span className="text-ink-faint font-normal">{y}</span>
      </div>
      <div className="grid grid-cols-7 text-xs text-ink-faint text-center mb-0.5">
        {DAYS_MIN.map((d, i) => (
          <div key={i} className={cx(i >= 5 && 'weekend rounded-t')}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {rows.flat().map((d, i) =>
          d ? <MiniDay key={d} date={d} mark={marks.get(d)} onClick={() => go('dan', d)} /> : <div key={'x' + i} className={cx(i % 7 >= 5 && 'weekend')} />,
        )}
      </div>
    </div>
  )
}

function MonthBig({ y, m, marks, onAdd }: { y: number; m: number; marks: Map<string, DayMark>; onAdd: (d: string) => void }) {
  const rows = monthGrid(y, m)
  const cats = useKind<Category>('category')
  const catMap = new Map(cats.map((c) => [c.id, c.data]))
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 text-xs text-ink-faint text-center border-b border-line">
        {DAYS_SHORT.map((d, i) => (
          <div key={d} className={cx('py-2', i >= 5 && 'weekend')}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {rows.flat().map((d, i) => {
          if (!d) return <div key={'x' + i} className={cx('min-h-[72px] border-b border-r border-line', i % 7 >= 5 && 'weekend')} />
          const exam = examPeriod(d)
          const holiday = isHoliday(d)
          const mark = marks.get(d)
          return (
            <div
              key={d}
              onClick={() => go('dan', d)}
              title={titleFor(d, mark)}
              className={cx(
                'group min-h-[72px] md:min-h-[86px] border-b border-r border-line p-1 cursor-pointer hover:bg-paper-sunk/50 relative',
                exam ? 'tint' : isWeekend(d) && 'weekend',
              )}
              style={exam ? ({ '--tint': exam.tint } as React.CSSProperties) : undefined}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cx(
                    'text-xs w-6 h-6 grid place-items-center rounded-full tabular',
                    d === today() && 'bg-ink text-paper font-semibold',
                    d !== today() && holiday && 'text-rose-600 font-semibold',
                  )}
                >
                  {parse(d).getDate()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAdd(d)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-ink"
                  aria-label="Dodaj"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="mt-0.5 space-y-0.5">
                {(mark?.events ?? []).slice(0, 3).map((e) => {
                  const c = e.data.categoryId ? catMap.get(e.data.categoryId) : undefined
                  return (
                    <div
                      key={e.id}
                      className="text-xs leading-tight truncate rounded px-1 py-0.5 text-white"
                      style={{ background: c?.color ?? '#64748b' }}
                    >
                      {e.data.start && <span className="opacity-80">{e.data.start} </span>}
                      {e.data.title}
                    </div>
                  )
                })}
                {(mark?.events.length ?? 0) > 3 && <div className="text-xs text-ink-faint">+{mark!.events.length - 3} još</div>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function Kalendar({ param }: { param?: string }) {
  const [view, setView] = useState<View>(param === 'mesec' ? 'mesec' : 'godina')
  const now = parse(today())
  const [anchor, setAnchor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [filter, setFilter] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const cats = useKind<Category>('category')
  const sortedCats = [...cats].sort((a, b) => a.data.group.localeCompare(b.data.group) || a.data.order - b.data.order)

  const months: { y: number; m: number }[] = []
  const count = view === 'godina' ? 12 : 1
  for (let i = 0; i < count; i++) {
    const t = anchor.m + i
    months.push({ y: anchor.y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 })
  }
  const from = iso(new Date(months[0].y, months[0].m, 1))
  const last = months[months.length - 1]
  const to = iso(new Date(last.y, last.m + 1, 0))
  const marks = useMarks(from, to, filter)

  const shift = (dir: number) => {
    const step = view === 'godina' ? 12 : 1
    const t = anchor.m + dir * step
    setAnchor({ y: anchor.y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 })
  }

  const title =
    view === 'godina'
      ? `${MONTHS[months[0].m].slice(0, 3)} ${months[0].y} – ${MONTHS[last.m].slice(0, 3)} ${last.y}`
      : `${MONTHS[anchor.m]} ${anchor.y}`

  const upcomingPeriods = PERIODS.filter((p) => p.to >= from && p.from <= to && p.kind === 'rok')
  const extraDates = PERIODS.filter((p) => p.to >= from && p.from <= to && p.kind === 'dodatni')

  return (
    <div>
      <PageHeader
        title={<span className="capitalize">{title}</span>}
        right={
          <>
            <IconButton title="Nazad" onClick={() => shift(-1)}>
              <ChevronLeft size={18} />
            </IconButton>
            <Button variant="ghost" onClick={() => setAnchor({ y: now.getFullYear(), m: now.getMonth() })}>
              Danas
            </Button>
            <IconButton title="Napred" onClick={() => shift(1)}>
              <ChevronRight size={18} />
            </IconButton>
            <Segmented<View>
              value={view}
              onChange={setView}
              options={[
                { value: 'godina', label: 'Godina' },
                { value: 'mesec', label: 'Mesec' },
              ]}
            />
            <Button variant="primary" onClick={() => setAdding(today())}>
              <Plus size={16} /> Događaj
            </Button>
          </>
        }
      />

      <div className="lg:flex gap-4">
        <div className="flex-1 min-w-0">
          {view === 'godina' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-3">
              {months.map((mm) => (
                <MiniMonth key={`${mm.y}-${mm.m}`} y={mm.y} m={mm.m} marks={marks} />
              ))}
            </div>
          ) : (
            <MonthBig y={anchor.y} m={anchor.m} marks={marks} onAdd={setAdding} />
          )}
        </div>

        {/* Legenda */}
        <aside className="lg:w-52 shrink-0 mt-4 lg:mt-0 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          <Card className="p-3">
            <div className="text-sm font-semibold mb-2">Aktivnosti</div>
            <div className="space-y-0">
              <LegendRow active={filter === null} onClick={() => setFilter(null)} label="Sve" />
              {sortedCats.map((c) => (
                <LegendRow
                  key={c.id}
                  active={filter === c.id}
                  onClick={() => setFilter(filter === c.id ? null : c.id)}
                  label={c.data.name}
                  color={c.data.color}
                />
              ))}
            </div>
            <a href="#/podesavanja" className="block text-xs text-accent mt-3">
              Dodaj / izmeni aktivnosti →
            </a>
            <div className="text-sm font-semibold mt-5 mb-2">Oznake</div>
            <div className="space-y-1.5 text-xs text-ink-soft">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded weekend border border-line" /> Vikend
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 text-center font-semibold text-rose-600">7</span> Neradni dan / praznik
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 text-center text-amber-600">7</span> Nema nastave
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-[3px] rounded bg-violet-500" /> Višednevno (npr. na putu)
              </div>
              {upcomingPeriods.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded tint border border-line" style={{ '--tint': p.tint } as React.CSSProperties} />
                  <span>
                    {p.name}
                    <span className="text-ink-faint"> · {fmtShort(p.from)}–{fmtShort(p.to)}</span>
                  </span>
                </div>
              ))}
              {extraDates.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded tint border border-line shrink-0" style={{ '--tint': extraDates[0].tint } as React.CSSProperties} />
                  <span>
                    Dodatni rokovi (samo za odslušanu nastavu)
                    <span className="text-ink-faint"> · {extraDates.map((p) => fmtShort(p.from)).join(', ')}</span>
                  </span>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <EventEditor open={!!adding} onClose={() => setAdding(null)} date={adding ?? undefined} />
    </div>
  )
}

function LegendRow({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button onClick={onClick} className={cx('w-full flex items-center gap-2 px-1.5 py-0.5 rounded-md text-sm text-left', active ? 'bg-paper-sunk font-medium' : 'hover:bg-paper-sunk/60')}>
      {color && <Dot color={color} />}
      <span className="truncate">{label}</span>
    </button>
  )
}
