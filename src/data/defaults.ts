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
  { name: 'Posao', color: '#78716c', group: 'posao', order: 1 },
  { name: 'Učenje', color: '#6366f1', group: 'fakultet', order: 2 },
  { name: 'Sport', color: '#10b981', group: 'sport', order: 3 },
  { name: 'Lično', color: '#ec4899', group: 'licno', order: 4 },
  { name: 'Rođendan', color: '#f97316', group: 'licno', order: 5 },
]

export const DEFAULT_HABITS: HabitData[] = []

export const DEFAULT_WEEKPLAN: WeekPlanData = {
  days: Array.from({ length: 7 }, () => ({ activity: 'odmor' as const, time: '06:00', duration: 60 })),
}

/** Ako je baza prazna (prvi put), ubaci osnovne kategorije. */
export function ensureDefaults() {
  // samo kad znamo pravo stanje baze (da ne napravimo duplikate dok smo offline)
  if (store.status !== 'sinhronizovano' && store.status !== 'lokalno') return
  const marker = store.get('setup-done')
  if (marker) return
  if (store.list('category').length === 0) {
    store.bulk(DEFAULT_CATEGORIES.map((c) => ({ kind: 'category' as const, data: c })))
  }
  store.put('meta', { setupDone: true }, 'setup-done')
}
