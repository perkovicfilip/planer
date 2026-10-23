import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, MapPin } from 'lucide-react'
import { useKind, useVersion } from '../lib/store'
import type { Category, EventData, Item, SubjectData } from '../lib/types'
import { addDays, fmtLong, relDay, toMin, today, fromMin, nowMin, DAYS_SHORT } from '../lib/dates'
import { classesOn, eventsOn, planFor, useWeekPlan, workoutTitle } from '../lib/logic'
import { go } from '../lib/router'
import { MAKEUPS, MILESTONES, periodsOn } from '../data/ftn'
import { Button, Card, IconButton, PageHeader, SectionTitle, cx } from '../ui/kit'
import { EventEditor } from '../ui/EventEditor'
import { ObligationList } from '../ui/ObligationList'

const START_H = 5
const END_H = 24
const PX = 56 // piksela po satu

interface Block {
  key: string
  title: string
  sub?: string
  from: number
  to: number
  color: string
  faint?: boolean
  onClick?: () => void
}

function layout(blocks: Block[]) {
  const sorted = [...blocks].sort((a, b) => a.from - b.from || b.to - a.to)
  const out: (Block & { col: number; cols: number })[] = []
  let cluster: (Block & { col: number; cols: number })[] = []
  let clusterEnd = -1
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1))
    cluster.forEach((c) => (c.cols = cols))
    out.push(...cluster)
    cluster = []
  }
  for (const b of sorted) {
    if (b.from >= clusterEnd && cluster.length) flush()
    const used = new Set(cluster.filter((c) => c.to > b.from).map((c) => c.col))
    let col = 0
    while (used.has(col)) col++
    cluster.push({ ...b, col, cols: 1 })
    clusterEnd = Math.max(clusterEnd, b.to)
  }
  if (cluster.length) flush()
  return out
}

