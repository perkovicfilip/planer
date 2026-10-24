import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { store, useKind } from '../lib/store'
import type { FinCategory, Item, TransactionData, TxType } from '../lib/types'
import { MONTHS, fmtShort, iso, relDay, today } from '../lib/dates'
import { addTransaction, balance, ensureFinCats, fmtDin, guessCategory, learn, parseQuick } from '../lib/finance'
import { useSettings } from '../lib/logic'
import { go } from '../lib/router'
import { Button, Card, ColorPicker, Empty, Field, IconButton, Modal, PageHeader, SectionTitle, Segmented, cx } from '../ui/kit'

type Tab = 'pregled' | 'kategorije'

export default function Finansije({ param }: { param?: string }) {
  useEffect(() => ensureFinCats(), [])
  const tab: Tab = param === 'kategorije' ? 'kategorije' : 'pregled'
  return (
    <div className="md:flex md:flex-col md:flex-1 md:min-h-0">
      <PageHeader
        title="Finansije"
        right={
          <Segmented<Tab>
            value={tab}
            onChange={(v) => go('finansije', v === 'pregled' ? undefined : v)}
            options={[
              { value: 'pregled', label: 'Pregled' },
              { value: 'kategorije', label: 'Kategorije' },
            ]}
          />
        }
      />
      {tab === 'pregled' ? <Overview /> : <Categories />}
    </div>
  )
}

