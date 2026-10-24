import { store } from './store'
import { getSettings } from './logic'
import type { FinCategory, Item, TransactionData, TxType } from './types'

// Osnovne kategorije — sve se menjaju u aplikaciji.
export const DEFAULT_FINCATS: (FinCategory & { id: string })[] = [
  { id: 'fc-wolt', name: 'Wolt', type: 'prihod', color: '#009de0', keywords: ['wolt'], order: 1 },
  { id: 'fc-glovo', name: 'Glovo', type: 'prihod', color: '#00a082', keywords: ['glovo'], order: 2 },
  { id: 'fc-ujak', name: 'Rad kod ujaka', type: 'prihod', color: '#78716c', keywords: ['ujak', 'ujka', 'montaza', 'montaža', 'led'], order: 3 },
  { id: 'fc-stipendija', name: 'Stipendija', type: 'prihod', color: '#6366f1', keywords: ['stipendija'], order: 4 },
  { id: 'fc-ostali-prihod', name: 'Ostali prihodi', type: 'prihod', color: '#64748b', keywords: ['poklon od', 'vraceno', 'vraćeno', 'prodao'], order: 5 },

  { id: 'fc-namirnice', name: 'Namirnice', type: 'trosak', color: '#22c55e', keywords: ['maxi', 'idea', 'lidl', 'univerexport', 'roda', 'aman', 'dis', 'tempo', 'mercator', 'prodavnica', 'market', 'namirnice', 'piletina', 'meso', 'jaja', 'mleko', 'hleb', 'pekara', 'ovsene'], order: 10 },
  { id: 'fc-hrana-napolju', name: 'Hrana napolju', type: 'trosak', color: '#f97316', keywords: ['burek', 'pica', 'pizza', 'giros', 'gyros', 'kafa', 'restoran', 'mek', 'mcdonalds', 'kfc', 'pljeskavica', 'rostilj', 'roštilj', 'dostava', 'sendvic', 'sendvič'], order: 11 },
  { id: 'fc-suplementi', name: 'Suplementi', type: 'trosak', color: '#e11d48', keywords: ['protein', 'kreatin', 'suplement', 'whey', 'vitamin'], order: 12 },
  { id: 'fc-gorivo', name: 'Gorivo', type: 'trosak', color: '#eab308', keywords: ['gorivo', 'benzin', 'dizel', 'nis', 'omv', 'mol', 'lukoil', 'gazprom', 'eko', 'pumpa'], order: 13 },
  { id: 'fc-auto', name: 'Auto', type: 'trosak', color: '#a16207', keywords: ['auto', 'servis', 'registracija', 'gume', 'ulje', 'delovi', 'mehanicar', 'mehaničar', 'zastava', 'parking', 'putarina'], order: 14 },
  { id: 'fc-sport', name: 'Teretana i bazen', type: 'trosak', color: '#10b981', keywords: ['teretana', 'clanarina', 'članarina', 'bazen', 'spens'], order: 15 },
  { id: 'fc-fakultet', name: 'Fakultet', type: 'trosak', color: '#3b82f6', keywords: ['skolarina', 'školarina', 'prijava ispita', 'ispit', 'knjiga', 'skripta', 'kopirnica', 'ftn'], order: 16 },
  { id: 'fc-telefon', name: 'Telefon i internet', type: 'trosak', color: '#06b6d4', keywords: ['yettel', 'telefon', 'racun telefon', 'internet', 'mts', 'a1', 'dopuna'], order: 17 },
  { id: 'fc-radionica', name: 'Radionica i alat', type: 'trosak', color: '#8b5cf6', keywords: ['alat', 'drvo', 'ploce', 'ploče', 'srafovi', 'šrafovi', 'brico', 'uradi sam', 'farba', 'lak', 'brusni'], order: 18 },
  { id: 'fc-odeca', name: 'Odeća', type: 'trosak', color: '#d946ef', keywords: ['majica', 'patike', 'jakna', 'pantalone', 'odeca', 'odeća', 'zara', 'h&m', 'decathlon'], order: 19 },
  { id: 'fc-izlasci', name: 'Izlasci', type: 'trosak', color: '#ec4899', keywords: ['izlazak', 'pice', 'piće', 'klub', 'bioskop', 'kafic', 'kafić', 'pivo'], order: 20 },
  { id: 'fc-gluposti', name: 'Gluposti', type: 'trosak', color: '#f43f5e', keywords: ['gluposti', 'grickalice', 'cips', 'čips', 'energetsko', 'cigare'], order: 21 },
  { id: 'fc-ostalo', name: 'Ostalo', type: 'trosak', color: '#94a3b8', keywords: [], order: 99 },
]

