import { store } from './store'
import { getSettings } from './logic'
import type { GoalData, SubjectData, WeightData } from './types'

export function latestWeight(): WeightData | undefined {
  return store
    .list<WeightData>('weight')
    .map((w) => w.data)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
}

export function espbStats() {
  const s = getSettings()
  const subjects = store.list<SubjectData>('subject').map((x) => x.data)
  const passed = subjects.filter((x) => x.status === 'polozen')
  const espb = s.baseEspb + passed.reduce((a, x) => a + (x.espb || 0), 0)
  const graded = passed.filter((x) => x.grade && x.grade >= 6)
  const sumBase = s.baseAverage !== null ? s.baseAverage * s.basePassed : 0
  const n = (s.baseAverage !== null ? s.basePassed : 0) + graded.length
  const avg = n > 0 ? (sumBase + graded.reduce((a, x) => a + (x.grade ?? 0), 0)) / n : null
  const remaining = subjects.filter((x) => x.status !== 'polozen')
  return {
    espb,
    total: s.totalEspb,
    passedCount: s.basePassed + passed.length,
    passedInApp: passed.length,
    remaining: remaining.length,
    remainingEspb: remaining.reduce((a, x) => a + (x.espb || 0), 0),
    average: avg,
  }
}

export function goalProgress(g: GoalData): { current: number | null; pct: number; text: string } {
  let current: number | null = null
  let start = g.start ?? 0
  if (g.type === 'kg') {
    const w = latestWeight()
    current = w?.kg ?? null
    if (g.start === undefined) {
      const first = store
        .list<WeightData>('weight')
        .map((x) => x.data)
        .sort((a, b) => a.date.localeCompare(b.date))[0]
      start = first?.kg ?? current ?? 0
    }
  } else if (g.type === 'espb') {
    current = espbStats().espb
  } else if (g.type === 'predmeti') {
    current = espbStats().passedInApp
  } else {
    current = g.current ?? 0
  }
  const unit = g.unit ?? (g.type === 'kg' ? 'kg' : g.type === 'espb' ? 'ESPB' : g.type === 'novac' ? 'din' : '')
  if (current === null) return { current, pct: 0, text: `cilj ${fmt(g.target)} ${unit}` }
  const span = g.target - start
  const pct = span === 0 ? 100 : Math.max(0, Math.min(100, ((current - start) / span) * 100))
  return { current, pct, text: `${fmt(current)} / ${fmt(g.target)} ${unit}`.trim() }
}

export function fmt(n: number) {
  return Number.isInteger(n) ? n.toLocaleString('sr-Latn-RS') : n.toLocaleString('sr-Latn-RS', { maximumFractionDigits: 1 })
}
