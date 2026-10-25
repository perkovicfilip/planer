import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { store, useKind } from '../lib/store'
import { distinctColor } from '../lib/colors'
import type { Category, EventData, Item } from '../lib/types'
import { DAYS_MIN, DAYS_SHORT, MONTHS, addDays, iso, monthGrid, parse, today, fmtShort, weekday } from '../lib/dates'
import { FTN_LEGEND, MAKEUPS, MILESTONES, ftnMark, periodsOn } from '../data/ftn'
import { occursOn } from '../lib/logic'
import { Button, Card, Dot, IconButton, PageHeader, Segmented, cx } from '../ui/kit'
import { EventEditor } from '../ui/EventEditor'

type View = 'godina' | 'mesec'

interface DayMark {
  colors: string[] // kružić (jednodnevni)
  bars: string[] // trake (višednevni)
  events: Item<EventData>[]
}

function useMarks(from: string, to: string, hidden: string[]) {
  const events = useKind<EventData>('event')
  const cats = useKind<Category>('category')
  return useMemo(() => {
    const catColor = new Map(cats.map((c) => [c.id, c.data.color]))
    const marks = new Map<string, DayMark>()
    for (const e of events) {
      if (e.data.categoryId && hidden.includes(e.data.categoryId)) continue
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
  }, [events, cats, from, to, hidden])
}

function circleBg(colors: string[]) {
  if (colors.length === 0) return undefined
  if (colors.length === 1) return colors[0]
  const step = 360 / colors.length
  return `conic-gradient(${colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(', ')})`
}

function MiniDay({ date, mark, onClick, ftn }: { date: string; mark?: DayMark; onClick: () => void; ftn: boolean }) {
  const isToday = date === today()
  const f = ftn ? ftnMark(date, weekday(date)) : null
  const filled = !!mark?.colors.length
  const n = parse(date).getDate()
  return (
    <button
      onClick={onClick}
      title={titleFor(date, mark, ftn)}
      className="relative h-9 grid place-items-center hover:bg-paper-sunk/60 rounded-md"
      style={f ? { background: f.color } : undefined}
    >
      <span
        className={cx(
          'w-8 h-8 rounded-full grid place-items-center text-[0.95rem] tabular',
          filled ? 'text-white font-bold' : f ? 'text-stone-900' : 'text-ink',
          isToday && 'ring-2 ring-accent ring-offset-2 ring-offset-paper',
        )}
        style={{ background: circleBg(mark?.colors ?? []), textShadow: filled ? '0 1px 2px rgb(0 0 0 / 0.45)' : undefined }}
      >
        {n}
      </span>
      {!!mark?.bars.length && (
        <span className="absolute bottom-0.5 left-1 right-1 flex gap-px">
          {mark.bars.map((c) => (
            <span key={c} className="h-[4px] flex-1 rounded-full" style={{ background: c }} />
          ))}
        </span>
      )}
    </button>
  )
}

function titleFor(date: string, mark?: DayMark, ftn = false) {
  const lines = [fmtShort(date)]
  if (ftn) {
    for (const p of periodsOn(date)) lines.push(p.name)
    const mk = MAKEUPS.find((m) => m.date === date)
    if (mk) lines.push(`Nadoknada — radi se po rasporedu za ${DAYS_SHORT[mk.asWeekday]}`)
    const ms = MILESTONES.find((m) => m.date === date)
    if (ms) lines.push(ms.name)
  }
  for (const e of mark?.events ?? []) {
    const cat = e.data.categoryId ? store.get<Category>(e.data.categoryId)?.data.name : undefined
    const time = e.data.start ? `  ${e.data.start}${e.data.end ? '–' + e.data.end : ''}` : ''
    lines.push(`• ${e.data.title}${time}`)
    if (cat && cat !== e.data.title) lines.push(`   ${cat}`)
  }
  return lines.join('\n')
}

function MiniMonth({ y, m, marks, ftn, onPick }: { y: number; m: number; marks: Map<string, DayMark>; ftn: boolean; onPick: (d: string) => void }) {
  const rows = monthGrid(y, m)
  return (
    <div>
      <div className="text-center text-base font-semibold mb-0.5 capitalize">
        {MONTHS[m]} <span className="text-ink-faint font-normal">{y}</span>
      </div>
      <div className="grid grid-cols-7 text-sm text-ink-faint text-center mb-0.5">
        {DAYS_MIN.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {rows.flat().map((d, i) =>
          d ? <MiniDay key={d} date={d} mark={marks.get(d)} ftn={ftn} onClick={() => onPick(d)} /> : <div key={'x' + i} />,
        )}
      </div>
    </div>
  )
}

function MonthBig({ y, m, marks, onAdd, ftn }: { y: number; m: number; marks: Map<string, DayMark>; onAdd: (d: string) => void; ftn: boolean }) {
  const rows = monthGrid(y, m)
  const cats = useKind<Category>('category')
  const catMap = new Map(cats.map((c) => [c.id, c.data]))
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 text-xs text-ink-faint text-center border-b border-line">
        {DAYS_SHORT.map((d, i) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {rows.flat().map((d, i) => {
          if (!d) return <div key={'x' + i} className="min-h-[72px] border-b border-r border-line" />
          const f = ftn ? ftnMark(d, weekday(d)) : null
          const mark = marks.get(d)
          return (
            <div
              key={d}
              onClick={() => onAdd(d)}
              title={titleFor(d, mark, ftn)}
              className={cx('group min-h-[72px] md:min-h-[86px] border-b border-r border-line p-1 cursor-pointer hover:bg-paper-sunk/50 relative', f && 'text-stone-900')}
              style={f ? { background: f.color } : undefined}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cx(
                    'text-sm w-7 h-7 grid place-items-center rounded-full tabular',
                    d === today() && 'bg-accent text-white font-semibold',
                  )}
                >
                  {parse(d).getDate()}
                </span>
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

const START = { y: 2026, m: 10 } // 1. novembar 2026

function defaultAnchor() {
  const now = parse(today())
  const cur = { y: now.getFullYear(), m: now.getMonth() }
  return cur.y * 12 + cur.m < START.y * 12 + START.m ? START : cur
}

function loadFtn(): boolean {
  try {
    return localStorage.getItem('planer:ftn') === '1'
  } catch {
    return false
  }
}

export default function Kalendar({ param }: { param?: string }) {
  const [view, setView] = useState<View>(param === 'mesec' ? 'mesec' : 'godina')
  const [anchor, setAnchor] = useState(defaultAnchor)
  const [hidden, setHiddenState] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('planer:skriveno') || '[]')
    } catch {
      return []
    }
  })
  const setHidden = (v: string[]) => {
    setHiddenState(v)
    try {
      localStorage.setItem('planer:skriveno', JSON.stringify(v))
    } catch {
      /* nije bitno */
    }
  }
  const toggleHidden = (id: string) => setHidden(hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id])
  const [adding, setAdding] = useState<string | null>(null)
  const [ftn, setFtnState] = useState(loadFtn)
  const [newCat, setNewCat] = useState('')
  const setFtn = (v: boolean) => {
    setFtnState(v)
    try {
      localStorage.setItem('planer:ftn', v ? '1' : '0')
    } catch {
      /* nije bitno */
    }
  }
  const cats = useKind<Category>('category')
  const sortedCats = [...cats].sort((a, b) => a.data.order - b.data.order)

  const months: { y: number; m: number }[] = []
  const count = view === 'godina' ? 6 : 1
  for (let i = 0; i < count; i++) {
    const t = anchor.m + i
    months.push({ y: anchor.y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 })
  }
  const from = iso(new Date(months[0].y, months[0].m, 1))
  const last = months[months.length - 1]
  const to = iso(new Date(last.y, last.m + 1, 0))
  const marks = useMarks(from, to, hidden)

  const shift = (dir: number) => {
    const step = view === 'godina' ? 6 : 1
    const t = anchor.m + dir * step
    setAnchor({ y: anchor.y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 })
  }

  const title =
    view === 'godina'
      ? `${MONTHS[months[0].m]} ${months[0].y} – ${MONTHS[last.m]} ${last.y}`
      : `${MONTHS[anchor.m]} ${anchor.y}`

  const removeCat = (id: string, name: string) => {
    const evs = store.list<EventData>('event').filter((e) => e.data.categoryId === id)
    if (!confirm(evs.length ? `Obrisati „${name}“ i ${evs.length} upisa u kalendaru?` : `Obrisati „${name}“?`)) return
    for (const e of evs) store.remove(e.id)
    store.remove(id)
    if (hidden.includes(id)) setHidden(hidden.filter((x) => x !== id))
  }

  const addCat = () => {
    if (!newCat.trim()) return
    store.put<Category>('category', {
      name: newCat.trim(),
      color: distinctColor(cats.map((c) => c.data.color)),
      group: 'ostalo',
      order: cats.length + 1,
    })
    setNewCat('')
  }

  // FTN legenda: samo stavke koje se vide na ovim mesecima
  const visibleFtn = ftn
    ? FTN_LEGEND.filter((l) => {
        for (let d = from; d <= to; d = addDays(d, 1)) {
          const f = ftnMark(d, weekday(d))
          if (f && f.color === l.color) return true
        }
        return false
      })
    : []

  return (
    <div className="md:flex md:flex-col md:flex-1 md:min-h-0">
      <PageHeader
        title={<span className="capitalize">{title}</span>}
        right={
          <>
            <IconButton title="Nazad" onClick={() => shift(-1)}>
              <ChevronLeft size={18} />
            </IconButton>
            <Button variant="ghost" className="min-w-[80px]" onClick={() => setAnchor(defaultAnchor())} title="Vrati na početak">
              {(view === 'godina' ? `${MONTHS[months[0].m].slice(0, 3)}-${MONTHS[last.m].slice(0, 3)}` : MONTHS[anchor.m].slice(0, 3)).toLowerCase()}
            </Button>
            <IconButton title="Napred" onClick={() => shift(1)}>
              <ChevronRight size={18} />
            </IconButton>
            <Segmented<View>
              value={view}
              onChange={setView}
              options={[
                { value: 'godina', label: '6 meseci' },
                { value: 'mesec', label: 'Mesec' },
              ]}
            />
            <Button variant={ftn ? 'primary' : 'soft'} onClick={() => setFtn(!ftn)} title="Prikaži ispitne rokove, praznike i neradne dane sa FTN kalendara">
              FTN kalendar
            </Button>
          </>
        }
      />

      <div className="lg:flex gap-4 md:flex-1 md:min-h-0">
        <div className="flex-1 min-w-0 md:overflow-y-auto">
          {view === 'godina' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 max-w-5xl">
              {months.map((mm) => (
                <MiniMonth key={`${mm.y}-${mm.m}`} y={mm.y} m={mm.m} marks={marks} ftn={ftn} onPick={setAdding} />
              ))}
            </div>
          ) : (
            <MonthBig y={anchor.y} m={anchor.m} marks={marks} onAdd={setAdding} ftn={ftn} />
          )}
        </div>

        {/* Legenda */}
        <aside className="lg:w-56 shrink-0 mt-4 lg:mt-0 lg:overflow-y-auto">
          <Card className="p-3">
            <div className="text-sm font-semibold mb-2">Događaji</div>
            {sortedCats.length > 0 && (
              <div className="space-y-0 mb-2">
                {sortedCats.map((c) => (
                  <LegendRow
                    key={c.id}
                    off={hidden.includes(c.id)}
                    onClick={() => toggleHidden(c.id)}
                    label={c.data.name}
                    color={c.data.color}
                    onDelete={() => removeCat(c.id, c.data.name)}
                  />
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <input
                className="flex-1 min-w-0 text-sm py-1"
                placeholder="Novi događaj…"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCat()}
              />
              <Button className="px-2" onClick={addCat} disabled={!newCat.trim()} title="Dodaj događaj">
                <Plus size={15} />
              </Button>
            </div>
            {ftn && visibleFtn.length > 0 && (
              <>
                <div className="text-sm font-semibold mt-4 mb-2">FTN kalendar</div>
                <div className="space-y-1.5 text-xs text-ink-soft">
                  {visibleFtn.map((l) => (
                    <div key={l.key} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded shrink-0 border border-black/10" style={{ background: l.color }} />
                      <span>{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </aside>
      </div>

      <EventEditor open={!!adding} onClose={() => setAdding(null)} date={adding ?? undefined} />
    </div>
  )
}

function LegendRow({ off, onClick, label, color, onDelete }: { off: boolean; onClick: () => void; label: string; color?: string; onDelete?: () => void }) {
  return (
    <div className="flex items-center rounded-md hover:bg-paper-sunk/60">
      <button
        onClick={onClick}
        title={off ? 'Prikaži u kalendaru' : 'Sakrij iz kalendara'}
        className={cx('flex-1 min-w-0 flex items-center gap-2 px-1.5 py-0.5 text-sm text-left', off && 'opacity-35 line-through')}
      >
        {color && <Dot color={color} />}
        <span className="truncate">{label}</span>
      </button>
      {onDelete && (
        <button title="Obriši događaj" onClick={onDelete} className="px-1.5 text-ink-faint hover:text-rose-600">
          <X size={15} />
        </button>
      )}
    </div>
  )
}