export function ensureFinCats() {
  if (store.get('fincats-setup')) return
  if (store.list('fincat').length === 0) {
    store.bulk(DEFAULT_FINCATS.map(({ id, ...data }) => ({ id, kind: 'fincat' as const, data })))
  }
  store.put('meta', { done: true }, 'fincats-setup')
}

/** Normalizuj tekst: mala slova, bez kvačica, bez interpunkcije. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'dj')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface Parsed {
  amount: number | null
  text: string
  type: TxType | null // ako je jasno iz teksta (npr. "+5000" ili "wolt")
}

/** "gorivo 3000", "3.000 maxi", "+12000 wolt", "kafa 250,50" */
export function parseQuick(input: string): Parsed {
  let s = input.trim()
  let type: TxType | null = null
  if (s.startsWith('+')) {
    type = 'prihod'
    s = s.slice(1)
  } else if (s.startsWith('-')) {
    type = 'trosak'
    s = s.slice(1)
  }
  // iznos: broj sa tačkama hiljada ili decimalnim zarezom, opciono "din"/"rsd"/"k"
  const m = s.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[,.](\d{1,2}))?\s*(k|hiljad\w*)?\s*(din\w*|rsd)?/i)
  let amount: number | null = null
  if (m) {
    const whole = Number(m[1].replace(/[.\s]/g, ''))
    const dec = m[2] ? Number('0.' + m[2]) : 0
    amount = whole + dec
    if (m[3]) amount *= 1000
    s = (s.slice(0, m.index) + ' ' + s.slice((m.index ?? 0) + m[0].length)).trim()
  }
  return { amount, text: s.replace(/\s+/g, ' ').trim(), type }
}

interface Learned {
  map: Record<string, string> // normalizovan tekst -> categoryId
}

function learned(): Learned {
  return store.get<Learned>('fin-learn')?.data ?? { map: {} }
}

/** Zapamti: ovaj tekst ide u ovu kategoriju (sledeći put automatski). */
export function learn(text: string, categoryId: string) {
  const key = norm(text)
  if (!key) return
  const cur = learned()
  if (cur.map[key] === categoryId) return
  const next = { map: { ...cur.map, [key]: categoryId } }
  if (store.get('fin-learn')) store.update<Learned>('fin-learn', () => next)
  else store.put('meta', next, 'fin-learn')
}

/** Pogodi kategoriju: naučeno > ključne reči > ništa. */
export function guessCategory(text: string, cats: Item<FinCategory>[], prefer?: TxType | null): Item<FinCategory> | undefined {
  const t = norm(text)
  if (!t) return undefined
  const byId = new Map(cats.map((c) => [c.id, c]))
  const map = learned().map
  // 1) ceo tekst već viđen
  if (map[t] && byId.get(map[t])) return byId.get(map[t])
  // 2) neka reč iz teksta već viđena
  const words = t.split(' ')
  for (const w of words) if (w.length > 2 && map[w] && byId.get(map[w])) return byId.get(map[w])
  // 3) ključne reči
  let best: { c: Item<FinCategory>; score: number } | undefined
  for (const c of cats) {
    if (prefer && c.data.type !== prefer) continue
    for (const kw of c.data.keywords) {
      const k = norm(kw)
      if (!k) continue
      const hit = k.includes(' ') ? t.includes(k) : words.includes(k) || (k.length >= 4 && words.some((w) => w.startsWith(k)))
      if (hit && (!best || k.length > best.score)) best = { c, score: k.length }
    }
  }
  return best?.c
}

export function addTransaction(d: TransactionData) {
  store.put<TransactionData>('transaction', d)
  if (d.categoryId) {
    learn(d.text, d.categoryId)
    // nauči i prvu reč (npr. "maxi" iz "maxi veliki šoping")
    const first = norm(d.text).split(' ')[0]
    if (first && first.length > 2 && first !== norm(d.text)) learn(first, d.categoryId)
  }
}

export function balance(): number {
  const s = getSettings()
  let b = s.balanceStart || 0
  for (const t of store.list<TransactionData>('transaction')) b += t.data.type === 'prihod' ? t.data.amount : -t.data.amount
  return b
}

export function hasTransactions() {
  return store.list('transaction').length > 0
}

export function fmtDin(n: number, sign = false): string {
  const s = Math.round(Math.abs(n)).toLocaleString('sr-Latn-RS')
  return `${sign ? (n < 0 ? '−' : '+') : n < 0 ? '−' : ''}${s} din`
}

export function monthTotals(monthKey: string) {
  let income = 0
  let expense = 0
  for (const t of store.list<TransactionData>('transaction')) {
    if (t.data.date.slice(0, 7) !== monthKey) continue
    if (t.data.type === 'prihod') income += t.data.amount
    else expense += t.data.amount
  }
  return { income, expense }
}
