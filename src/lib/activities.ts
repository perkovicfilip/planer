import { store } from './store'
import { weekday } from './dates'
import type { ActDayData, ActivityData, HabitData, Item, LoggedSet, WeekPlanData, WorkoutData } from './types'

export const actDayId = (date: string) => `actday-${date}`

export function listActivities(): Item<ActivityData>[] {
  return store.list<ActivityData>('activity').sort((a, b) => a.data.order - b.data.order)
}

export function actDay(date: string): ActDayData | undefined {
  return store.get<ActDayData>(actDayId(date))?.data
}

function updateDay(date: string, fn: (d: ActDayData) => ActDayData) {
  const id = actDayId(date)
  if (store.get(id)) store.update<ActDayData>(id, (d) => fn({ ...d, done: d.done ?? [] }))
  else store.put<ActDayData>('actday', fn({ date, done: [] }), id)
}

/** Aktivnosti za dan: izmenjen raspored ako postoji, inače podrazumevani nedeljni. */
export function activitiesOn(date: string): Item<ActivityData>[] {
  const all = listActivities()
  const day = actDay(date)
  if (day?.activities) {
    const byId = new Map(all.map((a) => [a.id, a]))
    return day.activities.map((id) => byId.get(id)).filter((a): a is Item<ActivityData> => !!a)
  }
  const wd = weekday(date)
  return all.filter((a) => a.data.days.includes(wd))
}

export function isChanged(date: string) {
  return !!actDay(date)?.activities
}

export function isDone(date: string, activityId: string) {
  return !!actDay(date)?.done.includes(activityId)
}

export function toggleDone(date: string, activityId: string) {
  updateDay(date, (d) => {
    const set = new Set(d.done)
    if (set.has(activityId)) set.delete(activityId)
    else set.add(activityId)
    return { ...d, done: [...set] }
  })
}

export function workoutFor(date: string, act: Item<ActivityData>): Item<WorkoutData> | undefined {
  const id = actDay(date)?.workouts?.[act.id] ?? act.data.dayWorkouts?.[String(weekday(date))]
  return id ? store.get<WorkoutData>(id) : undefined
}

export function setDayWorkout(date: string, actId: string, workoutId: string | undefined) {
  updateDay(date, (d) => {
    const w = { ...(d.workouts ?? {}) }
    if (workoutId) w[actId] = workoutId
    else delete w[actId]
    return { ...d, workouts: w }
  })
}

/** Promeni raspored samo za taj dan (dodaj ili skloni aktivnost). */
export function setDayActivities(date: string, ids: string[]) {
  updateDay(date, (d) => ({ ...d, activities: ids }))
}

export function resetDay(date: string) {
  updateDay(date, (d) => {
    const { activities: _a, workouts: _w, ...rest } = d
    void _a
    void _w
    return { ...rest, done: d.done }
  })
}

export function setsFor(date: string, actId: string): LoggedSet[] {
  return actDay(date)?.sets?.[actId] ?? []
}

export function setSets(date: string, actId: string, sets: LoggedSet[]) {
  updateDay(date, (d) => ({ ...d, sets: { ...(d.sets ?? {}), [actId]: sets } }))
}

/** Poslednje serije za vežbu pre datuma (za „prošli put“). */
export function lastSets(exerciseId: string, before: string): LoggedSet[] {
  const days = store
    .list<ActDayData>('actday')
    .filter((d) => d.data.date < before && d.data.sets)
    .sort((a, b) => b.data.date.localeCompare(a.data.date))
  for (const d of days) {
    for (const list of Object.values(d.data.sets ?? {})) {
      const s = list.filter((x) => x.exerciseId === exerciseId && (x.kg !== null || x.reps !== null))
      if (s.length) return s
    }
  }
  return []
}

export type DayState = 'none' | 'done' | 'missed' | 'pending'

export function dayState(date: string, todayIso: string): DayState {
  const acts = activitiesOn(date)
  if (acts.length === 0) return 'none'
  const done = actDay(date)?.done ?? []
  if (acts.every((a) => done.includes(a.id))) return 'done'
  return date >= todayIso ? 'pending' : 'missed'
}

