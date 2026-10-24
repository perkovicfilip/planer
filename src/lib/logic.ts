import { addDays, fromMin, iso, timeOf, toMin, weekday } from './dates'
import { store, useSingleton } from './store'
import { RASPORED, RASPORED_SUBJECTS, type ClassSlot } from '../data/raspored'
import { scheduleWeekday } from '../data/ftn'
import { DEFAULT_WEEKPLAN } from '../data/defaults'
import {
  DEFAULT_SETTINGS,
  type Category,
  type EventData,
  type HabitData,
  type Item,
  type Meal,
  type MealDayData,
  type SettingsData,
  type SubjectData,
  type WeekPlanData,
  type WeekPlanDay,
  type WorkoutData,
  type WorkoutLogData,
} from './types'

export function useSettings() {
  return useSingleton<SettingsData>('settings', DEFAULT_SETTINGS)
}
export function useWeekPlan() {
  return useSingleton<WeekPlanData>('weekplan', DEFAULT_WEEKPLAN)
}
export function getSettings(): SettingsData {
  const it = store.list<SettingsData>('settings').sort((a, b) => a.id.localeCompare(b.id))[0]
  return { ...DEFAULT_SETTINGS, ...(it?.data ?? {}) }
}
export function getWeekPlan(): WeekPlanData {
  const it = store.list<WeekPlanData>('weekplan').sort((a, b) => a.id.localeCompare(b.id))[0]
  return { ...DEFAULT_WEEKPLAN, ...(it?.data ?? {}) }
}

// ---------------- Događaji ----------------

export function occursOn(e: EventData, date: string): boolean {
  if (date < e.date) return false
  if (e.repeatUntil && date > e.repeatUntil) return false
  if (e.repeat === 'daily') return true
  if (e.repeat === 'weekly') return weekday(date) === weekday(e.date)
  if (e.repeat === 'yearly') return date.slice(5) === e.date.slice(5)
  return date <= (e.endDate || e.date)
}

export function eventsOn(events: Item<EventData>[], date: string) {
  return events
    .filter((e) => occursOn(e.data, date))
    .sort((a, b) => (a.data.start || '99').localeCompare(b.data.start || '99'))
}

export function isEventDone(e: EventData, date: string) {
  return (e.doneDates ?? []).includes(date)
}

export function toggleEventDone(id: string, date: string) {
  store.update<EventData>(id, (d) => {
    const set = new Set(d.doneDates ?? [])
    if (set.has(date)) set.delete(date)
    else set.add(date)
    return { ...d, doneDates: [...set] }
  })
}

export function categoryMap(): Map<string, Category> {
  const m = new Map<string, Category>()
  for (const c of store.list<Category>('category')) m.set(c.id, c.data)
  return m
}

// ---------------- Raspored ----------------

export interface ClassToday extends ClassSlot {
  subjectId?: string
  attending: boolean
  name: string
}

/** Časovi za datum, za grupe izabrane po predmetu. */
export function classesOn(date: string, subjects: Item<SubjectData>[], includeAll = false): ClassToday[] {
  const wd = scheduleWeekday(date, weekday(date))
  if (wd === null) return []
  const byKey = new Map<string, Item<SubjectData>>()
  for (const s of subjects) if (s.data.rasporedKey) byKey.set(s.data.rasporedKey, s)
  const out: ClassToday[] = []
  for (const slot of RASPORED) {
    if (slot.day !== wd) continue
    const subj = byKey.get(slot.subject)
    const group = subj?.data.group ?? '1'
    if (slot.group !== 'SVI' && slot.group !== group) continue
    const attending = subj
      ? slot.type === 'pred'
        ? !!subj.data.attendLectures
        : !!subj.data.attendExercises
      : false
    if (!attending && !includeAll) continue
    out.push({
      ...slot,
      subjectId: subj?.id,
      attending,
      name: subj?.data.name ?? RASPORED_SUBJECTS[slot.subject]?.name ?? slot.subject,
    })
  }
  return out.sort((a, b) => a.from.localeCompare(b.from))
}

export function classKey(date: string, c: ClassSlot) {
  return `cas:${date}:${c.subject}:${c.type}:${c.from}`
}

// ---------------- Trening ----------------

export function planFor(date: string, plan: WeekPlanData): WeekPlanDay {
  return plan.days[weekday(date)] ?? { activity: 'odmor', time: '06:00', duration: 60 }
}

export function workoutLogFor(date: string): Item<WorkoutLogData> | undefined {
  return store.list<WorkoutLogData>('workoutlog').find((w) => w.data.date === date)
}

export function workoutTitle(day: WeekPlanDay): string {
  if (day.activity === 'plivanje') return 'Plivanje'
  if (day.activity === 'odmor') return 'Odmor'
  const w = day.workoutId ? store.get<WorkoutData>(day.workoutId) : undefined
  return w ? `Teretana — ${w.data.name}` : 'Teretana'
}

