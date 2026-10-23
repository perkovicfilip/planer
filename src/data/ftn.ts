// FTN — Kalendar izvođenja nastave 2026/2027 (javni podaci fakulteta)

export type PeriodKind = 'rok' | 'dodatni' | 'neradni' | 'bez-nastave' | 'rangiranje'

export interface Period {
  id: string
  kind: PeriodKind
  name: string
  from: string
  to: string
  tint?: string // pozadina dana (blaga)
}

export const PERIODS: Period[] = [
  // Ispitni rokovi — nijanse plave/tirkizne, svaki rok svoja
  { id: 'rok-jan', kind: 'rok', name: 'Januarsko-februarski rok', from: '2027-01-18', to: '2027-02-07', tint: '#dbeafe' },
  { id: 'rok-apr', kind: 'rok', name: 'Aprilski rok', from: '2027-04-05', to: '2027-04-11', tint: '#ccfbf1' },
  { id: 'rok-jun', kind: 'rok', name: 'Junsko-julski rok', from: '2027-06-07', to: '2027-07-04', tint: '#e0e7ff' },
  { id: 'rok-avg', kind: 'rok', name: 'Avgustovsko-septembarski rok', from: '2027-08-23', to: '2027-09-12', tint: '#dbeafe' },
  { id: 'rok-sep', kind: 'rok', name: 'Dodatni septembarski rok', from: '2027-09-13', to: '2027-09-26', tint: '#cffafe' },

  // Dodatni rokovi samo za studente koji su odslušali celokupnu nastavu
  { id: 'dod-1', kind: 'dodatni', name: 'Dodatni rok (odslušana nastava)', from: '2026-11-07', to: '2026-11-08', tint: '#ecfccb' },
  { id: 'dod-2', kind: 'dodatni', name: 'Dodatni rok (odslušana nastava)', from: '2026-12-12', to: '2026-12-13', tint: '#ecfccb' },
  { id: 'dod-3', kind: 'dodatni', name: 'Dodatni rok (odslušana nastava)', from: '2027-03-13', to: '2027-03-14', tint: '#ecfccb' },
  { id: 'dod-4', kind: 'dodatni', name: 'Dodatni rok (odslušana nastava)', from: '2027-05-15', to: '2027-05-16', tint: '#ecfccb' },

  // Neradni dani
  { id: 'nr-primirje', kind: 'neradni', name: 'Dan primirja u Prvom svetskom ratu', from: '2026-11-11', to: '2026-11-11' },
  { id: 'nr-ng', kind: 'neradni', name: 'Nova godina', from: '2027-01-01', to: '2027-01-02' },
  { id: 'nr-bozic', kind: 'neradni', name: 'Božić', from: '2027-01-07', to: '2027-01-07' },
  { id: 'nr-sretenje', kind: 'neradni', name: 'Dan državnosti', from: '2027-02-15', to: '2027-02-16' },
  { id: 'nr-vaskrs', kind: 'neradni', name: 'Vaskršnji praznici', from: '2027-04-30', to: '2027-05-03' },
  { id: 'nr-rad', kind: 'neradni', name: 'Praznik rada', from: '2027-05-01', to: '2027-05-04' },

  // Dani kada nema nastave
  { id: 'bn-bozic', kind: 'bez-nastave', name: 'Prvi dan Božića (nema nastave)', from: '2026-12-25', to: '2026-12-25' },
  { id: 'bn-bozicni', kind: 'bez-nastave', name: 'Božićni praznici (nema nastave)', from: '2027-01-06', to: '2027-01-08' },
  { id: 'bn-uskrs', kind: 'bez-nastave', name: 'Uskršnji praznici (nema nastave)', from: '2027-03-26', to: '2027-03-29' },

  { id: 'rang', kind: 'rangiranje', name: 'Rangiranje za upis u višu godinu', from: '2027-09-27', to: '2027-10-01' },
]

/** Nadoknade: tog dana se radi po rasporedu drugog dana u nedelji (0=pon). */
export const MAKEUPS: { date: string; asWeekday: number; replaces: string }[] = [
  { date: '2026-11-14', asWeekday: 2, replaces: '2026-11-11' },
  { date: '2027-01-04', asWeekday: 4, replaces: '2026-12-25' },
  { date: '2027-01-05', asWeekday: 4, replaces: '2027-01-08' },
  { date: '2027-02-20', asWeekday: 0, replaces: '2027-02-15' },
  { date: '2027-02-27', asWeekday: 1, replaces: '2027-02-16' },
  { date: '2027-03-24', asWeekday: 4, replaces: '2027-03-26' },
  { date: '2027-03-25', asWeekday: 0, replaces: '2027-03-29' },
]

export const MILESTONES: { date: string; name: string }[] = [
  { date: '2026-12-28', name: 'Overa zimskog semestra' },
  { date: '2027-05-24', name: 'Overa letnjeg semestra' },
]

/** Periodi nastave (kad važi raspored časova). */
export const TEACHING: { from: string; to: string; semester: 'zimski' | 'letnji' }[] = [
  { from: '2026-09-28', to: '2027-01-17', semester: 'zimski' },
  { from: '2027-02-08', to: '2027-06-06', semester: 'letnji' },
]

export function periodsOn(date: string): Period[] {
  return PERIODS.filter((p) => date >= p.from && date <= p.to)
}

export function isHoliday(date: string) {
  return PERIODS.some((p) => p.kind === 'neradni' && date >= p.from && date <= p.to)
}

export function noClasses(date: string) {
  return PERIODS.some((p) => (p.kind === 'neradni' || p.kind === 'bez-nastave') && date >= p.from && date <= p.to)
}

export function examPeriod(date: string): Period | undefined {
  return PERIODS.find((p) => (p.kind === 'rok' || p.kind === 'dodatni') && date >= p.from && date <= p.to)
}

/** Koji dan rasporeda važi za datum (0=pon..4=pet), ili null ako nema nastave. */
export function scheduleWeekday(date: string, weekday: number): number | null {
  const mk = MAKEUPS.find((m) => m.date === date)
  if (mk) return mk.asWeekday
  if (noClasses(date)) return null
  const inTeaching = TEACHING.some((t) => date >= t.from && date <= t.to)
  if (!inTeaching) return null
  return weekday <= 4 ? weekday : null
}
