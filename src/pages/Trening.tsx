import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown, Pencil, Check } from 'lucide-react'
import { store, useKind, useVersion } from '../lib/store'
import type { DayActivity, ExerciseData, LoggedSet, WorkoutData, WorkoutLogData, WeekPlanDay } from '../lib/types'
import { DAYS_LONG, addDays, fmtShort, relDay, today, fromMin, toMin } from '../lib/dates'
import { planFor, useWeekPlan, workoutLogFor, workoutTitle } from '../lib/logic'
import { go } from '../lib/router'
import { Button, Card, Empty, Field, IconButton, LineChart, Modal, PageHeader, SectionTitle, Segmented, cx } from '../ui/kit'

type Tab = 'danas' | 'plan' | 'treninzi' | 'napredak'

export default function Trening({ param }: { param?: string }) {
  const isDate = param && /^\d{4}-\d{2}-\d{2}$/.test(param)
  const tab: Tab = isDate || !param ? 'danas' : (param as Tab)
  const date = isDate ? param! : today()
  return (
    <div>
      <PageHeader
        title="Trening"
        right={
          <Segmented<Tab>
            value={tab}
            onChange={(v) => go('trening', v === 'danas' ? undefined : v)}
            options={[
              { value: 'danas', label: 'Dan' },
              { value: 'plan', label: 'Nedelja' },
              { value: 'treninzi', label: 'Treninzi' },
              { value: 'napredak', label: 'Napredak' },
            ]}
          />
        }
      />
      {tab === 'danas' && <Session date={date} />}
      {tab === 'plan' && <WeekPlanEditor />}
      {tab === 'treninzi' && <Workouts />}
      {tab === 'napredak' && <Progress />}
    </div>
  )
}

// ---------------- Dan / logovanje ----------------

function lastSetsFor(exerciseId: string, before: string): LoggedSet[] {
  const logs = store
    .list<WorkoutLogData>('workoutlog')
    .filter((l) => l.data.date < before && l.data.sets.some((s) => s.exerciseId === exerciseId))
    .sort((a, b) => b.data.date.localeCompare(a.data.date))
  return logs[0]?.data.sets.filter((s) => s.exerciseId === exerciseId) ?? []
}