export default function Dan({ param }: { param?: string }) {
  useVersion()
  const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : today()
  const events = useKind<EventData>('event')
  const cats = useKind<Category>('category')
  const subjects = useKind<SubjectData>('subject')
  const [plan] = useWeekPlan()
  const [showAllClasses, setShowAllClasses] = useState(false)
  const [editor, setEditor] = useState<{ id?: string; start?: string } | null>(null)

  const catMap = useMemo(() => new Map(cats.map((c) => [c.id, c.data])), [cats])
  const dayEvents = eventsOn(events, date)
  const timed = dayEvents.filter((e) => e.data.start)
  const untimed = dayEvents.filter((e) => !e.data.start)

  const blocks: Block[] = []
  for (const e of timed) {
    const from = toMin(e.data.start!)
    const to = e.data.end ? Math.max(from + 20, toMin(e.data.end)) : from + 60
    const c = e.data.categoryId ? catMap.get(e.data.categoryId) : undefined
    blocks.push({
      key: e.id,
      title: e.data.title,
      sub: `${e.data.start}${e.data.end ? '–' + e.data.end : ''}${c ? ' · ' + c.name : ''}`,
      from,
      to,
      color: c?.color ?? '#64748b',
      onClick: () => setEditor({ id: e.id }),
    })
  }
  for (const cl of classesOn(date, subjects, showAllClasses)) {
    const subj = cl.subjectId ? subjects.find((s) => s.id === cl.subjectId) : undefined
    const c = subj?.data.categoryId ? catMap.get(subj.data.categoryId) : undefined
    blocks.push({
      key: `${cl.subject}-${cl.type}-${cl.from}`,
      title: `${cl.name} (${cl.type === 'pred' ? 'P' : 'V'})`,
      sub: `${cl.from}–${cl.to} · ${cl.room}`,
      from: toMin(cl.from),
      to: toMin(cl.to),
      color: c?.color ?? '#6366f1',
      faint: !cl.attending,
    })
  }
  const day = planFor(date, plan)
  if (day.activity !== 'odmor') {
    const from = toMin(day.time)
    blocks.push({
      key: 'trening',
      title: workoutTitle(day),
      sub: `${day.time}–${fromMin(from + day.duration)}`,
      from,
      to: from + day.duration,
      color: day.activity === 'plivanje' ? '#06b6d4' : '#10b981',
      onClick: () => go('trening', date),
    })
  }
  const laid = layout(blocks)
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i)
  const isToday = date === today()
  const nowTop = ((nowMin() - START_H * 60) / 60) * PX

  const periods = periodsOn(date)
  const makeup = MAKEUPS.find((m) => m.date === date)
  const milestone = MILESTONES.find((m) => m.date === date)
  const multiDay = untimed.filter((e) => e.data.endDate && e.data.endDate !== e.data.date)
  const plainUntimed = untimed.filter((e) => !(e.data.endDate && e.data.endDate !== e.data.date))

  return (
    <div>
      <PageHeader
        title={relDay(date)}
        sub={fmtLong(date)}
        right={
          <Button variant="primary" onClick={() => setEditor({})}>
            <Plus size={16} /> Dodaj
          </Button>
        }
      />
      <div className="flex items-center gap-1 mb-4">
        <IconButton title="Prethodni dan" onClick={() => go('dan', addDays(date, -1))}>
          <ChevronLeft size={18} />
        </IconButton>
        <Button variant="ghost" onClick={() => go('dan', today())}>
          Danas
        </Button>
        <IconButton title="Sledeći dan" onClick={() => go('dan', addDays(date, 1))}>
          <ChevronRight size={18} />
        </IconButton>
        <input type="date" value={date} onChange={(e) => e.target.value && go('dan', e.target.value)} className="ml-2 py-1.5 text-sm" />
      </div>

      {(periods.length > 0 || makeup || milestone || multiDay.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {periods.map((p) => (
            <span
              key={p.id}
              className={cx('text-xs px-2.5 py-1 rounded-full border border-line', p.tint && 'tint', p.kind === 'neradni' && 'text-rose-600')}
              style={p.tint ? ({ '--tint': p.tint } as React.CSSProperties) : undefined}
            >
              {p.name}
            </span>
          ))}
          {makeup && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              Nadoknada: nastava po rasporedu za {DAYS_SHORT[makeup.asWeekday]}
            </span>
          )}
          {milestone && <span className="text-xs px-2.5 py-1 rounded-full bg-paper-sunk">{milestone.name}</span>}
          {multiDay.map((e) => {
            const c = e.data.categoryId ? catMap.get(e.data.categoryId) : undefined
            return (
              <button
                key={e.id}
                onClick={() => setEditor({ id: e.id })}
                className="text-xs px-2.5 py-1 rounded-full text-white inline-flex items-center gap-1"
                style={{ background: c?.color ?? '#8b5cf6' }}
              >
                <MapPin size={12} /> {e.data.title}
              </button>
            )
          })}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_340px] gap-6">
        <div>
          {plainUntimed.length > 0 && (
            <div className="mb-3">
              <SectionTitle>Bez tačnog vremena</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {plainUntimed.map((e) => (
                  <UntimedChip key={e.id} e={e} color={(e.data.categoryId && catMap.get(e.data.categoryId)?.color) || '#64748b'} onClick={() => setEditor({ id: e.id })} />
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <SectionTitle>Raspored dana</SectionTitle>
            <label className="text-xs text-ink-soft flex items-center gap-1.5 mb-2">
              <input type="checkbox" checked={showAllClasses} onChange={(e) => setShowAllClasses(e.target.checked)} />
              Svi časovi
            </label>
          </div>
          <Card className="relative overflow-hidden">
            <div className="relative" style={{ height: hours.length * PX }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-line/70 cursor-pointer hover:bg-paper-sunk/40"
                  style={{ top: i * PX, height: PX }}
                  onClick={() => setEditor({ start: `${String(h).padStart(2, '0')}:00` })}
                >
                  <span className="absolute left-2 -top-[1px] text-[11px] text-ink-faint tabular bg-paper-raised pr-1">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
              <div className="absolute top-0 bottom-0 left-14 right-2 pointer-events-none">
                {laid.map((b) => {
                  const top = ((b.from - START_H * 60) / 60) * PX
                  const h = Math.max(22, ((b.to - b.from) / 60) * PX - 2)
                  return (
                    <div
                      key={b.key}
                      onClick={b.onClick}
                      className={cx(
                        'absolute rounded-lg px-2 py-1 text-xs overflow-hidden pointer-events-auto border-l-4',
                        b.onClick && 'cursor-pointer',
                        b.faint ? 'opacity-40' : '',
                      )}
                      style={{
                        top: top + 1,
                        height: h,
                        left: `calc(${(b.col / b.cols) * 100}% + 2px)`,
                        width: `calc(${100 / b.cols}% - 4px)`,
                        background: `color-mix(in srgb, ${b.color} 16%, rgb(var(--paper-raised)))`,
                        borderColor: b.color,
                      }}
                    >
                      <div className="font-medium truncate">{b.title}</div>
                      {h > 34 && <div className="text-ink-soft truncate">{b.sub}</div>}
                    </div>
                  )
                })}
              </div>
              {isToday && nowTop > 0 && nowTop < hours.length * PX && (
                <div className="absolute left-12 right-0 pointer-events-none" style={{ top: nowTop }}>
                  <div className="h-[2px] bg-rose-500 relative">
                    <span className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-rose-500" />
                  </div>
                </div>
              )}
            </div>
          </Card>
          <p className="text-xs text-ink-faint mt-2">Klikni na prazno mesto da dodaš nešto u to vreme.</p>
        </div>

        <div className="mt-6 lg:mt-0">
          <SectionTitle>Obaveze</SectionTitle>
          <Card className="px-4 py-2">
            <ObligationList date={date} />
          </Card>
        </div>
      </div>

      <EventEditor open={!!editor} onClose={() => setEditor(null)} eventId={editor?.id} date={date} start={editor?.start} />
    </div>
  )
}

function UntimedChip({ e, color, onClick }: { e: Item<EventData>; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm px-3 py-1.5 rounded-full border border-line bg-paper-raised inline-flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {e.data.title}
    </button>
  )
}