export function toggleWorkoutDone(date: string) {
  const plan = getWeekPlan()
  const day = planFor(date, plan)
  const log = workoutLogFor(date)
  if (log) store.update<WorkoutLogData>(log.id, (d) => ({ ...d, done: !d.done }))
  else
    store.put<WorkoutLogData>('workoutlog', {
      date,
      type: day.activity === 'plivanje' ? 'plivanje' : day.activity === 'teretana' ? 'teretana' : 'drugo',
      workoutId: day.workoutId,
      title: workoutTitle(day),
      sets: [],
      done: true,
    })
}

// ---------------- Navike ----------------

export function habitDue(h: HabitData, date: string) {
  return h.days.includes(weekday(date))
}
export function habitDone(h: HabitData, date: string) {
  return h.doneDates.includes(date)
}
export function toggleHabit(id: string, date: string) {
  store.update<HabitData>(id, (d) => {
    const set = new Set(d.doneDates)
    if (set.has(date)) set.delete(date)
    else set.add(date)
    return { ...d, doneDates: [...set].sort() }
  })
}
/** Niz uzastopnih dana (samo dani kad je navika zakazana). */
export function streak(h: HabitData, until: string = iso()): number {
  let n = 0
  let d = until
  if (!habitDone(h, d)) d = addDays(d, -1) // danas se još ne računa ako nije štiklirano
  for (let i = 0; i < 2000; i++) {
    if (habitDue(h, d)) {
      if (habitDone(h, d)) n++
      else break
    }
    d = addDays(d, -1)
  }
  return n
}
export function bestStreak(h: HabitData): number {
  if (!h.doneDates.length) return 0
  const sorted = [...h.doneDates].sort()
  let best = 0
  let cur = 0
  let d = sorted[0]
  const last = sorted[sorted.length - 1]
  const set = new Set(sorted)
  while (d <= last) {
    if (habitDue(h, d)) {
      if (set.has(d)) {
        cur++
        best = Math.max(best, cur)
      } else cur = 0
    }
    d = addDays(d, 1)
  }
  return best
}

// ---------------- Ishrana ----------------

export function mealDayFor(date: string): Item<MealDayData> | undefined {
  return store.list<MealDayData>('mealday').find((m) => m.data.date === date)
}

export function ensureMealDay(date: string): string {
  const ex = mealDayFor(date)
  if (ex) return ex.id
  return store.put<MealDayData>('mealday', { date, meals: [] }, `mealday-${date}`)
}

export function totals(meals: Meal[], onlyEaten = true) {
  let kcal = 0
  let protein = 0
  for (const m of meals) {
    if (onlyEaten && !m.eatenAt) continue
    kcal += m.kcal
    protein += m.protein
  }
  return { kcal, protein }
}

/**
 * Prosečan razmak između obroka (u minutima), naučen iz poslednjih 21 dana.
 * Ne računa razmake vezane za obroke pre/posle treninga.
 */
export function learnedGap(settings: SettingsData, upTo: string = iso()): { gap: number; samples: number } {
  const from = addDays(upTo, -21)
  const gaps: number[] = []
  for (const md of store.list<MealDayData>('mealday')) {
    if (md.data.date < from || md.data.date > upTo) continue
    const eaten = md.data.meals
      .filter((m) => m.eatenAt)
      .sort((a, b) => a.eatenAt!.localeCompare(b.eatenAt!))
    for (let i = 0; i + 1 < eaten.length; i++) {
      const a = eaten[i]
      const b = eaten[i + 1]
      if (a.slot === 'pre' || b.slot === 'pre' || b.slot === 'post') continue
      const g = (new Date(b.eatenAt!).getTime() - new Date(a.eatenAt!).getTime()) / 60000
      if (g >= 45 && g <= 360) gaps.push(g)
    }
  }
  if (gaps.length < 3) return { gap: settings.mealGapDefault, samples: gaps.length }
  const avg = gaps.reduce((s, x) => s + x, 0) / gaps.length
  return { gap: Math.round(avg / 5) * 5, samples: gaps.length }
}

/** Očekivano vreme svakog obroka (minuti od ponoći) ili null ako se još ne može odrediti. */
export function expectedTimes(
  date: string,
  meals: Meal[],
  settings: SettingsData,
  plan: WeekPlanData,
): (number | null)[] {
  const day = planFor(date, plan)
  const hasTraining = day.activity !== 'odmor'
  const tStart = toMin(day.time)
  const tEnd = tStart + day.duration
  const gap = learnedGap(settings, addDays(date, -1)).gap
  const out: (number | null)[] = []
  let prev: number | null = null
  for (const m of meals) {
    let t: number | null = null
    if (m.eatenAt) t = toMin(timeOf(m.eatenAt))
    else if (m.time) t = toMin(m.time)
    else if (m.slot === 'pre' && hasTraining) t = tStart - settings.preMealBefore
    else if (m.slot === 'post' && hasTraining) t = tEnd + 15
    else if (prev !== null) t = prev + gap
    out.push(t)
    if (t !== null) prev = m.eatenAt ? toMin(timeOf(m.eatenAt)) : t
  }
  return out
}

export function mealRemindAt(expected: number | null, m: Meal, settings: SettingsData): number | null {
  if (expected === null || m.eatenAt) return null
  return expected + (m.remindAfter ?? settings.remindDelay)
}

