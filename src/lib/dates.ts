export const MONTHS = [
  'januar', 'februar', 'mart', 'april', 'maj', 'jun',
  'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar',
]
export const MONTHS_GEN = [
  'januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
  'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra',
]
export const DAYS_SHORT = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']
export const DAYS_MIN = ['P', 'U', 'S', 'Č', 'P', 'S', 'N']
export const DAYS_LONG = ['Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja']

const pad = (n: number) => String(n).padStart(2, '0')

/** Lokalni datum u formatu YYYY-MM-DD. */
export function iso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

/** 0 = ponedeljak ... 6 = nedelja */
export function weekday(s: string): number {
  return (parse(s).getDay() + 6) % 7
}

export function isWeekend(s: string) {
  return weekday(s) >= 5
}

export function today() {
  return iso()
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)
}

export function fmtLong(s: string): string {
  const d = parse(s)
  return `${DAYS_LONG[weekday(s)]}, ${d.getDate()}. ${MONTHS_GEN[d.getMonth()]}`
}

export function fmtShort(s: string): string {
  const d = parse(s)
  return `${d.getDate()}. ${MONTHS_GEN[d.getMonth()]}`
}

export function fmtNum(s: string): string {
  const d = parse(s)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`
}

export function relDay(s: string): string {
  const diff = daysBetween(today(), s)
  if (diff === 0) return 'Danas'
  if (diff === 1) return 'Sutra'
  if (diff === 2) return 'Prekosutra'
  if (diff === -1) return 'Juče'
  if (diff > 0 && diff < 7) return DAYS_LONG[weekday(s)]
  return fmtShort(s)
}

export function inDays(s: string): string {
  const diff = daysBetween(today(), s)
  if (diff === 0) return 'danas'
  if (diff === 1) return 'sutra'
  if (diff < 0) return `pre ${-diff} d`
  return `za ${diff} d`
}

/** "HH:MM" -> minuti od ponoći */
export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
export function fromMin(m: number): string {
  const mm = ((Math.round(m) % 1440) + 1440) % 1440
  return `${pad(Math.floor(mm / 60))}:${pad(mm % 60)}`
}

export function timeOf(isoStr: string): string {
  const d = new Date(isoStr)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function nowMin(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** Mreža meseca: nedelje počinju ponedeljkom; null = prazno polje. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= days; d++) cells.push(iso(new Date(year, month, d)))
  while (cells.length % 7) cells.push(null)
  const rows: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

/** Ponedeljak nedelje u kojoj je datum. */
export function weekStart(s: string): string {
  return addDays(s, -weekday(s))
}
