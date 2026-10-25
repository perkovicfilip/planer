import { store } from '../lib/store'
import type { Category, HabitData, WeekPlanData } from '../lib/types'

// Osnovne kategorije i navike koje se prave pri prvom pokretanju.
// Sve se posle menja u aplikaciji.

export const PALETTE = [
  '#e11d48', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#78716c', '#334155',
]

export const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Wolt', color: '#009de0', group: 'posao', order: 1 },
  { name: 'Glovo', color: '#00a082', group: 'posao', order: 2 },
  { name: 'Posao', color: '#78716c', group: 'posao', order: 3 },
  { name: 'Na putu', color: '#8b5cf6', group: 'licno', order: 4 },
  { name: 'Učenje', color: '#6366f1', group: 'fakultet', order: 5 },
  { name: 'Teretana', color: '#10b981', group: 'sport', order: 6 },
  { name: 'Plivanje', color: '#06b6d4', group: 'sport', order: 7 },
  { name: 'Lično', color: '#ec4899', group: 'licno', order: 8 },
  { name: 'Rođendan', color: '#f97316', group: 'licno', order: 9 },
]

export const DEFAULT_HABITS: HabitData[] = [
  { name: 'Vežbe disanja (10 min)', color: '#14b8a6', days: [0, 1, 2, 3, 4, 5, 6], order: 1, doneDates: [] },
]

export const DEFAULT_WEEKPLAN: WeekPlanData = {
  days: [
    { activity: 'plivanje', time: '06:25', duration: 60 },
    { activity: 'teretana', time: '06:00', duration: 75 },
    { activity: 'plivanje', time: '06:25', duration: 60 },
    { activity: 'teretana', time: '06:00', duration: 75 },
    { activity: 'plivanje', time: '06:25', duration: 60 },
    { activity: 'teretana', time: '06:00', duration: 75 },
    { activity: 'teretana', time: '06:00', duration: 75 },
  ],
}

/** Ako je baza prazna (prvi put), ubaci osnovne kategorije i navike. */
export function ensureDefaults() {
  // samo kad znamo pravo stanje baze (da ne napravimo duplikate dok smo offline)
  if (store.status !== 'sinhronizovano' && store.status !== 'lokalno') return
  const marker = store.get('setup-done')
  if (marker) return
  if (store.list('category').length === 0) {
    store.bulk(DEFAULT_CATEGORIES.map((c) => ({ kind: 'category' as const, data: c })))
  }
  if (store.list('habit').length === 0) {
    store.bulk(DEFAULT_HABITS.map((h) => ({ kind: 'habit' as const, data: h })))
  }
  store.put('meta', { setupDone: true }, 'setup-done')
}

/** Jednokratno: kalendar kreće prazan — brišu se sve aktivnosti (kategorije) i događaji. */
export function ensureCalendarReset() {
  if (store.status !== 'sinhronizovano' && store.status !== 'lokalno') return
  if (store.get('calendar-reset-1')) return
  for (const c of store.list('category')) store.remove(c.id)
  for (const e of store.list('event')) store.remove(e.id)
  store.put('meta', { done: true }, 'calendar-reset-1')
}