export const fmtTime = (m: number | null) => (m === null ? '—' : fromMin(m))

// ---------------- Obaveze dana (za "Danas" i notifikacije) ----------------

export interface Obligation {
  key: string
  title: string
  time?: string
  color: string
  kind: 'event' | 'class' | 'training' | 'habit' | 'meal'
  done: boolean
  toggle: () => void
  sub?: string
}

export function obligationsFor(date: string): Obligation[] {
  const settings = getSettings()
  const plan = getWeekPlan()
  const cats = categoryMap()
  const out: Obligation[] = []

  for (const e of eventsOn(store.list<EventData>('event'), date)) {
    // višednevni događaji (npr. Na putu) nisu obaveza za štikliranje
    if (e.data.endDate && e.data.endDate !== e.data.date && !e.data.start) continue
    const c = e.data.categoryId ? cats.get(e.data.categoryId) : undefined
    out.push({
      key: 'ev:' + e.id + ':' + date,
      title: e.data.title,
      time: e.data.start,
      color: c?.color ?? '#64748b',
      kind: 'event',
      done: isEventDone(e.data, date),
      toggle: () => toggleEventDone(e.id, date),
      sub: c?.name,
    })
  }

  const subjects = store.list<SubjectData>('subject')
  const doneClasses = new Set(store.list<{ keys: string[] }>('meta').find((m) => m.id === 'classes-done')?.data.keys ?? [])
  for (const cl of classesOn(date, subjects)) {
    const key = classKey(date, cl)
    const subj = cl.subjectId ? store.get<SubjectData>(cl.subjectId) : undefined
    const c = subj?.data.categoryId ? cats.get(subj.data.categoryId) : undefined
    out.push({
      key,
      title: `${cl.name} — ${cl.type === 'pred' ? 'predavanje' : 'vežbe'}`,
      time: cl.from,
      color: c?.color ?? '#6366f1',
      kind: 'class',
      done: doneClasses.has(key),
      toggle: () => toggleClassDone(key),
      sub: cl.room,
    })
  }

  const day = planFor(date, plan)
  if (day.activity !== 'odmor') {
    const log = workoutLogFor(date)
    out.push({
      key: 'tr:' + date,
      title: workoutTitle(day),
      time: day.time,
      color: day.activity === 'plivanje' ? '#06b6d4' : '#10b981',
      kind: 'training',
      done: !!log?.data.done,
      toggle: () => toggleWorkoutDone(date),
    })
  }

  for (const h of store.list<HabitData>('habit').sort((a, b) => a.data.order - b.data.order)) {
    if (!habitDue(h.data, date)) continue
    out.push({
      key: 'hb:' + h.id + ':' + date,
      title: h.data.alias || h.data.name,
      time: h.data.time,
      color: h.data.color,
      kind: 'habit',
      done: habitDone(h.data, date),
      toggle: () => toggleHabit(h.id, date),
    })
  }

  const md = mealDayFor(date)
  if (md) {
    const exp = expectedTimes(date, md.data.meals, settings, plan)
    md.data.meals.forEach((m, i) => {
      out.push({
        key: 'ml:' + m.id,
        title: m.name,
        time: exp[i] !== null ? fromMin(exp[i]!) : undefined,
        color: '#f59e0b',
        kind: 'meal',
        done: !!m.eatenAt,
        toggle: () => (m.eatenAt ? setMealEaten(date, m.id, null) : markMealEaten(date, m.id)),
        sub: `${m.kcal} kcal · ${m.protein} g`,
      })
    })
  }

  return out.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
}

export function toggleClassDone(key: string) {
  const ex = store.get<{ keys: string[] }>('classes-done')
  if (!ex) {
    store.put('meta', { keys: [key] }, 'classes-done')
    return
  }
  store.update<{ keys: string[] }>('classes-done', (d) => {
    const set = new Set(d.keys)
    if (set.has(key)) set.delete(key)
    else set.add(key)
    // čuvaj samo poslednjih ~60 dana
    const cutoff = 'cas:' + addDays(iso(), -60)
    return { keys: [...set].filter((k) => k >= cutoff) }
  })
}

export function setMealEaten(date: string, mealId: string, eatenAt: string | null) {
  const id = ensureMealDay(date)
  store.update<MealDayData>(id, (d) => ({
    ...d,
    meals: d.meals.map((m) => (m.id === mealId ? { ...m, eatenAt: eatenAt ?? undefined } : m)),
  }))
}

/** Vreme obroka: 10 minuta pre trenutka kad je štikliran. */
export function eatenTimeFrom(clickedAt: number = Date.now()): string {
  return new Date(clickedAt - 10 * 60000).toISOString()
}

export function markMealEaten(date: string, mealId: string, clickedAt?: number) {
  let t = eatenTimeFrom(clickedAt)
  if (iso(new Date(t)) !== date) {
    // upisuješ za neki drugi dan — zadrži taj datum, a vreme uzmi sa sata
    const d = new Date(t)
    const [y, m, dd] = date.split('-').map(Number)
    t = new Date(y, m - 1, dd, d.getHours(), d.getMinutes()).toISOString()
  }
  setMealEaten(date, mealId, t)
}
