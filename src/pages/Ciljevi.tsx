import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { store, useKind, useVersion } from '../lib/store'
import type { GoalData, GoalType } from '../lib/types'
import { goalProgress, fmt } from '../lib/goals'
import { hasTransactions } from '../lib/finance'
import { getSettings } from '../lib/logic'
import { addDays, fmtShort, today, daysBetween } from '../lib/dates'
import { Button, Card, ColorPicker, Empty, Field, IconButton, Modal, PageHeader, Progress } from '../ui/kit'

const TYPES: { v: GoalType; label: string; hint: string }[] = [
  { v: 'kg', label: 'Kilaža', hint: 'Prati se automatski iz merenja kilaže.' },
  { v: 'espb', label: 'ESPB', hint: 'Računa se iz položenih predmeta.' },
  { v: 'predmeti', label: 'Broj položenih predmeta', hint: 'Broji predmete koje označiš kao položene.' },
  { v: 'novac', label: 'Novac', hint: 'Računa se iz Finansija: početno stanje + prihodi − troškovi.' },
  { v: 'custom', label: 'Nešto drugo', hint: 'Ručno upisuješ napredak.' },
]

export default function Ciljevi() {
  useVersion()
  const goals = useKind<GoalData>('goal').sort((a, b) => a.data.order - b.data.order)
  const [edit, setEdit] = useState<string | 'new' | null>(null)
  return (
    <div>
      <PageHeader
        title="Ciljevi"
        sub="Za narednih godinu dana"
        right={
          <Button variant="primary" onClick={() => setEdit('new')}>
            <Plus size={16} /> Cilj
          </Button>
        }
      />
      {goals.length === 0 && <Empty>Još nema ciljeva. Dodaj prvi — npr. „85 kg do septembra“.</Empty>}
      <div className="grid md:grid-cols-2 gap-3">
        {goals.map((g) => {
          const p = goalProgress(g.data)
          const manual = g.data.type === 'custom' || (g.data.type === 'novac' && !hasTransactions() && !getSettings().balanceStart)
          return (
            <Card key={g.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{g.data.title}</div>
                  <div className="text-xs text-ink-faint">
                    {TYPES.find((t) => t.v === g.data.type)?.label}
                    {g.data.deadline && ` · do ${fmtShort(g.data.deadline)} (${Math.max(0, daysBetween(today(), g.data.deadline))} dana)`}
                  </div>
                </div>
                <IconButton title="Izmeni" onClick={() => setEdit(g.id)}>
                  <Pencil size={15} />
                </IconButton>
              </div>
              <div className="text-2xl font-semibold tabular mt-3">{p.text}</div>
              <div className="mt-2">
                <Progress value={p.pct} max={100} color={g.data.color} height={10} />
              </div>
              <div className="text-xs text-ink-faint mt-1.5">{Math.round(p.pct)}% puta</div>
              {manual && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    className="flex-1"
                    placeholder="Trenutno stanje"
                    defaultValue={g.data.current ?? ''}
                    onBlur={(e) => {
                      const v = Number(e.target.value)
                      if (!Number.isNaN(v)) store.update<GoalData>(g.id, (d) => ({ ...d, current: v }))
                    }}
                  />
                </div>
              )}
              {g.data.type === 'kg' && (
                <a href="#/ishrana/kilaza" className="text-xs text-accent mt-3 inline-block">
                  Upiši novu kilažu →
                </a>
              )}
            </Card>
          )
        })}
      </div>
      <GoalEditor id={edit} onClose={() => setEdit(null)} count={goals.length} />
    </div>
  )
}

function GoalEditor({ id, onClose, count }: { id: string | 'new' | null; onClose: () => void; count: number }) {
  const existing = id && id !== 'new' ? store.get<GoalData>(id) : undefined
  const blank = (): GoalData => ({
    title: '',
    type: 'kg',
    target: 0,
    deadline: addDays(today(), 365),
    order: count + 1,
    color: '#2563eb',
  })
  const [d, setD] = useState<GoalData>(blank())
  const [lastId, setLastId] = useState<string | null>(null)
  if (id !== lastId) {
    setLastId(id)
    setD(existing?.data ?? blank())
  }
  const set = <K extends keyof GoalData>(k: K, v: GoalData[K]) => setD((x) => ({ ...x, [k]: v }))
  const save = () => {
    if (!d.title.trim()) return
    if (existing) store.update<GoalData>(existing.id, () => d)
    else store.put<GoalData>('goal', d)
    onClose()
  }
  return (
    <Modal
      open={!!id}
      onClose={onClose}
      title={existing ? 'Izmeni cilj' : 'Novi cilj'}
      footer={
        <>
          {existing && (
            <Button
              variant="ghost"
              className="mr-auto text-rose-600"
              onClick={() => {
                if (confirm('Obrisati cilj?')) {
                  store.remove(existing.id)
                  onClose()
                }
              }}
            >
              Obriši
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Otkaži
          </Button>
          <Button variant="primary" onClick={save} disabled={!d.title.trim()}>
            Sačuvaj
          </Button>
        </>
      }
    >
      <Field label="Naziv">
        <input className="w-full" placeholder="npr. Da se ugojim na 85 kg" value={d.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Vrsta" hint={TYPES.find((t) => t.v === d.type)?.hint}>
        <select className="w-full" value={d.type} onChange={(e) => set('type', e.target.value as GoalType)}>
          {TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cilj">
          <input type="number" className="w-full" value={d.target || ''} onChange={(e) => set('target', Number(e.target.value))} />
        </Field>
        <Field label="Početna vrednost" hint="Prazno = automatski">
          <input
            type="number"
            className="w-full"
            value={d.start ?? ''}
            onChange={(e) => set('start', e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </Field>
      </div>
      {(d.type === 'novac' || d.type === 'custom') && (
        <Field label="Jedinica">
          <input className="w-full" placeholder={d.type === 'novac' ? 'din' : 'npr. knjiga'} value={d.unit ?? ''} onChange={(e) => set('unit', e.target.value)} />
        </Field>
      )}
      <Field label="Rok">
        <input type="date" className="w-full" value={d.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || undefined)} />
      </Field>
      <Field label="Boja">
        <ColorPicker value={d.color ?? '#2563eb'} onChange={(c) => set('color', c)} />
      </Field>
      {d.target > 0 && <div className="text-xs text-ink-faint">Cilj: {fmt(d.target)}</div>}
    </Modal>
  )
}
