import { useState } from 'react'
import { ArrowRight, Plus, Send } from 'lucide-react'
import { store, useKind, useVersion } from '../lib/store'
import type { Category, EventData, GoalData, HabitData, MealDayData, NoteData } from '../lib/types'
import { addDays, fmtLong, fmtShort, inDays, today, daysBetween } from '../lib/dates'
import { expectedTimes, fmtTime, mealDayFor, occursOn, streak, totals, useSettings, useWeekPlan } from '../lib/logic'
import { goalProgress } from '../lib/goals'
import { PERIODS } from '../data/ftn'
import { go } from '../lib/router'
import { Button, Card, Dot, Progress, SectionTitle, cx } from '../ui/kit'
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
  const [plan] = useWeekPlan()
  const goals = useKind<GoalData>('goal').sort((a, b) => a.data.order - b.data.order)
  const events = useKind<EventData>('event')
  const cats = useKind<Category>('category')
  const habits = useKind<HabitData>('habit').filter((h) => !h.data.hidden)
  const [hideDone, setHideDone] = useState(true)
  const [adding, setAdding] = useState(false)
  const [note, setNote] = useState('')

  const md = mealDayFor(date)
  const meals = md?.data.meals ?? []
  const t = totals(meals)
  const exp = expectedTimes(date, meals, settings, plan)
  const nextIdx = meals.findIndex((m) => !m.eatenAt)

  // Uskoro: događaji u narednih 60 dana iz kategorija sa fakulteta + sve sa naslovom ispit/kolokvijum
  const catMap = new Map(cats.map((c) => [c.id, c.data]))
  const horizon = addDays(date, 60)
  const upcoming: { date: string; title: string; color: string; id: string }[] = []
  for (const e of events) {
    if (e.data.repeat !== 'none') continue
    if (e.data.date < date || e.data.date > horizon) continue
    const c = e.data.categoryId ? catMap.get(e.data.categoryId) : undefined
    const important = c?.group === 'fakultet' || /ispit|kolokv|klk|rok|predaja|odbrana/i.test(e.data.title)
    if (!important) continue
    upcoming.push({ date: e.data.date, title: e.data.title + (c && c.group === 'fakultet' && !e.data.title.includes(c.name) ? ` · ${c.name}` : ''), color: c?.color ?? '#64748b', id: e.id })
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date))
  const nextPeriod = PERIODS.filter((p) => p.kind === 'rok' && p.to >= date).sort((a, b) => a.from.localeCompare(b.from))[0]
  const onTrip = events.find((e) => e.data.endDate && occursOn(e.data, date))

  const addNote = () => {
    if (!note.trim()) return
    store.put<NoteData>('note', { text: note.trim(), done: false })
    setNote('')
  }

  return (
    <div>
      <header className="mb-5">
        <div className="text-sm text-ink-soft">{fmtLong(date)}</div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {greeting()}
          {settings.name ? `, ${settings.name}` : ''}
        </h1>
        {onTrip && <div className="text-sm text-violet-600 mt-1">Na putu: {onTrip.data.title}</div>}
      </header>

      {/* Ciljevi */}
      <section className="mb-6">
        <SectionTitle action={<a href="#/ciljevi" className="text-xs text-accent">Izmeni</a>}>Ciljevi za ovu godinu</SectionTitle>
        {goals.length === 0 ? (
          <Card className="p-4 flex items-center justify-between gap-3">
            <span className="text-sm text-ink-soft">Postavi ciljeve — kilaža, ESPB, novac — i pratiće se sami.</span>
            <Button variant="primary" onClick={() => go('ciljevi')}>
              Postavi
            </Button>
          </Card>
        ) : (
          <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 snap-x">
            {goals.map((g) => {
              const p = goalProgress(g.data)
              const left = g.data.deadline ? daysBetween(date, g.data.deadline) : null
              return (
                <Card key={g.id} className="p-4 min-w-[220px] snap-start" onClick={() => go('ciljevi')}>
                  <div className="text-sm font-medium truncate">{g.data.title}</div>
                  <div className="text-xl font-semibold tabular mt-1">{p.text}</div>
                  <div className="mt-2">
                    <Progress value={p.pct} max={100} color={g.data.color} />
                  </div>
                  <div className="text-xs text-ink-faint mt-1.5 tabular">
                    {Math.round(p.pct)}%{left !== null && left >= 0 ? ` · još ${left} dana` : ''}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <div className="lg:grid lg:grid-cols-[1fr_360px] gap-6">
        <section className="mb-6">
          <SectionTitle
            action={
              <div className="flex items-center gap-3">
                <button onClick={() => setHideDone(!hideDone)} className="text-xs text-ink-soft">
                  {hideDone ? 'Prikaži urađeno' : 'Sakrij urađeno'}
                </button>
                <button onClick={() => setAdding(true)} className="text-xs text-accent inline-flex items-center gap-0.5">
                  <Plus size={13} /> Dodaj
                </button>
              </div>
            }
          >
            Danas
          </SectionTitle>
          <Card className="px-4 py-2">
            <ObligationList date={date} hideDone={hideDone} />
          </Card>
          <a href="#/dan" className="inline-flex items-center gap-1 text-sm text-accent mt-2">
            Raspored po satima <ArrowRight size={14} />
          </a>
        </section>

        <div className="space-y-6">
          {/* Ishrana */}
          <section>
            <SectionTitle action={<a href="#/ishrana" className="text-xs text-accent">Otvori</a>}>Ishrana</SectionTitle>
            <Card className="p-4" onClick={() => go('ishrana')}>
              <div className="flex justify-between text-sm mb-1">
                <span>Kalorije</span>
                <span className="tabular text-ink-soft">
                  {t.kcal} / {settings.kcalGoal}
                </span>
              </div>
              <Progress value={t.kcal} max={settings.kcalGoal} color="#f59e0b" />
              <div className="flex justify-between text-sm mb-1 mt-3">
                <span>Proteini</span>
                <span className="tabular text-ink-soft">
                  {t.protein} / {settings.proteinGoal} g
                </span>
              </div>
              <Progress value={t.protein} max={settings.proteinGoal} color="#e11d48" />
              <div className="text-xs text-ink-faint mt-3">
                {meals.length === 0
                  ? 'Nemaš plan obroka za danas — dodaj ga u Ishrani.'
                  : nextIdx === -1
                    ? 'Svi obroci za danas su pojedeni.'
                    : `Sledeći: ${meals[nextIdx].name} oko ${fmtTime(exp[nextIdx])}`}
              </div>
            </Card>
          </section>

          {/* Uskoro */}
          <section>
            <SectionTitle>Uskoro</SectionTitle>
            <Card className="px-4 py-2">
              {upcoming.length === 0 && !nextPeriod ? (
                <div className="text-sm text-ink-faint py-3">Ništa važno u narednih 60 dana.</div>
              ) : (
                <ul className="divide-y divide-line">
                  {upcoming.slice(0, 6).map((u) => (
                    <li key={u.id} className="flex items-center gap-3 py-2.5 cursor-pointer" onClick={() => go('dan', u.date)}>
                      <Dot color={u.color} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{u.title}</div>
                        <div className="text-xs text-ink-faint">{fmtShort(u.date)}</div>
                      </div>
                      <span className={cx('text-xs tabular', daysBetween(date, u.date) <= 7 ? 'text-rose-600 font-medium' : 'text-ink-soft')}>
                        {inDays(u.date)}
                      </span>
                    </li>
                  ))}
                  {nextPeriod && (
                    <li className="flex items-center gap-3 py-2.5">
                      <span className="w-2.5 h-2.5 rounded-full tint border border-line" style={{ '--tint': nextPeriod.tint } as React.CSSProperties} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{nextPeriod.name}</div>
                        <div className="text-xs text-ink-faint">
                          {fmtShort(nextPeriod.from)} – {fmtShort(nextPeriod.to)}
                        </div>
                      </div>
                      <span className="text-xs tabular text-ink-soft">{nextPeriod.from <= date ? 'u toku' : inDays(nextPeriod.from)}</span>
                    </li>
                  )}
                </ul>
              )}
            </Card>
          </section>

          {/* Navike */}
          {habits.length > 0 && (
            <section>
              <SectionTitle action={<a href="#/navike" className="text-xs text-accent">Sve</a>}>Nizovi</SectionTitle>
              <Card className="px-4 py-2">
                <ul className="divide-y divide-line">
                  {habits.map((h) => (
                    <li key={h.id} className="flex items-center gap-3 py-2">
                      <Dot color={h.data.color} />
                      <span className="flex-1 text-sm truncate">{h.data.alias || h.data.name}</span>
                      <span className="text-sm font-semibold tabular">{streak(h.data)}</span>
                      <span className="text-xs text-ink-faint">dana</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}

          {/* Brza beleška */}
          <section>
            <SectionTitle action={<a href="#/beleske" className="text-xs text-accent">Sve beleške</a>}>Brza beleška</SectionTitle>
            <div className="flex gap-2">
              <input
                className="flex-1"
                placeholder="Ubaci misao, sredi kasnije…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
              />
              <Button variant="primary" onClick={addNote} disabled={!note.trim()} title="Sačuvaj">
                <Send size={16} />
              </Button>
            </div>
          </section>
        </div>
      </div>

      <EventEditor open={adding} onClose={() => setAdding(false)} date={date} />
    </div>
  )
}
