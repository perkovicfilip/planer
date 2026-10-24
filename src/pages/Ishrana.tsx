import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, History, Plus, Star, Trash2, ArrowUp, ArrowDown, Pencil, Search } from 'lucide-react'
import { store, uid, useKind, useVersion } from '../lib/store'
import type { FoodData, GoalData, Meal, MealDayData, MealSlot, WeightData } from '../lib/types'
import { addDays, fmtLong, fmtShort, relDay, timeOf, today, fromMin } from '../lib/dates'
import {
  ensureMealDay,
  expectedTimes,
  fmtTime,
  learnedGap,
  mealDayFor,
  mealRemindAt,
  planFor,
  setMealEaten,
  totals,
  useSettings,
  useWeekPlan,
} from '../lib/logic'
import { go } from '../lib/router'
import { Button, Card, CheckCircle, Empty, Field, IconButton, LineChart, Modal, PageHeader, Progress, SectionTitle, Segmented, cx } from '../ui/kit'
import { EatenPicker } from '../ui/EatenPicker'
import { WeightChart } from '../ui/WeightChart'
import { bulkStartWeight } from '../lib/goals'

type Tab = 'plan' | 'lista' | 'kilaza'

export default function Ishrana({ param }: { param?: string }) {
  const tab: Tab = param === 'lista' || param === 'kilaza' ? param : 'plan'
  const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : today()
  return (
    <div className="md:flex md:flex-col md:flex-1 md:min-h-0">
      <PageHeader
        title="Ishrana"
        right={
          <Segmented<Tab>
            value={tab}
            onChange={(v) => go('ishrana', v === 'plan' ? undefined : v)}
            options={[
              { value: 'plan', label: 'Plan' },
              { value: 'lista', label: 'Obroci' },
              { value: 'kilaza', label: 'Kilaža' },
            ]}
          />
        }
      />
      {tab === 'plan' && <Plan date={date} />}
      {tab === 'lista' && <FoodLibrary />}
      {tab === 'kilaza' && <Weight />}
    </div>
  )
}

// ---------------- Plan dana ----------------

