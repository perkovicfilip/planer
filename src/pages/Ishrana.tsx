import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, Plus, Star, Trash2, ArrowUp, ArrowDown, Pencil, Search } from 'lucide-react'
import { store, uid, useKind, useVersion } from '../lib/store'
import type { FoodData, Meal, MealDayData, MealSlot, WeightData } from '../lib/types'
import { addDays, fmtShort, relDay, timeOf, today, fromMin } from '../lib/dates'
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
  const [copyOpen, setCopyOpen] = useState(false)

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
    <div>
      <div className="flex items-center gap-1 mb-4">
        <IconButton title="Prethodni dan" onClick={() => go('ishrana', addDays(date, -1))}>
          <ChevronLeft size={18} />
        </IconButton>
        <div className="text-center min-w-[120px]">
          <div className="font-semibold">{relDay(date)}</div>
          <div className="text-xs text-ink-faint">{fmtShort(date)}</div>
        </div>
        <IconButton title="Sledeći dan" onClick={() => go('ishrana', addDays(date, 1))}>
          <ChevronRight size={18} />
        </IconButton>
        {date !== today() && (
          <Button variant="ghost" onClick={() => go('ishrana')}>
            Danas
          </Button>
        )}
        <Button className="ml-auto" onClick={() => setCopyOpen(true)}>
          <Copy size={15} /> Kopiraj
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
            <Progress value={eaten.kcal} max={settings.kcalGoal} color="#f59e0b" height={10} />
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
            <Progress value={eaten.protein} max={settings.proteinGoal} color="#e11d48" height={10} />
          </div>
          <div className="text-xs text-ink-faint mt-1.5">Planirano {planned.protein} g</div>
        </Card>
      </div>

      <SectionTitle>Obroci</SectionTitle>
      <Card className="px-4 py-1 mb-3">
        {meals.length === 0 ? (
          <Empty>Nema obroka za ovaj dan.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {meals.map((m, i) => {
              const remind = mealRemindAt(exp[i], m, settings)
              return (
                <li key={m.id} className="flex items-center gap-3 py-2">
                  <CheckCircle
                    done={!!m.eatenAt}
                    color="#f59e0b"
                    onClick={() => (m.eatenAt ? setMealEaten(date, m.id, null) : setPick(m))}
                  />
                  <div className={cx('flex-1 min-w-0', m.eatenAt && 'opacity-50')}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{m.name}</span>
                    </div>
                    <div className="text-xs text-ink-faint tabular">
                      {m.kcal} kcal · {m.protein} g proteina
                      {m.eatenAt
                        ? ` · pojeo u ${timeOf(m.eatenAt)}`
                        : m.time
                          ? ` · planirano u ${m.time}${remind !== null ? ` · podsetnik ${fromMin(remind)}` : ''}`
                          : ''}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <IconButton title="Gore" onClick={() => move(i, -1)} className="hidden sm:grid">
                      <ArrowUp size={15} />
                    </IconButton>
                    <IconButton title="Dole" onClick={() => move(i, 1)} className="hidden sm:grid">
                      <ArrowDown size={15} />
                    </IconButton>
                    <IconButton title="Izmeni" onClick={() => setEditing(m)}>
                      <Pencil size={15} />
                    </IconButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <Button variant="primary" onClick={() => setAdding(true)}>
        <Plus size={16} /> Dodaj obrok
      </Button>

      {meals.length > 0 && (missingKcal > 0 || missingProt > 0) && (
        <Suggestions kcal={missingKcal} protein={missingProt} onAdd={(f) => addFood(date, f, meals, day.activity !== 'odmor')} />
      )}

      <AddMeal open={adding} onClose={() => setAdding(false)} onAdd={(f) => addFood(date, f, meals, day.activity !== 'odmor')} />
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
      <CopyDay open={copyOpen} onClose={() => setCopyOpen(false)} target={date} />
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

function Suggestions({ kcal, protein, onAdd }: { kcal: number; protein: number; onAdd: (f: { id: string; data: FoodData }) => void }) {
  const foods = useKind<FoodData>('food')
  const picks = useMemo(() => {
    return [...foods]
      .filter((f) => f.data.kcal > 0)
      .map((f) => {
        // koliko dobro pokriva ono što fali (više proteina je bitnije kad fali proteina)
        const kScore = kcal > 0 ? Math.min(f.data.kcal, kcal) / Math.max(kcal, 1) : 0
        const pScore = protein > 0 ? Math.min(f.data.protein, protein) / Math.max(protein, 1) : 0
        const over = Math.max(0, f.data.kcal - kcal - 300) / 1000
        return { f, score: kScore + pScore * 1.3 - over + (f.data.favorite ? 0.1 : 0) }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [foods, kcal, protein])
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

function AddMeal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (f: { id?: string; data: FoodData }) => void }) {
  const foods = useKind<FoodData>('food')
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState<FoodData>({ name: '', kcal: 0, protein: 0 })
  const [saveToList, setSaveToList] = useState(true)
  const list = [...foods]
    .filter((f) => f.data.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(!!b.data.favorite) - Number(!!a.data.favorite) || a.data.name.localeCompare(b.data.name, 'sr', { numeric: true }))

  const addCustom = () => {
    if (!custom.name.trim()) return
    let id: string | undefined
    if (saveToList) id = store.put<FoodData>('food', { ...custom, name: custom.name.trim() })
    onAdd({ id, data: { ...custom, name: custom.name.trim() } })
    setCustom({ name: '', kcal: 0, protein: 0 })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Dodaj obrok">
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input className="w-full pl-9" placeholder="Pretraži svoje obroke…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="max-h-64 overflow-y-auto -mx-2 mb-4">
        {list.length === 0 && <div className="text-sm text-ink-faint px-2 py-3">Nema obroka u listi — upiši novi ispod.</div>}
        {list.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              onAdd(f)
              onClose()
            }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-paper-sunk text-left"
          >
            {f.data.favorite && <Star size={13} className="text-amber-500 fill-amber-500" />}
            <span className="flex-1">{f.data.name}</span>
            <span className="text-xs text-ink-faint tabular">
              {f.data.kcal} kcal · {f.data.protein} g
            </span>
          </button>
        ))}
      </div>
      <div className="border-t border-line pt-3">
        <div className="text-sm font-medium mb-2">Novi obrok</div>
        <input className="w-full mb-2" placeholder="Naziv" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="number" placeholder="kcal" value={custom.kcal || ''} onChange={(e) => setCustom({ ...custom, kcal: Number(e.target.value) })} />
          <input type="number" placeholder="proteini (g)" value={custom.protein || ''} onChange={(e) => setCustom({ ...custom, protein: Number(e.target.value) })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft mb-3">
          <input type="checkbox" checked={saveToList} onChange={(e) => setSaveToList(e.target.checked)} />
          Sačuvaj i u listu obroka
        </label>
        <Button variant="primary" className="w-full" onClick={addCustom} disabled={!custom.name.trim()}>
          Dodaj
        </Button>
      </div>
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
  const last = weights[weights.length - 1]
  const first = weights[0]
  return (
    <div className="lg:grid lg:grid-cols-[1fr_260px] gap-4 md:flex-1 md:min-h-0">
      <Card className="p-3 mb-4 lg:mb-0 flex flex-col">
        {last && (
          <div className="text-sm text-ink-soft mb-2">
            Poslednje: <b className="text-ink">{last.data.kg} kg</b> ({fmtShort(last.data.date)})
            {first && first.id !== last.id && (
              <>
                {' '}
                · od početka{' '}
                <b className={last.data.kg >= first.data.kg ? 'text-emerald-600' : 'text-rose-600'}>
                  {last.data.kg >= first.data.kg ? '+' : ''}
                  {(last.data.kg - first.data.kg).toFixed(1)} kg
                </b>
              </>
            )}
          </div>
        )}
        <LineChart points={weights.slice(-60).map((w) => ({ x: fmtShort(w.data.date), y: w.data.kg }))} unit=" kg" color="#2563eb" height={440} ticks={6} />
      </Card>
      <div className="flex flex-col gap-3 min-h-0">
        <Card className="p-3">
          <div className="flex gap-2">
            <input inputMode="decimal" className="w-24" placeholder="kg" value={kg} onChange={(e) => setKg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
            <input type="date" className="flex-1 min-w-0" value={date} onChange={(e) => setDate(e.target.value)} />
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
