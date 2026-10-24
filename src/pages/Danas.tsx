import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useKind, useVersion } from '../lib/store'
import type { Category, EventData, GoalData } from '../lib/types'
import { addDays, fmtLong, fmtShort, inDays, today, daysBetween } from '../lib/dates'
import { occursOn, useSettings } from '../lib/logic'
import { goalProgress } from '../lib/goals'
import { PERIODS } from '../data/ftn'
import { go } from '../lib/router'
import { Card, Dot, cx } from '../ui/kit'
import { ObligationList } from '../ui/ObligationList'
import { EventEditor } from '../ui/EventEditor'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Laku noć'
  if (h < 11) return 'Dobro jutro'
  if (h < 18) return 'Dobar dan'
  return 'Dobro veče'
}

export default function Danas() {
  useVersion()
  const date = today()
  const [settings] = useSettings()
  const goals = useKind<GoalData>('goal').sort((a, b) => a.data.order - b.data.order)
  const events = useKind<EventData>('event')
  const cats = useKind<Category>('category')
  const [hideDone, setHideDone] = useState(true)
  const [adding, setAdding] = useState(false)

  // Uskoro: ispiti, kolokvijumi i ostalo sa fakulteta u narednih 60 dana
  const catMap = new Map(cats.map((c) => [c.id, c.data]))
  const horizon = addDays(date, 60)
  const upcoming: { date: string; title: string; sub?: string; color: string; id: string }[] = []
  for (const e of events) {
    if (e.data.repeat === 'yearly') {
      // rođendani i godišnjice: sledeće pojavljivanje
      let next = date.slice(0, 4) + e.data.date.slice(4)
      if (next < date) next = String(Number(date.slice(0, 4)) + 1) + e.data.date.slice(4)
      if (next <= addDays(date, 30)) {
        const c = e.data.categoryId ? catMap.get(e.data.categoryId) : undefined
        upcoming.push({ date: next, title: e.data.title, color: c?.color ?? '#f97316', id: e.id + next })
      }
      continue
    }
    if (e.data.repeat !== 'none') continue
    if (e.data.date < date || e.data.date > horizon) continue
    const c = e.data.categoryId ? catMap.get(e.data.categoryId) : undefined
    const important = c?.group === 'fakultet' || /ispit|kolokv|klk|rok|predaja|odbrana|rođendan|rodjendan/i.test(e.data.title) || !!e.data.endDate
    if (!important) continue
    upcoming.push({
      date: e.data.date,
      title: e.data.title,
      sub: c && c.group === 'fakultet' && !e.data.title.includes(c.name) ? c.name : undefined,
      color: c?.color ?? '#64748b',
      id: e.id,
    })
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date))
  const nextPeriod = PERIODS.filter((p) => p.kind === 'rok' && p.to >= date).sort((a, b) => a.from.localeCompare(b.from))[0]
  const onTrip = events.find((e) => e.data.endDate && occursOn(e.data, date))

  return (
    <div className="md:flex md:flex-col md:flex-1 md:min-h-0">
      {/* Zaglavlje + ciljevi u jednom redu */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 mb-3">
        <div>
          <div className="text-xs text-ink-faint">{fmtLong(date)}</div>
          <h1 className="text-xl font-semibold tracking-tight">
            {greeting()}
            {settings.name ? `, ${settings.name}` : ''}
            {onTrip && <span className="text-sm font-normal text-violet-600 ml-2">· na putu: {onTrip.data.title}</span>}
          </h1>
        </div>
        {goals.length > 0 ? (
          <button onClick={() => go('ciljevi')} className="flex flex-wrap gap-x-5 gap-y-1 text-left" title="Ciljevi">
            {goals.map((g) => {
              const p = goalProgress(g.data)
              return (
                <div key={g.id} className="w-36">
                  <div className="flex justify-between text-xs text-ink-soft">
                    <span className="truncate">{g.data.title}</span>
                    <span className="tabular shrink-0 ml-1">{Math.round(p.pct)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-paper-sunk overflow-hidden mt-0.5">
                    <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: g.data.color ?? 'rgb(var(--accent))' }} />
                  </div>
                  <div className="text-xs text-ink-faint tabular truncate mt-0.5">{p.text}</div>
                </div>
              )
            })}
          </button>
        ) : (
          <a href="#/ciljevi" className="text-xs text-accent">
            + Postavi ciljeve
          </a>
        )}
      </header>

      <div className="md:flex-1 md:min-h-0 grid md:grid-cols-[1fr_300px] gap-4">
        {/* Obaveze */}
        <Card className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Obaveze za danas</h2>
            <div className="flex items-center gap-3 text-xs">
              <button onClick={() => setHideDone(!hideDone)} className="text-ink-soft hover:text-ink">
                {hideDone ? 'Prikaži urađeno' : 'Sakrij urađeno'}
              </button>
              <button onClick={() => setAdding(true)} className="text-accent inline-flex items-center gap-0.5">
                <Plus size={13} /> Dodaj
              </button>
              <a href="#/dan" className="text-ink-soft hover:text-ink">
                Po satima →
              </a>
            </div>
          </div>
          <div className="px-4 pb-2 md:overflow-y-auto md:min-h-0 md:flex-1">
            <ObligationList date={date} hideDone={hideDone} />
          </div>
        </Card>

        {/* Uskoro */}
        <Card className="flex flex-col min-h-0">
          <div className="px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Uskoro</h2>
          </div>
          <div className="px-4 pb-2 md:overflow-y-auto md:min-h-0 md:flex-1">
            {upcoming.length === 0 && !nextPeriod ? (
              <div className="text-sm text-ink-faint py-3">Ništa važno u narednih 60 dana.</div>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((u) => {
                  const d = daysBetween(date, u.date)
                  return (
                    <li key={u.id} className="flex items-center gap-2.5 py-2 cursor-pointer" onClick={() => go('dan', u.date)}>
                      <Dot color={u.color} size={8} />
                      <div className="flex-1 min-w-0">
                        <div className="text-base leading-tight truncate">{u.title}</div>
                        <div className="text-xs text-ink-faint truncate">
                          {fmtShort(u.date)}
                          {u.sub && ` · ${u.sub}`}
                        </div>
                      </div>
                      <span className={cx('text-xs tabular shrink-0', d <= 3 ? 'text-rose-600 font-semibold' : d <= 7 ? 'text-amber-600' : 'text-ink-faint')}>
                        {inDays(u.date)}
                      </span>
                    </li>
                  )
                })}
                {nextPeriod && (
                  <li className="flex items-center gap-2.5 py-2">
                    <span className="w-2 h-2 rounded-full tint ring-1 ring-line" style={{ '--tint': nextPeriod.tint } as React.CSSProperties} />
                    <div className="flex-1 min-w-0">
                      <div className="text-base leading-tight truncate">{nextPeriod.name}</div>
                      <div className="text-xs text-ink-faint">
                        {fmtShort(nextPeriod.from)} – {fmtShort(nextPeriod.to)}
                      </div>
                    </div>
                    <span className="text-xs tabular text-ink-faint shrink-0">{nextPeriod.from <= date ? 'u toku' : inDays(nextPeriod.from)}</span>
                  </li>
                )}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <EventEditor open={adding} onClose={() => setAdding(false)} date={date} />
    </div>
  )
}