const monthKey = (d: string) => d.slice(0, 7)
function shiftMonth(key: string, n: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return iso(d).slice(0, 7)
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

// ---------------- Pregled ----------------

function Overview() {
  const txs = useKind<TransactionData>('transaction')
  const cats = useKind<FinCategory>('fincat')
  const [settings] = useSettings()
  const [month, setMonth] = useState(monthKey(today()))
  const [edit, setEdit] = useState<Item<TransactionData> | null>(null)
  const catMap = useMemo(() => new Map(cats.map((c) => [c.id, c.data])), [cats])

  const inMonth = txs.filter((t) => monthKey(t.data.date) === month).sort((a, b) => b.data.date.localeCompare(a.data.date) || b.updated_at.localeCompare(a.updated_at))
  const income = inMonth.filter((t) => t.data.type === 'prihod').reduce((s, t) => s + t.data.amount, 0)
  const expense = inMonth.filter((t) => t.data.type === 'trosak').reduce((s, t) => s + t.data.amount, 0)

  const byCat = (type: TxType) => {
    const m = new Map<string, number>()
    for (const t of inMonth) if (t.data.type === type) m.set(t.data.categoryId ?? '', (m.get(t.data.categoryId ?? '') ?? 0) + t.data.amount)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const expByCat = byCat('trosak')
  const incByCat = byCat('prihod')

  // poslednjih 6 meseci
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5))
  const series = months.map((mk) => {
    let inc = 0
    let exp = 0
    for (const t of txs) if (monthKey(t.data.date) === mk) t.data.type === 'prihod' ? (inc += t.data.amount) : (exp += t.data.amount)
    return { mk, inc, exp }
  })

  const groups = new Map<string, Item<TransactionData>[]>()
  for (const t of inMonth) groups.set(t.data.date, [...(groups.get(t.data.date) ?? []), t])

  return (
    <div className="lg:grid lg:grid-cols-[1fr_340px] gap-4 md:flex-1 md:min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <QuickAdd cats={cats} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center">
            <IconButton title="Prethodni mesec" onClick={() => setMonth(shiftMonth(month, -1))}>
              <ChevronLeft size={18} />
            </IconButton>
            <div className="font-semibold capitalize min-w-[120px] text-center text-sm">{monthLabel(month)}</div>
            <IconButton title="Sledeći mesec" onClick={() => setMonth(shiftMonth(month, 1))}>
              <ChevronRight size={18} />
            </IconButton>
          </div>
          <Mini label="Zarađeno" value={fmtDin(income)} cls="text-emerald-600" />
          <Mini label="Potrošeno" value={fmtDin(expense)} cls="text-rose-600" />
          <Mini label="Razlika" value={fmtDin(income - expense, true)} cls={income - expense >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
          <Mini label="Stanje" value={fmtDin(balance())} />
          {!settings.balanceStart && (
            <a href="#/podesavanja" className="text-xs text-accent">
              upiši početno stanje
            </a>
          )}
        </div>

        <Card className="px-3 py-1 min-h-0 flex-1 overflow-y-auto">
          {inMonth.length === 0 ? (
            <Empty>Još ništa upisano za {monthLabel(month)}.</Empty>
          ) : (
            [...groups.entries()].map(([date, list]) => (
              <div key={date} className="py-1.5">
                <div className="text-xs text-ink-faint">{relDay(date)}</div>
                <ul className="divide-y divide-line">
                  {list.map((t) => {
                    const c = t.data.categoryId ? catMap.get(t.data.categoryId) : undefined
                    return (
                      <li key={t.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer hover:bg-paper-sunk/40 -mx-1 px-1 rounded" onClick={() => setEdit(t)}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c?.color ?? '#94a3b8' }} />
                        <span className="flex-1 min-w-0 text-sm truncate first-letter:uppercase">{t.data.text || c?.name || '—'}</span>
                        <span className="text-xs text-ink-faint hidden sm:inline">{c?.name ?? 'Bez kategorije'}</span>
                        <span className={cx('text-sm font-medium tabular w-28 text-right', t.data.type === 'prihod' ? 'text-emerald-600' : 'text-ink')}>
                          {t.data.type === 'prihod' ? '+' : '−'}
                          {fmtDin(t.data.amount)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-3 mt-4 lg:mt-0 min-h-0 lg:overflow-y-auto">
        <Card className="p-3">
          <div className="text-xs font-semibold mb-2">Na šta trošim</div>
          {expByCat.length === 0 ? <div className="text-xs text-ink-faint">Nema troškova.</div> : <CatBars rows={expByCat} total={expense} catMap={catMap} />}
        </Card>
        <Card className="p-3">
          <div className="text-xs font-semibold mb-2">Odakle zarađujem</div>
          {incByCat.length === 0 ? <div className="text-xs text-ink-faint">Nema prihoda.</div> : <CatBars rows={incByCat} total={income} catMap={catMap} />}
        </Card>
        <Card className="p-3">
          <div className="text-xs font-semibold mb-1">Poslednjih 6 meseci</div>
          <MonthBars series={series} active={month} onPick={setMonth} />
        </Card>
      </div>

      <TxEditor tx={edit} cats={cats} onClose={() => setEdit(null)} />
    </div>
  )
}

function Mini({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="leading-tight">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className={cx('text-sm font-semibold tabular', cls)}>{value}</div>
    </div>
  )
}

function Stat({ label, value, cls, sub }: { label: string; value: string; cls?: string; sub?: string }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className={cx('text-lg md:text-xl font-semibold tabular mt-0.5', cls)}>{value}</div>
      {sub && (
        <a href="#/podesavanja" className="text-xs text-accent">
          {sub}
        </a>
      )}
    </Card>
  )
}

function CatBars({ rows, total, catMap }: { rows: [string, number][]; total: number; catMap: Map<string, FinCategory> }) {
  const max = rows[0]?.[1] ?? 1
  return (
    <ul className="space-y-1.5">
      {rows.map(([id, amt]) => {
        const c = catMap.get(id)
        return (
          <li key={id || 'none'}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c?.color ?? '#94a3b8' }} />
                <span className="truncate">{c?.name ?? 'Bez kategorije'}</span>
              </span>
              <span className="tabular text-ink-soft shrink-0 ml-2">
                {fmtDin(amt)} <span className="text-ink-faint text-xs">· {Math.round((amt / total) * 100)}%</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-paper-sunk overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(amt / max) * 100}%`, background: c?.color ?? '#94a3b8' }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function MonthBars({ series, active, onPick }: { series: { mk: string; inc: number; exp: number }[]; active: string; onPick: (m: string) => void }) {
  const max = Math.max(1, ...series.flatMap((s) => [s.inc, s.exp]))
  const H = 90
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: H + 20 }}>
        {series.map((s) => (
          <button key={s.mk} onClick={() => onPick(s.mk)} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="flex items-end gap-1 w-full justify-center" style={{ height: H }}>
              <div
                className="w-1/3 max-w-[22px] rounded-t bg-emerald-500"
                style={{ height: `${(s.inc / max) * H}px`, minHeight: s.inc ? 2 : 0 }}
                title={`Zarađeno: ${fmtDin(s.inc)}`}
              />
              <div
                className="w-1/3 max-w-[22px] rounded-t bg-rose-500"
                style={{ height: `${(s.exp / max) * H}px`, minHeight: s.exp ? 2 : 0 }}
                title={`Potrošeno: ${fmtDin(s.exp)}`}
              />
            </div>
            <span className={cx('text-xs capitalize', s.mk === active ? 'font-semibold text-ink' : 'text-ink-faint group-hover:text-ink-soft')}>
              {MONTHS[Number(s.mk.slice(5)) - 1].slice(0, 3)}
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-ink-soft mt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Zarađeno
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Potrošeno
        </span>
      </div>
    </div>
  )
}

// ---------------- Brz unos ----------------

function QuickAdd({ cats }: { cats: Item<FinCategory>[] }) {
  const [text, setText] = useState('')
  const [type, setType] = useState<TxType>('trosak')
  const [catId, setCatId] = useState<string | null>(null)
  const [touchedCat, setTouchedCat] = useState(false)
  const [date, setDate] = useState(today())
  const [flash, setFlash] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = parseQuick(text)
  const effType: TxType = parsed.type ?? type
  const guess = guessCategory(parsed.text, cats, parsed.type)
  // ako je pogodak iz druge vrste (npr. "wolt" -> prihod), prebaci vrstu
  const autoType: TxType = !parsed.type && guess ? guess.data.type : effType
  const selected = touchedCat ? catId : guess?.id ?? null
  const shownType = touchedCat && catId ? cats.find((c) => c.id === catId)?.data.type ?? autoType : autoType
  const list = cats.filter((c) => c.data.type === shownType).sort((a, b) => a.data.order - b.data.order)

  const save = () => {
    if (!parsed.amount) return
    const cid = selected ?? list.find((c) => /ostal/i.test(c.data.name))?.id
    addTransaction({ type: shownType, amount: parsed.amount, categoryId: cid ?? undefined, text: parsed.text, date })
    const cname = cats.find((c) => c.id === cid)?.data.name
    setFlash(`${shownType === 'prihod' ? '+' : '−'}${fmtDin(parsed.amount)}${cname ? ' · ' + cname : ''}`)
    window.setTimeout(() => setFlash(null), 2500)
    setText('')
    setCatId(null)
    setTouchedCat(false)
    inputRef.current?.focus()
  }

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Segmented<TxType>
          value={shownType}
          onChange={(v) => {
            setType(v)
            setTouchedCat(false)
            setCatId(null)
          }}
          options={[
            { value: 'trosak', label: 'Trošak' },
            { value: 'prihod', label: 'Prihod' },
          ]}
        />
        <input type="date" className="py-1.5 text-sm" value={date} onChange={(e) => setDate(e.target.value || today())} />
        {date !== today() && <span className="text-xs text-ink-faint">{fmtShort(date)}</span>}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 text-base"
          placeholder="npr. gorivo 3000 · maxi 1.250 · +4500 wolt"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (!touchedCat) setCatId(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <Button variant="primary" onClick={save} disabled={!parsed.amount}>
          <Plus size={16} /> Upiši
        </Button>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setTouchedCat(true)
              setCatId(c.id)
            }}
            className={cx(
              'px-2 py-0.5 rounded-full text-xs border inline-flex items-center gap-1.5 transition',
              selected === c.id ? 'text-white border-transparent' : 'border-line text-ink-soft hover:bg-paper-sunk',
            )}
            style={selected === c.id ? { background: c.data.color } : undefined}
          >
            {selected !== c.id && <span className="w-2 h-2 rounded-full" style={{ background: c.data.color }} />}
            {c.data.name}
          </button>
        ))}
      </div>
      <div className="text-xs mt-2 min-h-[1rem]">
        {flash ? (
          <span className="text-emerald-600">Upisano: {flash}</span>
        ) : parsed.amount ? (
          <span className="text-ink-soft">
            {shownType === 'prihod' ? 'Prihod' : 'Trošak'} {fmtDin(parsed.amount)}
            {selected ? ` → ${cats.find((c) => c.id === selected)?.data.name}` : ' → izaberi kategoriju (ili ide u Ostalo)'}
          </span>
        ) : (
          <span className="text-ink-faint">Ukucaj šta i koliko. Kategoriju pogađam sam, a kad je jednom ispraviš, zapamtim je.</span>
        )}
      </div>
    </Card>
  )
}

function TxEditor({ tx, cats, onClose }: { tx: Item<TransactionData> | null; cats: Item<FinCategory>[]; onClose: () => void }) {
  const [d, setD] = useState<TransactionData | null>(tx?.data ?? null)
  const [last, setLast] = useState<Item<TransactionData> | null>(null)
  if (tx !== last) {
    setLast(tx)
    setD(tx?.data ?? null)
  }
  if (!tx || !d) return null
  const list = cats.filter((c) => c.data.type === d.type).sort((a, b) => a.data.order - b.data.order)
  return (
    <Modal
      open
      onClose={onClose}
      title="Izmeni stavku"
      footer={
        <>
          <Button
            variant="ghost"
            className="mr-auto text-rose-600"
            onClick={() => {
              store.remove(tx.id)
              onClose()
            }}
          >
            <Trash2 size={15} /> Obriši
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              store.update<TransactionData>(tx.id, () => d)
              if (d.categoryId && d.categoryId !== tx.data.categoryId) learn(d.text, d.categoryId)
              onClose()
            }}
          >
            Sačuvaj
          </Button>
        </>
      }
    >
      <Field label="Vrsta">
        <Segmented<TxType>
          value={d.type}
          onChange={(v) => setD({ ...d, type: v, categoryId: undefined })}
          options={[
            { value: 'trosak', label: 'Trošak' },
            { value: 'prihod', label: 'Prihod' },
          ]}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Iznos (din)">
          <input type="number" className="w-full" value={d.amount} onChange={(e) => setD({ ...d, amount: Number(e.target.value) })} />
        </Field>
        <Field label="Datum">
          <input type="date" className="w-full" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value || d.date })} />
        </Field>
      </div>
      <Field label="Opis">
        <input className="w-full" value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} />
      </Field>
      <Field label="Kategorija">
        <div className="flex flex-wrap gap-1.5">
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => setD({ ...d, categoryId: c.id })}
              className={cx('px-2.5 py-1 rounded-full text-sm border', d.categoryId === c.id ? 'text-white border-transparent' : 'border-line text-ink-soft')}
              style={d.categoryId === c.id ? { background: c.data.color } : undefined}
            >
              {c.data.name}
            </button>
          ))}
        </div>
      </Field>
    </Modal>
  )
}

// ---------------- Kategorije ----------------

function Categories() {
  const cats = useKind<FinCategory>('fincat').sort((a, b) => a.data.order - b.data.order)
  const [edit, setEdit] = useState<{ id?: string; data: FinCategory; kw: string } | null>(null)
  const open = (c?: Item<FinCategory>, type: TxType = 'trosak') =>
    setEdit(
      c
        ? { id: c.id, data: c.data, kw: c.data.keywords.join(', ') }
        : { data: { name: '', type, color: '#3b82f6', keywords: [], order: cats.length + 1 }, kw: '' },
    )
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {(['trosak', 'prihod'] as TxType[]).map((type) => (
        <section key={type}>
          <SectionTitle
            action={
              <Button variant="ghost" onClick={() => open(undefined, type)}>
                <Plus size={15} /> Nova
              </Button>
            }
          >
            {type === 'trosak' ? 'Troškovi' : 'Prihodi'}
          </SectionTitle>
          <Card className="px-4 py-1">
            <ul className="divide-y divide-line">
              {cats
                .filter((c) => c.data.type === type)
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-1.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.data.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{c.data.name}</div>
                      {c.data.keywords.length > 0 && <div className="text-xs text-ink-faint truncate">{c.data.keywords.join(', ')}</div>}
                    </div>
                    <IconButton title="Izmeni" onClick={() => open(c)}>
                      <Pencil size={14} />
                    </IconButton>
                  </li>
                ))}
            </ul>
          </Card>
        </section>
      ))}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Izmeni kategoriju' : 'Nova kategorija'}
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
                const data = {
                  ...edit.data,
                  name: edit.data.name.trim(),
                  keywords: edit.kw
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean),
                }
                if (edit.id) store.update<FinCategory>(edit.id, () => data)
                else store.put<FinCategory>('fincat', data)
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
            <Field label="Ključne reči (odvojene zarezom)" hint="Ako unos sadrži neku od ovih reči, ide u ovu kategoriju.">
              <textarea className="w-full" rows={3} value={edit.kw} onChange={(e) => setEdit({ ...edit, kw: e.target.value })} />
            </Field>
            <Field label="Boja">
              <ColorPicker value={edit.data.color} onChange={(c) => setEdit({ ...edit, data: { ...edit.data, color: c } })} />
            </Field>
          </>
        )}
      </Modal>
    </div>
  )
}
