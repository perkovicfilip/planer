import { Fragment, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown, Pencil, Check, RotateCcw, X } from 'lucide-react'
import { store, useKind, useVersion } from '../lib/store'
import type { ActivityData, ExerciseData, Item, LoggedSet, WorkoutData } from '../lib/types'
import { DAYS_LONG, DAYS_SHORT, addDays, fmtLong, iso, parse, today, weekStart, MONTHS_GEN } from '../lib/dates'
import {
  activitiesOn,
  dayState,
  isChanged,
  isDone,
  lastSets,
  resetDay,
  setDayActivities,
  setDayWorkout,
  setSets,
  setsFor,
  toggleDone,
  workoutFor,
  listActivities,
} from '../lib/activities'
import { Button, Card, ColorPicker, Empty, Field, IconButton, Modal, PageHeader, cx } from '../ui/kit'

// ======================================================================
// Trening: nedeljni raspored aktivnosti + treninzi + traka dana
// ======================================================================

export default function Trening() {
  useVersion()
  const acts = useKind<ActivityData>('activity').sort((a, b) => a.data.order - b.data.order)
  const [week, setWeek] = useState(weekStart(today()))
  const [openDay, setOpenDay] = useState<{ date: string; actId: string } | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showWorkouts, setShowWorkouts] = useState(false)
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const end = addDays(week, 6)
  const label = (() => {
    const a = parse(week)
    const b = parse(end)
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()}–${b.getDate()}. ${MONTHS_GEN[a.getMonth()]}`
      : `${a.getDate()}. ${MONTHS_GEN[a.getMonth()]} – ${b.getDate()}. ${MONTHS_GEN[b.getMonth()]}`
  })()

  const addForDay = (date: string, actId: string) => {
    const current = activitiesOn(date).map((a) => a.id)
    // zadrži redosled kolona
    const order = acts.map((a) => a.id).filter((id) => id === actId || current.includes(id))
    setDayActivities(date, order)
  }

  return (
    <div className="md:flex md:flex-col md:flex-1 md:min-h-0">
      <PageHeader
        title="Trening"
        right={
          <>
            <Button onClick={() => setShowWorkouts(true)}>Moji treninzi</Button>
            <Button onClick={() => setShowSchedule(true)}>Podesi raspored</Button>
          </>
        }
      />

      <div className="flex items-center gap-1 mb-2">
        <IconButton title="Prethodna nedelja" onClick={() => setWeek(addDays(week, -7))}>
          <ChevronLeft size={18} />
        </IconButton>
        <span className="text-sm font-semibold min-w-[160px] text-center">{label}</span>
        <IconButton title="Sledeća nedelja" onClick={() => setWeek(addDays(week, 7))}>
          <ChevronRight size={18} />
        </IconButton>
        {week !== weekStart(today()) && (
          <Button variant="ghost" onClick={() => setWeek(weekStart(today()))}>
            Ova nedelja
          </Button>
        )}
      </div>

      <div className="md:flex-1 md:min-h-0 overflow-auto">
        {acts.length === 0 ? (
          <Card>
            <Empty>Nema aktivnosti — klikni „Podesi raspored“ i dodaj ih.</Empty>
          </Card>
        ) : (
          <div
            className="grid gap-1.5 min-w-[560px]"
            style={{ gridTemplateColumns: `minmax(90px, 120px) repeat(${acts.length}, minmax(100px, 1fr))` }}
          >
            {/* zaglavlje */}
            <div />
            {acts.map((a) => (
              <div key={a.id} className="flex items-center justify-center gap-1.5 py-1 font-semibold text-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: a.data.color }} />
                <span className="truncate">{a.data.name}</span>
              </div>
            ))}

            {/* redovi = dani */}
            {days.map((d, i) => {
              const scheduled = new Set(activitiesOn(d).map((a) => a.id))
              const isToday = d === today()
              const past = d < today()
              return (
                <Fragment key={d}>
                  <div className={cx('flex flex-col justify-center px-2 rounded-lg', isToday && 'bg-accent-soft')}>
                    <span className={cx('font-semibold', isToday && 'text-accent')}>{DAYS_LONG[i]}</span>
                    <span className="text-xs text-ink-faint">
                      {parse(d).getDate()}. {MONTHS_GEN[parse(d).getMonth()]}
                      {isChanged(d) && (
                        <button onClick={() => resetDay(d)} className="ml-1 text-accent" title="Vrati podrazumevani raspored za ovaj dan">
                          · vrati
                        </button>
                      )}
                    </span>
                  </div>
                  {acts.map((a) => {
                    if (!scheduled.has(a.id))
                      return (
                        <button
                          key={a.id}
                          onClick={() => addForDay(d, a.id)}
                          title="Nije predviđeno — klikni da dodaš samo za ovaj dan"
                          className="group h-14 rounded-xl border border-dashed border-line grid place-items-center text-ink-faint/60 hover:text-accent hover:border-accent"
                        >
                          <span className="text-xl leading-none group-hover:hidden">×</span>
                          <span className="text-xs hidden group-hover:inline">+ dodaj</span>
                        </button>
                      )
                    const done = isDone(d, a.id)
                    const w = workoutFor(d, a)
                    return (
                      <div
                        key={a.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleDone(d, a.id)}
                        onKeyDown={(e) => e.key === 'Enter' && toggleDone(d, a.id)}
                        className={cx(
                          'group relative h-14 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer select-none transition active:scale-[0.98]',
                          done ? 'meal-done' : past ? 'meal-todo' : 'border-line bg-paper-raised hover:border-ink-faint',
                        )}
                        title={done ? 'Urađeno — klikni da poništiš' : 'Klikni kad uradiš'}
                      >
                        <span className="text-sm font-semibold">{done ? '✓' : ''}</span>
                        {w && <span className="text-xs text-ink-soft truncate max-w-full px-1">{w.data.name}</span>}
                        <button
                          aria-label="Detalji"
                          title="Detalji (vežbe, serije, izmena za ovaj dan)"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenDay({ date: d, actId: a.id })
                          }}
                          className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-md text-ink-faint opacity-0 group-hover:opacity-100 hover:bg-black/5"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )
                  })}
                </Fragment>
              )
            })}
          </div>
        )}
      </div>

      <ActivityStrip />

      <DayActivityModal key={openDay ? openDay.date + openDay.actId : 'none'} target={openDay} onClose={() => setOpenDay(null)} />
      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} wide tall={false} title="Nedeljni raspored po danima">
        <ActivitiesCard />
      </Modal>
      <Modal open={showWorkouts} onClose={() => setShowWorkouts(false)} wide tall={false} title="Moji treninzi">
        <WorkoutsCard />
      </Modal>
    </div>
  )
}

// ---------------- Aktivnosti i njihovi dani ----------------

function ActivitiesCard() {
  const acts = useKind<ActivityData>('activity').sort((a, b) => a.data.order - b.data.order)
  const workouts = useKind<WorkoutData>('workout').sort((a, b) => a.data.order - b.data.order)
  const [edit, setEdit] = useState<Item<ActivityData> | 'new' | null>(null)
  const toggleDay = (a: Item<ActivityData>, d: number) =>
    store.update<ActivityData>(a.id, (x) => ({
      ...x,
      days: x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d].sort(),
    }))
  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="primary" onClick={() => setEdit('new')}>
          <Plus size={15} /> Aktivnost
        </Button>
      </div>
      {acts.length === 0 && <Empty>Dodaj prvu aktivnost — npr. teretana, plivanje, trčanje.</Empty>}
      <div className="space-y-3">
        {acts.map((a) => (
          <div key={a.id}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ background: a.data.color }} />
              <span className="font-medium flex-1">{a.data.name}</span>
              <IconButton title="Izmeni" onClick={() => setEdit(a)} className="w-7 h-7">
                <Pencil size={13} />
              </IconButton>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_SHORT.map((n, d) => {
                const on = a.data.days.includes(d)
                const wid = a.data.dayWorkouts?.[String(d)]
                return (
                  <div key={d} className="flex flex-col gap-0.5">
                    <button
                      onClick={() => toggleDay(a, d)}
                      className={cx('py-1 rounded-md text-xs font-medium border transition', on ? 'text-white border-transparent' : 'border-line text-ink-faint hover:bg-paper-sunk')}
                      style={on ? { background: a.data.color } : undefined}
                    >
                      {n}
                    </button>
                    {on && workouts.length > 0 && (a.data.usesWorkouts || !!a.data.dayWorkouts?.[String(d)]) && (
                      <select
                        className="text-[0.7rem] px-0.5 py-0.5 rounded-md"
                        value={wid ?? ''}
                        title="Trening za ovaj dan"
                        onChange={(e) =>
                          store.update<ActivityData>(a.id, (x) => {
                            const dw = { ...(x.dayWorkouts ?? {}) }
                            if (e.target.value) dw[String(d)] = e.target.value
                            else delete dw[String(d)]
                            return { ...x, dayWorkouts: dw }
                          })
                        }
                      >
                        <option value="">—</option>
                        {workouts.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.data.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <ActivityEditor item={edit} count={acts.length} onClose={() => setEdit(null)} />
    </div>
  )
}

function ActivityEditor({ item, count, onClose }: { item: Item<ActivityData> | 'new' | null; count: number; onClose: () => void }) {
  const existing = item && item !== 'new' ? item : undefined
  const blank = (): ActivityData => ({ name: '', color: '#10b981', days: [], order: count + 1 })
  const [d, setD] = useState<ActivityData>(blank())
  const [last, setLast] = useState<typeof item>(null)
  if (item !== last) {
    setLast(item)
    setD(existing?.data ?? blank())
  }
  const toggle = (x: number) => setD({ ...d, days: d.days.includes(x) ? d.days.filter((y) => y !== x) : [...d.days, x].sort() })
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={existing ? 'Izmeni aktivnost' : 'Nova aktivnost'}
      footer={
        <>
          {existing && (
            <Button
              variant="ghost"
              className="mr-auto text-rose-600"
              onClick={() => {
                store.remove(existing.id)
                onClose()
              }}
            >
              <Trash2 size={15} /> Obriši
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!d.name.trim()}
            onClick={() => {
              const data = { ...d, name: d.name.trim() }
              if (existing) store.update<ActivityData>(existing.id, () => data)
              else store.put<ActivityData>('activity', data)
              onClose()
            }}
          >
            Sačuvaj
          </Button>
        </>
      }
    >
      <Field label="Naziv">
        <input autoFocus className="w-full" placeholder="npr. Teretana, Plivanje, Trčanje, Bicikl…" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
      </Field>
      <Field label="Dani u nedelji">
        <div className="grid grid-cols-7 gap-1">
          {DAYS_SHORT.map((n, x) => (
            <button
              key={x}
              type="button"
              onClick={() => toggle(x)}
              className={cx('py-2 rounded-lg text-sm border', d.days.includes(x) ? 'text-white border-transparent' : 'border-line text-ink-soft')}
              style={d.days.includes(x) ? { background: d.color } : undefined}
            >
              {n}
            </button>
          ))}
        </div>
        <button type="button" className="text-xs text-accent mt-1.5" onClick={() => setD({ ...d, days: [0, 1, 2, 3, 4, 5, 6] })}>
          Svaki dan
        </button>
      </Field>
      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" checked={!!d.usesWorkouts} onChange={(e) => setD({ ...d, usesWorkouts: e.target.checked })} />
        Ima treninge sa vežbama (npr. teretana — Push, Pull, Legs)
      </label>
      <Field label="Boja">
        <ColorPicker value={d.color} onChange={(c) => setD({ ...d, color: c })} />
      </Field>
    </Modal>
  )
}

// ---------------- Treninzi (Push, Pull, Legs…) ----------------

function WorkoutsCard() {
  const workouts = useKind<WorkoutData>('workout').sort((a, b) => a.data.order - b.data.order)
  const exercises = useKind<ExerciseData>('exercise')
  const exName = (id: string) => exercises.find((e) => e.id === id)?.data.name ?? '?'
  const [edit, setEdit] = useState<string | 'new' | null>(null)
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold">Moji treninzi</div>
          <div className="text-xs text-ink-faint">Vežbe, serije i ponavljanja. Dodeli ih danima levo.</div>
        </div>
        <Button variant="primary" onClick={() => setEdit('new')}>
          <Plus size={15} /> Trening
        </Button>
      </div>
      {workouts.length === 0 && <Empty>Napravi npr. „Push“, „Pull“, „Legs“.</Empty>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {workouts.map((w) => (
          <button key={w.id} onClick={() => setEdit(w.id)} className="text-left rounded-lg border border-line p-2.5 hover:border-ink-faint">
            <div className="font-medium mb-1">{w.data.name}</div>
            <ul className="text-xs text-ink-soft space-y-0.5">
              {w.data.exercises.map((e, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{exName(e.exerciseId)}</span>
                  <span className="tabular text-ink-faint shrink-0">
                    {e.sets}×{e.reps}
                  </span>
                </li>
              ))}
              {w.data.exercises.length === 0 && <li className="text-ink-faint">bez vežbi</li>}
            </ul>
          </button>
        ))}
      </div>
      <WorkoutEditor id={edit} onClose={() => setEdit(null)} count={workouts.length} />
    </div>
  )
}

// ---------------- Jedan dan / jedna aktivnost ----------------

function DayActivityModal({ target, onClose }: { target: { date: string; actId: string } | null; onClose: () => void }) {
  useVersion()
  const exercises = useKind<ExerciseData>('exercise')
  const workouts = useKind<WorkoutData>('workout').sort((a, b) => a.data.order - b.data.order)
  const [picking, setPicking] = useState(false)
  if (!target) return null
  const act = store.get<ActivityData>(target.actId)
  if (!act) return null
  const { date } = target
  const w = workoutFor(date, act)
  const sets = setsFor(date, act.id)
  const done = isDone(date, act.id)
  const exName = (id: string) => exercises.find((e) => e.id === id)?.data.name ?? 'Vežba'
  const order: string[] = []
  for (const e of w?.data.exercises ?? []) order.push(e.exerciseId)
  for (const s of sets) if (!order.includes(s.exerciseId)) order.push(s.exerciseId)

  const addSet = (exId: string) => {
    const mine = sets.filter((s) => s.exerciseId === exId)
    const prev = lastSets(exId, date)
    const tpl = mine[mine.length - 1] ?? prev[mine.length] ?? prev[prev.length - 1]
    setSets(date, act.id, [...sets, { exerciseId: exId, kg: tpl?.kg ?? null, reps: tpl?.reps ?? null }])
  }
  const upd = (i: number, patch: Partial<LoggedSet>) => setSets(date, act.id, sets.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const del = (i: number) => setSets(date, act.id, sets.filter((_, j) => j !== i))
  const removeFromDay = () => {
    setDayActivities(
      date,
      activitiesOn(date)
        .map((a) => a.id)
        .filter((id) => id !== act.id),
    )
    onClose()
  }

  return (
    <Modal open onClose={onClose} wide={order.length > 0} tall={false} title={`${act.data.name} · ${fmtLong(date)}`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button variant={done ? 'soft' : 'primary'} onClick={() => toggleDone(date, act.id)}>
          <Check size={16} /> {done ? 'Urađeno ✓ (poništi)' : 'Označi kao urađeno'}
        </Button>
        {workouts.length > 0 && (act.data.usesWorkouts || w) && (
          <select className="text-sm" value={w?.id ?? ''} onChange={(e) => setDayWorkout(date, act.id, e.target.value || undefined)}>
            <option value="">Bez treninga</option>
            {workouts.map((x) => (
              <option key={x.id} value={x.id}>
                {x.data.name}
              </option>
            ))}
          </select>
        )}
        <Button variant="ghost" className="ml-auto text-rose-600" onClick={removeFromDay}>
          <X size={15} /> Skloni samo za ovaj dan
        </Button>
      </div>

      {order.length > 0 && (
        <div className="grid md:grid-cols-2 gap-2">
          {order.map((exId) => {
            const target2 = w?.data.exercises.find((e) => e.exerciseId === exId)
            const mine = sets.map((s, i) => ({ s, i })).filter((x) => x.s.exerciseId === exId)
            const prev = lastSets(exId, date)
            return (
              <div key={exId} className="rounded-lg border border-line p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{exName(exId)}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {target2 && (
                      <span className="text-xs text-ink-faint tabular">
                        {target2.sets}×{target2.reps}
                      </span>
                    )}
                    <Button variant="soft" className="py-0.5 px-2 text-xs" onClick={() => addSet(exId)}>
                      <Plus size={13} /> Serija
                    </Button>
                  </span>
                </div>
                {prev.length > 0 && <div className="text-xs text-ink-faint">Prošli put: {prev.map((s) => `${s.kg ?? '—'}×${s.reps ?? '—'}`).join(', ')}</div>}
                {mine.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {mine.map(({ s, i }, n) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-5 text-xs text-ink-faint tabular">{n + 1}.</span>
                        <NumInput value={s.kg} onCommit={(v) => upd(i, { kg: v })} suffix="kg" />
                        <span className="text-ink-faint">×</span>
                        <NumInput value={s.reps} onCommit={(v) => upd(i, { reps: v })} suffix="pon" />
                        <IconButton title="Ukloni seriju" onClick={() => del(i)} className="ml-auto w-7 h-7">
                          <Trash2 size={13} />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {(act.data.usesWorkouts || w || order.length > 0) && (
        <Button className="mt-3" onClick={() => setPicking(true)}>
          <Plus size={15} /> Dodaj vežbu
        </Button>
      )}
      {!act.data.usesWorkouts && !w && order.length === 0 && <div className="text-sm text-ink-faint">Samo štikliraj kad završiš.</div>}
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(id) => {
          setSets(date, act.id, [...sets, { exerciseId: id, kg: null, reps: null }])
          setPicking(false)
        }}
      />
    </Modal>
  )
}

function AddToDayModal({ date, onClose }: { date: string | null; onClose: () => void }) {
  useVersion()
  if (!date) return null
  const all = listActivities()
  const current = activitiesOn(date).map((a) => a.id)
  const free = all.filter((a) => !current.includes(a.id))
  return (
    <Modal open onClose={onClose} title={`Dodaj za ${fmtLong(date)}`}>
      <p className="text-sm text-ink-soft mb-3">Menja raspored samo za ovaj dan. Ostale nedelje ostaju iste.</p>
      {free.length === 0 ? (
        <Empty>Sve aktivnosti su već tog dana.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {free.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setDayActivities(date, [...current, a.id])
                onClose()
              }}
              className="flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left hover:bg-paper-sunk"
              style={{ borderColor: a.data.color }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: a.data.color }} />
              <span className="font-medium">{a.data.name}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ---------------- Traka poslednjih 60 dana ----------------

function ActivityStrip() {
  useVersion()
  const DAYS = 60
  const end = today()
  const start = addDays(end, -(DAYS - 1))
  const first = store
    .list<{ date: string; done: string[] }>('actday')
    .filter((d) => d.data.done?.length)
    .map((d) => d.data.date)
    .sort()[0]
  const from = first ?? end
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i))
  const states = days.map((d) => (d < from ? 'before' : dayState(d, end)))
  const tracked = days.filter((d, i) => d >= from && d < end && states[i] !== 'none')
  const okCount = days.filter((d, i) => d >= from && d < end && states[i] === 'done').length
  let streakN = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const st = states[i]
    if (days[i] === end && st !== 'done') continue
    if (st === 'done') streakN++
    else if (st === 'none') continue
    else break
  }
  return (
    <div className="mt-3 pt-3 border-t border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5 text-sm">
        <span className="font-semibold">Poslednjih {DAYS} dana</span>
        <span className="text-ink-soft">
          Sve urađeno <b className="text-emerald-600">{okCount}</b> od {tracked.length} dana · niz <b>{streakN}</b>
        </span>
      </div>
      <div className="flex h-8 rounded-lg overflow-hidden border border-line">
        {days.map((d, i) => {
          const st = states[i]
          const bg = st === 'done' ? '#16a34a' : st === 'missed' ? '#e11d48' : 'rgb(var(--paper-sunk))'
          const acts = activitiesOn(d)
          return (
            <div
              key={d}
              title={`${fmtLong(d)}: ${acts.length ? acts.map((a) => (isDone(d, a.id) ? '✓ ' : '✗ ') + a.data.name).join(', ') : 'odmor'}`}
              className="flex-1 border-r border-black/10 last:border-r-0"
              style={{ background: bg }}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-ink-faint mt-1">
        <span>{iso(parse(start)) && `${parse(start).getDate()}. ${MONTHS_GEN[parse(start).getMonth()]}`}</span>
        <span className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#16a34a]" /> sve urađeno
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#e11d48]" /> nešto propušteno
          </span>
        </span>
        <span>danas</span>
      </div>
    </div>
  )
}

// ---------------- Pomoćne komponente ----------------

function NumInput({ value, onCommit, suffix }: { value: number | null; onCommit: (v: number | null) => void; suffix: string }) {
  const [v, setV] = useState(value === null ? '' : String(value))
  const [last, setLast] = useState(value)
  if (value !== last) {
    setLast(value)
    setV(value === null ? '' : String(value))
  }
  return (
    <div className="relative">
      <input
        inputMode="decimal"
        className="w-24 pr-9 tabular"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = v.trim() === '' ? null : Number(v.replace(',', '.'))
          if (n === null || !Number.isNaN(n)) onCommit(n)
        }}
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-faint pointer-events-none">{suffix}</span>
    </div>
  )
}

function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const exercises = useKind<ExerciseData>('exercise').sort((a, b) => a.data.name.localeCompare(b.data.name))
  const [name, setName] = useState('')
  const [q, setQ] = useState('')
  const list = exercises.filter((e) => e.data.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Modal open={open} onClose={onClose} title="Izaberi vežbu">
      <input className="w-full mb-3" placeholder="Pretraži…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-64 overflow-y-auto -mx-2 mb-4">
        {list.map((e) => (
          <button key={e.id} onClick={() => onPick(e.id)} className="w-full text-left px-2 py-2 rounded-lg hover:bg-paper-sunk">
            {e.data.name}
            {e.data.muscle && <span className="text-xs text-ink-faint"> · {e.data.muscle}</span>}
          </button>
        ))}
        {list.length === 0 && <div className="text-sm text-ink-faint px-2">Nema vežbi.</div>}
      </div>
      <div className="flex gap-2 border-t border-line pt-3">
        <input className="flex-1" placeholder="Nova vežba" value={name} onChange={(e) => setName(e.target.value)} />
        <Button
          variant="primary"
          disabled={!name.trim()}
          onClick={() => {
            const id = store.put<ExerciseData>('exercise', { name: name.trim() })
            setName('')
            onPick(id)
          }}
        >
          Dodaj
        </Button>
      </div>
    </Modal>
  )
}


function WorkoutEditor({ id, onClose, count }: { id: string | 'new' | null; onClose: () => void; count: number }) {
  const existing = id && id !== 'new' ? store.get<WorkoutData>(id) : undefined
  const exercises = useKind<ExerciseData>('exercise')
  const exName = (eid: string) => exercises.find((e) => e.id === eid)?.data.name ?? '?'
  const [d, setD] = useState<WorkoutData>({ name: '', exercises: [], order: count + 1 })
  const [last, setLast] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  if (id !== last) {
    setLast(id)
    setD(existing?.data ?? { name: '', exercises: [], order: count + 1 })
  }
  const move = (i: number, dir: number) =>
    setD((x) => {
      const a = [...x.exercises]
      const j = i + dir
      if (j < 0 || j >= a.length) return x
      ;[a[i], a[j]] = [a[j], a[i]]
      return { ...x, exercises: a }
    })
  return (
    <Modal
      open={!!id}
      onClose={onClose}
      title={existing ? 'Izmeni trening' : 'Novi trening'}
      footer={
        <>
          {existing && (
            <Button
              variant="ghost"
              className="mr-auto text-rose-600"
              onClick={() => {
                if (confirm('Obrisati trening?')) {
                  store.remove(existing.id)
                  onClose()
                }
              }}
            >
              Obriši
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!d.name.trim()}
            onClick={() => {
              if (existing) store.update<WorkoutData>(existing.id, () => d)
              else store.put<WorkoutData>('workout', d)
              onClose()
            }}
          >
            Sačuvaj
          </Button>
        </>
      }
    >
      <Field label="Naziv">
        <input className="w-full" placeholder="npr. Upper A" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
      </Field>
      <div className="space-y-2 mb-3">
        {d.exercises.map((e, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex-1 text-sm truncate">{exName(e.exerciseId)}</span>
            <input
              type="number"
              className="w-14 py-1 text-sm"
              value={e.sets}
              onChange={(ev) => setD({ ...d, exercises: d.exercises.map((x, j) => (j === i ? { ...x, sets: Number(ev.target.value) } : x)) })}
            />
            <span className="text-ink-faint text-sm">×</span>
            <input
              className="w-16 py-1 text-sm"
              value={e.reps}
              onChange={(ev) => setD({ ...d, exercises: d.exercises.map((x, j) => (j === i ? { ...x, reps: ev.target.value } : x)) })}
            />
            <IconButton title="Gore" onClick={() => move(i, -1)}>
              <ArrowUp size={14} />
            </IconButton>
            <IconButton title="Dole" onClick={() => move(i, 1)}>
              <ArrowDown size={14} />
            </IconButton>
            <IconButton title="Ukloni" onClick={() => setD({ ...d, exercises: d.exercises.filter((_, j) => j !== i) })}>
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
      </div>
      <Button onClick={() => setPicking(true)}>
        <Plus size={15} /> Dodaj vežbu
      </Button>
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(eid) => {
          setD((x) => ({ ...x, exercises: [...x.exercises, { exerciseId: eid, sets: 3, reps: '8-12' }] }))
          setPicking(false)
        }}
      />
    </Modal>
  )
}

// ---------------- Napredak ----------------