function Plan({ date }: { date: string }) {
  useVersion()
  const [settings] = useSettings()
  const [plan] = useWeekPlan()
  const md = mealDayFor(date)
  const meals = md?.data.meals ?? []
  const eaten = totals(meals)
  const planned = totals(meals, false)
  const exp = expectedTimes(date, meals, settings, plan)
  const day = planFor(date, plan)
  const gap = learnedGap(settings)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Meal | null>(null)
  const [pick, setPick] = useState<Meal | null>(null)
  const [history, setHistory] = useState(false)

  const updateMeals = (fn: (m: Meal[]) => Meal[]) => {
    const id = ensureMealDay(date)
    store.update<MealDayData>(id, (d) => ({ ...d, meals: fn(d.meals) }))
  }
  const move = (i: number, dir: number) =>
    updateMeals((m) => {
      const a = [...m]
      const j = i + dir
      if (j < 0 || j >= a.length) return a
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    })

  const missingKcal = settings.kcalGoal - planned.kcal
  const missingProt = settings.proteinGoal - planned.protein

  return (
    <div className="md:flex md:flex-col md:flex-1 md:min-h-0">
      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto">
      <div className="flex items-center gap-1 mb-4">
        <IconButton title="Prethodni dan" onClick={() => go('ishrana', addDays(date, -1))}>
          <ChevronLeft size={18} />
        </IconButton>
        <div className="text-center min-w-[120px]">
          <div className="font-semibold">{relDay(date)}</div>
          <div className="text-xs text-ink-faint">{fmtLong(date)}</div>
        </div>
        <IconButton title="Sledeći dan" onClick={() => go('ishrana', addDays(date, 1))}>
          <ChevronRight size={18} />
        </IconButton>
        {date !== today() && (
          <Button variant="ghost" onClick={() => go('ishrana')}>
            Danas
          </Button>
        )}
        <Button className="ml-auto" onClick={() => setHistory(true)}>
          <History size={15} /> Istorija ishrane
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <Card className="p-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm">Kalorije</span>
            <span className="text-lg font-semibold tabular">
              {eaten.kcal} <span className="text-sm text-ink-faint font-normal">/ {settings.kcalGoal}</span>
            </span>
          </div>
          <div className="mt-2">
            <Progress value={eaten.kcal} max={settings.kcalGoal} color={goalColor(eaten.kcal / settings.kcalGoal)} height={10} />
          </div>
          <div className="text-xs text-ink-faint mt-1.5">Planirano {planned.kcal} kcal</div>
        </Card>
        <Card className="p-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm">Proteini</span>
            <span className="text-lg font-semibold tabular">
              {eaten.protein} <span className="text-sm text-ink-faint font-normal">/ {settings.proteinGoal} g</span>
            </span>
          </div>
          <div className="mt-2">
            <Progress value={eaten.protein} max={settings.proteinGoal} color={goalColor(eaten.protein / settings.proteinGoal)} height={10} />
          </div>
          <div className="text-xs text-ink-faint mt-1.5">Planirano {planned.protein} g</div>
        </Card>
      </div>

      <SectionTitle>Obroci</SectionTitle>
      {meals.length === 0 ? (
        <Card className="mb-3">
          <Empty>Nema obroka za ovaj dan.</Empty>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mb-3">
          {meals.map((m, i) => {
            const remind = mealRemindAt(exp[i], m, settings)
            const eatenNow = !!m.eatenAt
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => (eatenNow ? setMealEaten(date, m.id, null) : setPick(m))}
                onKeyDown={(e) => e.key === 'Enter' && (eatenNow ? setMealEaten(date, m.id, null) : setPick(m))}
                className={cx(
                  'meal-card group relative rounded-xl border-2 px-4 py-3 cursor-pointer transition select-none',
                  eatenNow ? 'meal-done' : 'meal-todo',
                )}
                title={eatenNow ? 'Klikni da poništiš' : 'Klikni kad pojedeš'}
              >
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-6 h-6 rounded-full grid place-items-center text-xs font-bold bg-black/10 dark:bg-white/10 mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base leading-snug truncate">{m.name}</div>
                    <div className="text-sm tabular mt-0.5 opacity-80">
                      {m.kcal} kcal · {m.protein} g
                    </div>
                    <div className="text-xs mt-1 opacity-70">
                      {eatenNow
                        ? `✓ Pojedeno u ${timeOf(m.eatenAt!)}`
                        : m.time
                          ? `Planirano u ${m.time}${remind !== null ? ` · podsetnik ${fromMin(remind)}` : ''}`
                          : 'Nije pojedeno'}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      aria-label="Izmeni obrok"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditing(m)
                      }}
                      className="w-7 h-7 grid place-items-center rounded-md opacity-60 hover:opacity-100 hover:bg-black/5"
                    >
                      <Pencil size={14} />
                    </button>
                    <div className="flex opacity-0 group-hover:opacity-100 transition">
                      <button
                        aria-label="Pomeri ranije"
                        disabled={i === 0}
                        onClick={(e) => {
                          e.stopPropagation()
                          move(i, -1)
                        }}
                        className="w-6 h-6 grid place-items-center rounded hover:bg-black/5 disabled:opacity-20"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <button
                        aria-label="Pomeri kasnije"
                        disabled={i === meals.length - 1}
                        onClick={(e) => {
                          e.stopPropagation()
                          move(i, 1)
                        }}
                        className="w-6 h-6 grid place-items-center rounded hover:bg-black/5 disabled:opacity-20"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Button variant="primary" onClick={() => setAdding(true)}>
        <Plus size={16} /> Dodaj obrok
      </Button>

      {meals.length > 0 && (missingKcal > 0 || missingProt > 0) && (
        <Suggestions kcal={missingKcal} protein={missingProt} planned={meals} onAdd={(f) => addFood(date, f, meals, day.activity !== 'odmor')} />
      )}
      </div>

      <DayStrip selected={date} />
      <HistoryModal open={history} onClose={() => setHistory(false)} />

      <AddMeal open={adding} planned={meals} onClose={() => setAdding(false)} onAdd={(f) => addFood(date, f, meals, day.activity !== 'odmor')} />
      <MealEditor
        meal={editing}
        onClose={() => setEditing(null)}
        onSave={(m) => updateMeals((all) => all.map((x) => (x.id === m.id ? m : x)))}
        onDelete={(id) => updateMeals((all) => all.filter((x) => x.id !== id))}
        defaultDelay={settings.remindDelay}
      />
      <EatenPicker
        open={!!pick}
        date={date}
        name={pick?.name ?? ''}
        onClose={() => setPick(null)}
        onPick={(t) => {
          if (pick) setMealEaten(date, pick.id, t)
          setPick(null)
        }}
      />
    </div>
  )
}

function addFood(date: string, f: { id?: string; data: FoodData }, existing: Meal[], training: boolean) {
  const slot: MealSlot = null
  void training
  void existing
  const meal: Meal = { id: uid(), foodId: f.id, name: f.data.name, kcal: f.data.kcal, protein: f.data.protein, slot }
  const id = ensureMealDay(date)
  store.update<MealDayData>(id, (d) => ({ ...d, meals: [...d.meals, meal] }))
}

function Suggestions({ kcal, protein, planned, onAdd }: { kcal: number; protein: number; planned: Meal[]; onAdd: (f: { id: string; data: FoodData }) => void }) {
  const foods = useKind<FoodData>('food')
  const picks = useMemo(() => {
    return [...foods]
      .filter((f) => f.data.kcal > 0)
      .map((f) => {
        // koliko dobro pokriva ono što fali (više proteina je bitnije kad fali proteina)
        const kScore = kcal > 0 ? Math.min(f.data.kcal, kcal) / Math.max(kcal, 1) : 0
        const pScore = protein > 0 ? Math.min(f.data.protein, protein) / Math.max(protein, 1) : 0
        const over = Math.max(0, f.data.kcal - kcal - 300) / 1000
        // već u planu za taj dan: jaka kazna za svako ponavljanje
        const times = planned.filter((m) => m.foodId === f.id || m.name.trim().toLowerCase() === f.data.name.trim().toLowerCase()).length
        return { f, times, score: kScore + pScore * 1.3 - over + (f.data.favorite ? 0.1 : 0) - times * 0.8 }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [foods, kcal, protein, planned])
  return (
    <div className="mt-4">
      <SectionTitle>
        Fali ti još {[kcal > 0 && `${kcal} kcal`, protein > 0 && `${protein} g proteina`].filter(Boolean).join(' i ')}
      </SectionTitle>
      {picks.length === 0 ? (
        <div className="text-sm text-ink-faint">Dodaj obroke u listu da bih mogao da predložim.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {picks.map(({ f }) => (
            <button key={f.id} onClick={() => onAdd(f)} className="text-sm px-3 py-2 rounded-xl border border-line bg-paper-raised hover:bg-paper-sunk text-left">
              <div className="font-medium">+ {f.data.name}</div>
              <div className="text-xs text-ink-faint tabular">
                {f.data.kcal} kcal · {f.data.protein} g
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AddMeal({ open, onClose, onAdd, planned }: { open: boolean; onClose: () => void; onAdd: (f: { id?: string; data: FoodData }) => void; planned: Meal[] }) {
  const foods = useKind<FoodData>('food')
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState<FoodData>({ name: '', kcal: 0, protein: 0 })
  const [showNew, setShowNew] = useState(false)
  const [added, setAdded] = useState<string[]>([])
  const list = [...foods]
    .filter((f) => f.data.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(!!b.data.favorite) - Number(!!a.data.favorite) || a.data.name.localeCompare(b.data.name, 'sr', { numeric: true }))
  const close = () => {
    setAdded([])
    setQ('')
    setShowNew(false)
    onClose()
  }
  const add = (f: { id?: string; data: FoodData }) => {
    onAdd(f)
    setAdded((x) => [...x, f.data.name])
  }
  const addCustom = () => {
    if (!custom.name.trim()) return
    const data = { ...custom, name: custom.name.trim() }
    const id = store.put<FoodData>('food', data)
    add({ id, data })
    setCustom({ name: '', kcal: 0, protein: 0 })
    setShowNew(false)
  }
  const countIn = (f: { id: string; data: FoodData }) => planned.filter((m) => m.foodId === f.id).length

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Dodaj obroke za ovaj dan"
      footer={
        <>
          <span className="mr-auto text-sm text-ink-soft truncate">
            {added.length ? `Dodato redom: ${added.map((a, i) => `${i + 1}. ${a}`).join(' · ')}` : 'Klikni na obroke redom kojim ćeš ih jesti — prvi kliknut je prvi obrok.'}
          </span>
          <Button variant="primary" onClick={close}>
            Gotovo
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="w-full pl-8" placeholder="Pretraži obroke…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus size={15} /> Novi obrok
        </Button>
      </div>
      {showNew && (
        <div className="flex flex-wrap gap-2 items-center mb-3 p-2 rounded-lg bg-paper-sunk">
          <input className="flex-1 min-w-[160px]" placeholder="Naziv" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
          <input type="number" className="w-24" placeholder="kcal" value={custom.kcal || ''} onChange={(e) => setCustom({ ...custom, kcal: Number(e.target.value) })} />
          <input type="number" className="w-28" placeholder="proteini g" value={custom.protein || ''} onChange={(e) => setCustom({ ...custom, protein: Number(e.target.value) })} onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
          <Button variant="primary" onClick={addCustom} disabled={!custom.name.trim()}>
            Sačuvaj i dodaj
          </Button>
        </div>
      )}
      {list.length === 0 ? (
        <Empty>{foods.length ? 'Nema obroka koji odgovaraju pretrazi.' : 'Lista je prazna — klikni „Novi obrok“.'}</Empty>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2">
          {list.map((f) => {
            const n = countIn(f)
            const pos = planned.map((m, i) => (m.foodId === f.id ? i + 1 : 0)).filter(Boolean)
            return (
              <button
                key={f.id}
                onClick={() => add(f)}
                className={cx(
                  'relative text-left rounded-xl border-2 px-3 py-2 transition active:scale-[0.98]',
                  n > 0 ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-line bg-paper-raised hover:border-accent hover:bg-accent-soft/40',
                )}
              >
                <div className="flex items-start gap-1.5">
                  <span className="flex-1 font-semibold leading-snug">{f.data.name}</span>
                  {f.data.favorite && <Star size={14} className="text-amber-500 fill-amber-500 shrink-0 mt-0.5" />}
                </div>
                <div className="text-sm text-ink-soft tabular mt-0.5">
                  {f.data.kcal} kcal · {f.data.protein} g
                </div>
                {n > 0 && <div className="text-xs text-emerald-600 mt-0.5">✓ u planu kao {pos.map((p) => `${p}.`).join(', ')}</div>}
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

function MealEditor({
  meal,
  onClose,
  onSave,
  onDelete,
  defaultDelay,
}: {
  meal: Meal | null
  onClose: () => void
  onSave: (m: Meal) => void
  onDelete: (id: string) => void
  defaultDelay: number
}) {
  const [m, setM] = useState<Meal | null>(meal)
  const [last, setLast] = useState<Meal | null>(null)
  if (meal !== last) {
    setLast(meal)
    setM(meal)
  }
  if (!m) return null
  const set = <K extends keyof Meal>(k: K, v: Meal[K]) => setM((x) => (x ? { ...x, [k]: v } : x))
  return (
    <Modal
      open={!!meal}
      onClose={onClose}
      title="Izmeni obrok"
      footer={
        <>
          <Button
            variant="ghost"
            className="mr-auto text-rose-600"
            onClick={() => {
              onDelete(m.id)
              onClose()
            }}
          >
            <Trash2 size={15} /> Ukloni
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(m)
              onClose()
            }}
          >
            Sačuvaj
          </Button>
        </>
      }
    >
      <Field label="Naziv">
        <input className="w-full" value={m.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="kcal">
          <input type="number" className="w-full" value={m.kcal} onChange={(e) => set('kcal', Number(e.target.value))} />
        </Field>
        <Field label="Proteini (g)">
          <input type="number" className="w-full" value={m.protein} onChange={(e) => set('protein', Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Planirano vreme (opciono)" hint="Prazno = aplikacija sama računa po prošlom obroku.">
        <input type="time" className="w-full" value={m.time ?? ''} onChange={(e) => set('time', e.target.value || undefined)} />
      </Field>
      <Field label="Podsetnik ako kasnim (minuta)">
        <input
          type="number"
          className="w-full"
          placeholder={String(defaultDelay)}
          value={m.remindAfter ?? ''}
          onChange={(e) => set('remindAfter', e.target.value === '' ? undefined : Number(e.target.value))}
        />
      </Field>
      {m.eatenAt && (
        <Field label="Pojedeno u">
          <input
            type="time"
            className="w-full"
            value={timeOf(m.eatenAt)}
            onChange={(e) => {
              if (!e.target.value) return
              const d = new Date(m.eatenAt!)
              const [h, mm] = e.target.value.split(':').map(Number)
              d.setHours(h, mm, 0, 0)
              set('eatenAt', d.toISOString())
            }}
          />
        </Field>
      )}
    </Modal>
  )
}

function CopyDay({ open, onClose, target }: { open: boolean; onClose: () => void; target: string }) {
  const [src, setSrc] = useState(addDays(target, -1))
  const srcDay = mealDayFor(src)
  const doCopy = (mode: 'replace' | 'append') => {
    if (!srcDay) return
    const fresh = srcDay.data.meals.map((m) => ({ ...m, id: uid(), eatenAt: undefined }))
    const id = ensureMealDay(target)
    store.update<MealDayData>(id, (d) => ({ ...d, meals: mode === 'replace' ? fresh : [...d.meals, ...fresh] }))
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={`Kopiraj obroke u: ${relDay(target)}`}>
      <Field label="Sa dana">
        <input type="date" className="w-full" value={src} onChange={(e) => setSrc(e.target.value)} />
      </Field>
      <div className="flex gap-2 mb-3">
        {[-1, -7].map((n) => (
          <Button key={n} onClick={() => setSrc(addDays(target, n))}>
            {n === -1 ? 'Dan pre' : 'Pre nedelju dana'}
          </Button>
        ))}
      </div>
      {srcDay && srcDay.data.meals.length ? (
        <>
          <ul className="text-sm text-ink-soft mb-4 space-y-0.5">
            {srcDay.data.meals.map((m) => (
              <li key={m.id}>• {m.name}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => doCopy('replace')}>
              Zameni
            </Button>
            <Button onClick={() => doCopy('append')}>Dodaj na postojeće</Button>
          </div>
        </>
      ) : (
        <Empty>Taj dan nema obroka.</Empty>
      )}
    </Modal>
  )
}

// ---------------- Lista obroka ----------------

function FoodLibrary() {
  const foods = useKind<FoodData>('food').sort((a, b) => Number(!!b.data.favorite) - Number(!!a.data.favorite) || a.data.name.localeCompare(b.data.name, 'sr', { numeric: true }))
  const [edit, setEdit] = useState<{ id?: string; data: FoodData } | null>(null)
  const [q, setQ] = useState('')
  const shown = foods.filter((f) => f.data.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="md:flex md:flex-col md:flex-1 md:min-h-0">
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="w-full pl-8" placeholder="Pretraži obroke…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-xs text-ink-faint">{foods.length} obroka</span>
        <Button variant="primary" className="ml-auto" onClick={() => setEdit({ data: { name: '', kcal: 0, protein: 0 } })}>
          <Plus size={16} /> Novi obrok
        </Button>
      </div>
      {foods.length === 0 ? (
        <Card>
          <Empty>Lista je prazna — dodaj prvi obrok.</Empty>
        </Card>
      ) : (
        <div className="md:flex-1 md:min-h-0 md:overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1.5">
            {shown.map((f) => (
              <div
                key={f.id}
                onClick={() => setEdit({ id: f.id, data: f.data })}
                className="group flex items-center gap-2 rounded-lg border border-line bg-paper-raised px-2.5 py-1.5 cursor-pointer hover:border-ink-faint"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.data.name}</div>
                  <div className="text-xs text-ink-faint tabular">
                    {f.data.kcal} kcal · {f.data.protein} g
                  </div>
                </div>
                <button
                  aria-label="Omiljeno"
                  onClick={(e) => {
                    e.stopPropagation()
                    store.update<FoodData>(f.id, (d) => ({ ...d, favorite: !d.favorite }))
                  }}
                  className={cx('shrink-0', f.data.favorite ? 'text-amber-500' : 'text-ink-faint opacity-0 group-hover:opacity-100')}
                >
                  <Star size={15} className={f.data.favorite ? 'fill-amber-500' : ''} />
                </button>
              </div>
            ))}
          </div>
          {shown.length === 0 && <Empty>Nema obroka koji odgovaraju pretrazi.</Empty>}
        </div>
      )}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Izmeni obrok' : 'Novi obrok'}
        footer={
          <>
            {edit?.id && (
              <Button
                variant="ghost"
                className="mr-auto text-rose-600"
                onClick={() => {
                  store.remove(edit.id!)
                  setEdit(null)
                }}
              >
                Obriši
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!edit?.data.name.trim()}
              onClick={() => {
                if (!edit) return
                if (edit.id) store.update<FoodData>(edit.id, () => edit.data)
                else store.put<FoodData>('food', edit.data)
                setEdit(null)
              }}
            >
              Sačuvaj
            </Button>
          </>
        }
      >
        {edit && (
          <>
            <Field label="Naziv">
              <input className="w-full" value={edit.data.name} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, name: e.target.value } })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="kcal">
                <input type="number" className="w-full" value={edit.data.kcal || ''} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, kcal: Number(e.target.value) } })} />
              </Field>
              <Field label="Proteini (g)">
                <input type="number" className="w-full" value={edit.data.protein || ''} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, protein: Number(e.target.value) } })} />
              </Field>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// ---------------- Kilaža ----------------

function Weight() {
  const weights = useKind<WeightData>('weight').sort((a, b) => a.data.date.localeCompare(b.data.date))
  const goals = useKind<GoalData>('goal')
  const [settings] = useSettings()
  const [kg, setKg] = useState('')
  const [date, setDate] = useState(today())
  const save = () => {
    const v = Number(kg.replace(',', '.'))
    if (!v) return
    const ex = weights.find((w) => w.data.date === date)
    if (ex) store.update<WeightData>(ex.id, () => ({ date, kg: v }))
    else store.put<WeightData>('weight', { date, kg: v })
    setKg('')
  }
  const kgGoal = goals.find((g) => g.data.type === 'kg')
  const startDate = settings.bulkStart || '2026-11-01'
  const start = bulkStartWeight()
  const last = weights[weights.length - 1]
  const target = kgGoal?.data.target ?? null
  const left = target !== null && last ? +(target - last.data.kg).toFixed(1) : null

  return (
    <div className="lg:grid lg:grid-cols-[1fr_280px] gap-4 md:flex-1 md:min-h-0">
      <Card className="p-3 mb-4 lg:mb-0 flex flex-col min-h-[360px]">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-1 text-base mb-2">
          <span>
            <span className="text-ink-faint">Početak </span>
            <b className="text-[#2563eb]">{start ? `${start.kg} kg` : '—'}</b>
            <span className="text-ink-faint"> ({fmtShort(startDate)})</span>
          </span>
          <span>
            <span className="text-ink-faint">Sada </span>
            <b>{last ? `${last.data.kg} kg` : '—'}</b>
            {start && last && last.data.date >= startDate && (
              <b className={last.data.kg >= start.kg ? 'text-emerald-600' : 'text-rose-600'}>
                {' '}
                ({last.data.kg >= start.kg ? '+' : ''}
                {(last.data.kg - start.kg).toFixed(1)})
              </b>
            )}
          </span>
          <span>
            <span className="text-ink-faint">Cilj </span>
            <b className="text-emerald-600">{target !== null ? `${target} kg` : '—'}</b>
            {kgGoal?.data.deadline && <span className="text-ink-faint"> do {fmtShort(kgGoal.data.deadline)}</span>}
          </span>
          {left !== null && (
            <span>
              <span className="text-ink-faint">Još </span>
              <b>{left > 0 ? `${left} kg` : 'cilj dostignut 🎉'}</b>
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <WeightChart
            weights={weights.map((w) => w.data)}
            startDate={startDate}
            startKg={start?.kg ?? null}
            targetKg={target}
            targetDate={kgGoal?.data.deadline ?? null}
          />
        </div>
      </Card>
      <div className="flex flex-col gap-3 min-h-0">
        <Card className="p-3">
          <div className="text-xs font-semibold mb-1.5">Nova kilaža</div>
          <div className="flex flex-col gap-2">
            <input inputMode="decimal" className="w-full" placeholder="kg" value={kg} onChange={(e) => setKg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
            <input type="date" className="w-full" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button variant="primary" className="w-full mt-2" onClick={save}>
            Upiši kg
          </Button>
        </Card>
        <Card className="px-3 py-1 min-h-0 flex-1 overflow-y-auto">
          <ul className="divide-y divide-line">
            {[...weights].reverse().map((w) => (
              <li key={w.id} className="flex items-center py-1 text-sm">
                <span className="flex-1 text-ink-soft">{fmtShort(w.data.date)}</span>
                <span className="tabular font-medium mr-2">{w.data.kg} kg</span>
                <IconButton title="Obriši" onClick={() => store.remove(w.id)} className="w-7 h-7">
                  <Trash2 size={13} />
                </IconButton>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

/** Boja trake: crvena na početku, žuta na pola, zelena kad je cilj ispunjen. */
export function goalColor(ratio: number): string {
  const r = Math.max(0, ratio)
  if (r >= 1) return 'hsl(135 65% 40%)' // cilj ispunjen — zelena
  const hue = Math.round(48 * Math.pow(r, 1.4)) // crvena → narandžasta → žuta
  return `hsl(${hue} 80% 50%)`
}

// ---------------- Traka dana (cilj ispunjen ili ne) ----------------

function dayStatus(date: string, kcalGoal: number, proteinGoal: number) {
  const md = mealDayFor(date)
  const t = totals(md?.data.meals ?? [])
  const ok = t.kcal >= kcalGoal && t.protein >= proteinGoal
  return { t, ok, has: !!md && md.data.meals.length > 0 }
}

function DayStrip({ selected }: { selected: string }) {
  useVersion()
  const [settings] = useSettings()
  const DAYS = 60
  const end = today()
  const start = addDays(end, -(DAYS - 1))
  const firstData = store
    .list<MealDayData>('mealday')
    .filter((m) => m.data.meals.length > 0)
    .map((m) => m.data.date)
    .sort()[0]
  const trackFrom = [firstData, settings.bulkStart].filter(Boolean).sort()[0] ?? end
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i))
  let streakN = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i]
    const st = dayStatus(d, settings.kcalGoal, settings.proteinGoal)
    if (d === end && !st.ok) continue // današnji dan još traje
    if (st.ok) streakN++
    else break
  }
  const tracked = days.filter((d) => d >= trackFrom && d < end)
  const okCount = tracked.filter((d) => dayStatus(d, settings.kcalGoal, settings.proteinGoal).ok).length
  return (
    <div className="mt-3 pt-3 border-t border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5 text-sm">
        <span className="font-semibold">Poslednjih {DAYS} dana</span>
        <span className="text-ink-soft">
          Cilj ispunjen <b className="text-emerald-600">{okCount}</b> od {tracked.length} dana · niz <b>{streakN}</b>
        </span>
      </div>
      <div className="flex h-8 rounded-lg overflow-hidden border border-line">
        {days.map((d) => {
          const st = dayStatus(d, settings.kcalGoal, settings.proteinGoal)
          const before = d < trackFrom
          const isToday = d === end
          const bg = before ? 'rgb(var(--paper-sunk))' : st.ok ? '#16a34a' : isToday ? 'rgb(var(--paper-sunk))' : '#e11d48'
          return (
            <button
              key={d}
              onClick={() => go('ishrana', d)}
              title={`${fmtShort(d)}: ${st.t.kcal} kcal · ${st.t.protein} g${st.ok ? ' ✓' : ''}`}
              className={cx('flex-1 border-r border-black/10 last:border-r-0 hover:opacity-80 transition', d === selected && 'ring-2 ring-inset ring-ink')}
              style={{ background: bg }}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-ink-faint mt-1">
        <span>{fmtShort(start)}</span>
        <span className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#16a34a]" /> ispunjeno
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#e11d48]" /> nije
          </span>
        </span>
        <span>danas</span>
      </div>
    </div>
  )
}

// ---------------- Istorija ishrane ----------------

function HistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const days = useKind<MealDayData>('mealday')
    .filter((m) => m.data.meals.length > 0)
    .sort((a, b) => b.data.date.localeCompare(a.data.date))
  const [settings] = useSettings()
  return (
    <Modal open={open} onClose={onClose} wide title="Istorija ishrane">
      {days.length === 0 ? (
        <Empty>Još nema upisanih dana.</Empty>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {days.map((md) => {
            const t = totals(md.data.meals)
            const ok = t.kcal >= settings.kcalGoal && t.protein >= settings.proteinGoal
            return (
              <div key={md.id} className={cx('rounded-xl border-2 p-3', ok ? 'meal-done' : md.data.date === today() ? 'border-line' : 'meal-todo')}>
                <div className="flex items-baseline justify-between gap-2">
                  <button
                    className="font-semibold hover:underline text-left"
                    onClick={() => {
                      onClose()
                      go('ishrana', md.data.date)
                    }}
                  >
                    {fmtLong(md.data.date)}
                  </button>
                  <span className="text-xs">{ok ? '✓ cilj' : ''}</span>
                </div>
                <div className="text-sm tabular mt-0.5">
                  <b>{t.kcal}</b> kcal · <b>{t.protein}</b> g
                  <span className="text-ink-faint"> / {settings.kcalGoal} · {settings.proteinGoal} g</span>
                </div>
                <ul className="mt-2 space-y-0.5 text-sm">
                  {md.data.meals.map((m, i) => (
                    <li key={m.id} className={cx('flex justify-between gap-2', !m.eatenAt && 'line-through opacity-50')}>
                      <span className="truncate">
                        {i + 1}. {m.name}
                      </span>
                      <span className="tabular text-ink-soft shrink-0">
                        {m.eatenAt ? timeOf(m.eatenAt) + ' · ' : ''}
                        {m.kcal} kcal
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