function Session({ date }: { date: string }) {
  useVersion()
  const [plan] = useWeekPlan()
  const day = planFor(date, plan)
  const log = workoutLogFor(date)
  const exercises = useKind<ExerciseData>('exercise')
  const exName = (id: string) => exercises.find((e) => e.id === id)?.data.name ?? 'Vežba'
  const workout = (log?.data.workoutId ?? day.workoutId) ? store.get<WorkoutData>((log?.data.workoutId ?? day.workoutId)!) : undefined
  const [picking, setPicking] = useState(false)
  const [chooseWorkout, setChooseWorkout] = useState(false)

  const ensureLog = (): string => {
    if (log) return log.id
    return store.put<WorkoutLogData>(
      'workoutlog',
      {
        date,
        type: day.activity === 'plivanje' ? 'plivanje' : day.activity === 'teretana' ? 'teretana' : 'drugo',
        workoutId: day.workoutId,
        title: workoutTitle(day),
        sets: [],
        done: false,
      },
      `wlog-${date}`,
    )
  }

  // Redosled vežbi: iz šablona, pa dodate
  const order: string[] = []
  for (const we of workout?.data.exercises ?? []) order.push(we.exerciseId)
  for (const s of log?.data.sets ?? []) if (!order.includes(s.exerciseId)) order.push(s.exerciseId)

  const setsOf = (exId: string) => (log?.data.sets ?? []).map((s, i) => ({ s, i })).filter((x) => x.s.exerciseId === exId)

  const addSet = (exId: string) => {
    const id = ensureLog()
    const prev = setsOf(exId)
    const last = lastSetsFor(exId, date)
    const template = prev.length ? prev[prev.length - 1].s : last[prev.length] ?? last[last.length - 1]
    store.update<WorkoutLogData>(id, (d) => ({
      ...d,
      sets: [...d.sets, { exerciseId: exId, kg: template?.kg ?? null, reps: template?.reps ?? null }],
    }))
  }
  const updateSet = (index: number, patch: Partial<LoggedSet>) => {
    if (!log) return
    store.update<WorkoutLogData>(log.id, (d) => ({ ...d, sets: d.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)) }))
  }
  const removeSet = (index: number) => {
    if (!log) return
    store.update<WorkoutLogData>(log.id, (d) => ({ ...d, sets: d.sets.filter((_, i) => i !== index) }))
  }
  const toggleDone = () => {
    const id = ensureLog()
    store.update<WorkoutLogData>(id, (d) => ({ ...d, done: !d.done }))
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        <IconButton title="Prethodni dan" onClick={() => go('trening', addDays(date, -1))}>
          <ChevronLeft size={18} />
        </IconButton>
        <div className="text-center min-w-[120px]">
          <div className="font-semibold">{relDay(date)}</div>
          <div className="text-xs text-ink-faint">{fmtShort(date)}</div>
        </div>
        <IconButton title="Sledeći dan" onClick={() => go('trening', addDays(date, 1))}>
          <ChevronRight size={18} />
        </IconButton>
      </div>

      <Card className="p-3 mb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-ink-faint">
              {day.activity === 'odmor' ? 'Dan odmora' : `${day.time}–${fromMin(toMin(day.time) + day.duration)}`}
            </div>
            <div className="text-lg font-semibold">{log?.data.title ?? workoutTitle(day)}</div>
            {day.activity === 'teretana' && (
              <button className="text-xs text-accent mt-1" onClick={() => setChooseWorkout(true)}>
                Promeni trening za danas
              </button>
            )}
          </div>
          <Button variant={log?.data.done ? 'soft' : 'primary'} onClick={toggleDone}>
            <Check size={16} /> {log?.data.done ? 'Urađeno' : 'Završi'}
          </Button>
        </div>
        {day.activity === 'plivanje' && (
          <textarea
            className="w-full mt-4"
            rows={2}
            placeholder="Beleška (npr. 500 m, 20 dužina, kako je išlo)…"
            defaultValue={log?.data.note ?? ''}
            onBlur={(e) => {
              const id = ensureLog()
              store.update<WorkoutLogData>(id, (d) => ({ ...d, note: e.target.value }))
            }}
          />
        )}
      </Card>

      {(day.activity === 'teretana' || order.length > 0) && (
        <>
          {order.length === 0 && (
            <Empty>
              Ovaj dan nema šablon treninga. Napravi ga u „Treninzi“ i dodeli u „Nedelja“, ili dodaj vežbe ručno.
            </Empty>
          )}
          <div className="grid lg:grid-cols-2 gap-2">
            {order.map((exId) => {
              const target = workout?.data.exercises.find((e) => e.exerciseId === exId)
              const sets = setsOf(exId)
              const last = lastSetsFor(exId, date)
              return (
                <Card key={exId} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm leading-tight">{exName(exId)}</div>
                    <div className="flex items-center gap-1 shrink-0">
                      {target && (
                        <span className="text-xs text-ink-faint tabular whitespace-nowrap">
                          {target.sets} × {target.reps}
                        </span>
                      )}
                      <Button variant="soft" className="py-0.5 px-2 text-xs" onClick={() => addSet(exId)}>
                        <Plus size={13} /> Serija
                      </Button>
                    </div>
                  </div>
                  {last.length > 0 && (
                    <div className="text-xs text-ink-faint mt-0.5">
                      Prošli put: {last.map((s) => `${s.kg ?? '—'}×${s.reps ?? '—'}`).join(', ')}
                    </div>
                  )}
                  <div className={sets.length ? 'mt-2 space-y-1' : ''}>
                    {sets.map(({ s, i }, n) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 text-xs text-ink-faint tabular">{n + 1}.</span>
                        <NumInput value={s.kg} onCommit={(v) => updateSet(i, { kg: v })} suffix="kg" />
                        <span className="text-ink-faint">×</span>
                        <NumInput value={s.reps} onCommit={(v) => updateSet(i, { reps: v })} suffix="pon" />
                        <IconButton title="Ukloni seriju" onClick={() => removeSet(i)} className="ml-auto">
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
          <Button className="mt-3" onClick={() => setPicking(true)}>
            <Plus size={16} /> Dodaj vežbu
          </Button>
        </>
      )}

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(id) => {
          addSet(id)
          setPicking(false)
        }}
      />
      <WorkoutChooser
        open={chooseWorkout}
        onClose={() => setChooseWorkout(false)}
        onPick={(w) => {
          const id = ensureLog()
          store.update<WorkoutLogData>(id, (d) => ({ ...d, workoutId: w.id, title: `Teretana — ${w.data.name}` }))
          setChooseWorkout(false)
        }}
      />
    </div>
  )
}

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

function WorkoutChooser({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (w: { id: string; data: WorkoutData }) => void }) {
  const workouts = useKind<WorkoutData>('workout').sort((a, b) => a.data.order - b.data.order)
  return (
    <Modal open={open} onClose={onClose} title="Trening za danas">
      {workouts.length === 0 && <Empty>Nema šablona treninga.</Empty>}
      <div className="space-y-1">
        {workouts.map((w) => (
          <button key={w.id} onClick={() => onPick(w)} className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-paper-sunk">
            <div className="font-medium">{w.data.name}</div>
            <div className="text-xs text-ink-faint">{w.data.exercises.length} vežbi</div>
          </button>
        ))}
      </div>
    </Modal>
  )
}

// ---------------- Nedeljni plan ----------------

function WeekPlanEditor() {
  const [plan, setPlan] = useWeekPlan()
  const workouts = useKind<WorkoutData>('workout').sort((a, b) => a.data.order - b.data.order)
  const update = (i: number, patch: Partial<WeekPlanDay>) =>
    setPlan((p) => ({ ...p, days: p.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) }))
  const counts = plan.days.reduce(
    (a, d) => ({ ...a, [d.activity]: (a[d.activity] ?? 0) + 1 }),
    {} as Record<DayActivity, number>,
  )
  return (
    <div>
      <p className="text-sm text-ink-soft mb-3">
        Teretana {counts.teretana ?? 0}×, plivanje {counts.plivanje ?? 0}× nedeljno. Trbušnjaci i vežbe disanja su u Navikama.
      </p>
      <Card className="divide-y divide-line">
        {plan.days.map((d, i) => (
          <div key={i} className="p-3 flex flex-wrap items-center gap-2">
            <div className="w-28 font-medium">{DAYS_LONG[i]}</div>
            <Segmented<DayActivity>
              value={d.activity}
              onChange={(v) =>
                update(i, {
                  activity: v,
                  time: v === 'plivanje' ? '06:25' : v === 'teretana' ? '06:00' : d.time,
                  duration: v === 'plivanje' ? 60 : v === 'teretana' ? 75 : d.duration,
                })
              }
              options={[
                { value: 'teretana', label: 'Teretana' },
                { value: 'plivanje', label: 'Plivanje' },
                { value: 'odmor', label: 'Odmor' },
              ]}
            />
            {d.activity === 'teretana' && (
              <select className="py-1.5 text-sm" value={d.workoutId ?? ''} onChange={(e) => update(i, { workoutId: e.target.value || undefined })}>
                <option value="">— trening —</option>
                {workouts.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.data.name}
                  </option>
                ))}
              </select>
            )}
            {d.activity !== 'odmor' && (
              <div className="flex items-center gap-1.5 ml-auto">
                <input type="time" className="py-1.5 text-sm" value={d.time} onChange={(e) => update(i, { time: e.target.value })} />
                <input
                  type="number"
                  className="py-1.5 text-sm w-20"
                  value={d.duration}
                  onChange={(e) => update(i, { duration: Number(e.target.value) || 60 })}
                />
                <span className="text-xs text-ink-faint">min</span>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}

// ---------------- Šabloni treninga ----------------

function Workouts() {
  const workouts = useKind<WorkoutData>('workout').sort((a, b) => a.data.order - b.data.order)
  const exercises = useKind<ExerciseData>('exercise').sort((a, b) => a.data.name.localeCompare(b.data.name))
  const [edit, setEdit] = useState<string | 'new' | null>(null)
  const [exEdit, setExEdit] = useState<{ id?: string; data: ExerciseData } | null>(null)
  const exName = (id: string) => exercises.find((e) => e.id === id)?.data.name ?? '?'
  return (
    <div className="lg:grid lg:grid-cols-[1fr_320px] gap-4">
      <div>
        <SectionTitle
          action={
            <Button variant="ghost" onClick={() => setEdit('new')}>
              <Plus size={15} /> Trening
            </Button>
          }
        >
          Treninzi
        </SectionTitle>
        {workouts.length === 0 && <Empty>Nema treninga. Napravi npr. „Upper A“.</Empty>}
        <div className="grid sm:grid-cols-2 gap-3">
          {workouts.map((w) => (
            <Card key={w.id} className="p-3 cursor-pointer hover:border-ink-faint" onClick={() => setEdit(w.id)}>
              <div className="font-medium mb-1">{w.data.name}</div>
              <ul className="text-sm text-ink-soft space-y-0.5">
                {w.data.exercises.map((e, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{exName(e.exerciseId)}</span>
                    <span className="tabular text-ink-faint shrink-0">
                      {e.sets}×{e.reps}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
      <div className="mt-4 lg:mt-0">
        <SectionTitle
          action={
            <Button variant="ghost" onClick={() => setExEdit({ data: { name: '' } })}>
              <Plus size={15} /> Vežba
            </Button>
          }
        >
          Vežbe
        </SectionTitle>
        <Card className="px-4 py-1">
          {exercises.length === 0 ? (
            <Empty>Nema vežbi.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {exercises.map((e) => (
                <li key={e.id} className="flex items-center py-2 text-sm">
                  <span className="flex-1">
                    {e.data.name}
                    {e.data.muscle && <span className="text-ink-faint"> · {e.data.muscle}</span>}
                  </span>
                  <IconButton title="Izmeni" onClick={() => setExEdit({ id: e.id, data: e.data })}>
                    <Pencil size={14} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <WorkoutEditor id={edit} onClose={() => setEdit(null)} count={workouts.length} />
      <Modal
        open={!!exEdit}
        onClose={() => setExEdit(null)}
        title={exEdit?.id ? 'Izmeni vežbu' : 'Nova vežba'}
        footer={
          <>
            {exEdit?.id && (
              <Button
                variant="ghost"
                className="mr-auto text-rose-600"
                onClick={() => {
                  if (confirm('Obrisati vežbu? Istorija ostaje.')) {
                    store.remove(exEdit.id!)
                    setExEdit(null)
                  }
                }}
              >
                Obriši
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!exEdit?.data.name.trim()}
              onClick={() => {
                if (!exEdit) return
                if (exEdit.id) store.update<ExerciseData>(exEdit.id, () => exEdit.data)
                else store.put<ExerciseData>('exercise', exEdit.data)
                setExEdit(null)
              }}
            >
              Sačuvaj
            </Button>
          </>
        }
      >
        {exEdit && (
          <>
            <Field label="Naziv">
              <input className="w-full" value={exEdit.data.name} onChange={(e) => setExEdit({ ...exEdit, data: { ...exEdit.data, name: e.target.value } })} />
            </Field>
            <Field label="Mišićna grupa (opciono)">
              <input className="w-full" value={exEdit.data.muscle ?? ''} onChange={(e) => setExEdit({ ...exEdit, data: { ...exEdit.data, muscle: e.target.value } })} />
            </Field>
          </>
        )}
      </Modal>
    </div>
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

function Progress() {
  const exercises = useKind<ExerciseData>('exercise').sort((a, b) => a.data.name.localeCompare(b.data.name))
  const logs = useKind<WorkoutLogData>('workoutlog').sort((a, b) => a.data.date.localeCompare(b.data.date))
  const used = exercises.filter((e) => logs.some((l) => l.data.sets.some((s) => s.exerciseId === e.id && s.kg)))
  const [sel, setSel] = useState<string | null>(null)
  const ex = sel ?? used[0]?.id
  const points = useMemo(() => {
    if (!ex) return []
    return logs
      .map((l) => {
        const sets = l.data.sets.filter((s) => s.exerciseId === ex && s.kg !== null)
        if (!sets.length) return null
        return { x: fmtShort(l.data.date), y: Math.max(...sets.map((s) => s.kg ?? 0)) }
      })
      .filter((p): p is { x: string; y: number } => !!p)
  }, [ex, logs])
  const done = logs.filter((l) => l.data.done)
  const last30 = done.filter((l) => l.data.date >= addDays(today(), -30))
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="p-3">
          <div className="text-xs text-ink-faint">Poslednjih 30 dana</div>
          <div className="text-lg font-semibold tabular">{last30.length}</div>
          <div className="text-xs text-ink-faint">treninga</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-ink-faint">Teretana</div>
          <div className="text-lg font-semibold tabular">{last30.filter((l) => l.data.type === 'teretana').length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-ink-faint">Plivanje</div>
          <div className="text-lg font-semibold tabular">{last30.filter((l) => l.data.type === 'plivanje').length}</div>
        </Card>
      </div>
      <SectionTitle>Najveća kilaža po treningu</SectionTitle>
      {used.length === 0 ? (
        <Empty>Kad počneš da upisuješ serije, ovde će se videti napredak.</Empty>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {used.map((e) => (
              <button
                key={e.id}
                onClick={() => setSel(e.id)}
                className={cx('px-3 py-1 rounded-full text-sm border', ex === e.id ? 'bg-ink text-paper border-ink' : 'border-line text-ink-soft')}
              >
                {e.data.name}
              </button>
            ))}
          </div>
          <Card className="p-3">
            <LineChart points={points} unit=" kg" color="#10b981" />
          </Card>
        </>
      )}
      <SectionTitle>
        <span className="block mt-4">Istorija</span>
      </SectionTitle>
      <Card className="px-4 py-1">
        {done.length === 0 ? (
          <Empty>Još nema završenih treninga.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {[...done].reverse().slice(0, 40).map((l) => (
              <li key={l.id} className="flex items-center py-1.5 text-sm cursor-pointer" onClick={() => go('trening', l.data.date)}>
                <span className="w-24 text-ink-soft">{fmtShort(l.data.date)}</span>
                <span className="flex-1">{l.data.title}</span>
                <span className="text-xs text-ink-faint">{l.data.sets.length ? `${l.data.sets.length} serija` : l.data.note ?? ''}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
