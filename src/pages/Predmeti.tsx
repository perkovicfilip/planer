import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { store, useKind, useVersion } from '../lib/store'
import type { Category, SubjectData } from '../lib/types'
import { espbStats } from '../lib/goals'
import { RASPORED_SUBJECTS, ALL_GROUPS } from '../data/raspored'
import { PALETTE } from '../data/defaults'
import { iso } from '../lib/dates'
import { Button, Card, ColorPicker, Empty, Field, IconButton, Modal, PageHeader, Progress, SectionTitle, cx } from '../ui/kit'

const blank = (): SubjectData => ({
  code: '',
  name: '',
  espb: 6,
  year: 4,
  mode: 'Prvi put',
  status: 'nepolozen',
})

export default function Predmeti() {
  useVersion()
  const subjects = useKind<SubjectData>('subject')
  const cats = useKind<Category>('category')
  const [edit, setEdit] = useState<string | 'new' | null>(null)
  const [grading, setGrading] = useState<string | null>(null)
  const st = espbStats()
  const catColor = (id?: string) => (id ? cats.find((c) => c.id === id)?.data.color : undefined) ?? '#6366f1'

  const open = subjects.filter((s) => s.data.status !== 'polozen').sort((a, b) => a.data.year - b.data.year || a.data.name.localeCompare(b.data.name))
  const passed = subjects.filter((s) => s.data.status === 'polozen').sort((a, b) => (b.data.passedOn ?? '').localeCompare(a.data.passedOn ?? ''))

  return (
    <div>
      <PageHeader
        title="Predmeti"
        right={
          <Button variant="primary" onClick={() => setEdit('new')}>
            <Plus size={16} /> Predmet
          </Button>
        }
      />
      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center mb-3 text-sm">
        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-ink-faint">ESPB</span>
          <b className="tabular">
            {st.espb}/{st.total}
          </b>
          <div className="w-24">
            <Progress value={st.espb} max={st.total} height={6} />
          </div>
        </div>
        <div>
          <span className="text-ink-faint">Prosek </span>
          <b className="tabular">{st.average ? st.average.toFixed(2) : '—'}</b>
        </div>
        <div>
          <span className="text-ink-faint">Ostalo </span>
          <b className="tabular">{st.remaining}</b>
          <span className="text-ink-faint"> predmeta · {st.remainingEspb} ESPB</span>
        </div>
      </div>

      <Card className="overflow-hidden mb-4">
        {open.length === 0 ? (
          <Empty>Nema predmeta. Dodaj ih ili uvezi u Podešavanjima.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-faint border-b border-line">
                  <th className="font-semibold px-3 py-2">Predmet</th>
                  <th className="font-semibold px-2 py-2 text-right">ESPB</th>
                  <th className="font-semibold px-2 py-2 text-center">God.</th>
                  <th className="font-semibold px-2 py-2 hidden md:table-cell">Status</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {open.map((s) => (
                  <tr key={s.id} className="hover:bg-paper-sunk/40">
                    <td className="px-3 py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: catColor(s.data.categoryId) }} />
                        <span className="font-medium">{s.data.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular">{s.data.espb}</td>
                    <td className="px-2 py-1.5 text-center tabular text-ink-soft">{s.data.year}.</td>
                    <td className="px-2 py-1.5 text-xs text-ink-faint hidden md:table-cell">{s.data.mode}</td>
                    <td className="px-2 py-1 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" className="py-0.5 text-xs" onClick={() => setGrading(s.id)}>
                          Položio ✓
                        </Button>
                        <IconButton title="Izmeni" onClick={() => setEdit(s.id)} className="w-7 h-7">
                          <Pencil size={13} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {passed.length > 0 && (
        <>
          <SectionTitle>Položeni u aplikaciji</SectionTitle>
          <Card className="px-3 py-1 mb-4">
            <ul className="divide-y divide-line">
              {passed.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: catColor(s.data.categoryId) }} />
                  <span className="flex-1 text-sm">{s.data.name}</span>
                  <span className="text-sm font-semibold tabular">{s.data.grade ?? '—'}</span>
                  <button
                    className="text-xs text-ink-faint hover:text-ink"
                    onClick={() => store.update<SubjectData>(s.id, (d) => ({ ...d, status: 'nepolozen', grade: undefined, passedOn: undefined }))}
                  >
                    Vrati
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <SubjectEditor id={edit} onClose={() => setEdit(null)} />
      <GradeModal id={grading} onClose={() => setGrading(null)} />
    </div>
  )
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className="text-xl font-semibold tabular mt-0.5">{value}</div>
      {children && <div className="mt-2">{children}</div>}
    </Card>
  )
}

function GradeModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const s = id ? store.get<SubjectData>(id) : undefined
  return (
    <Modal open={!!id} onClose={onClose} title={s ? `Ocena · ${s.data.name}` : 'Ocena'}>
      <p className="text-sm text-ink-soft mb-3">Bravo! Koja je ocena?</p>
      <div className="grid grid-cols-5 gap-2">
        {[6, 7, 8, 9, 10].map((g) => (
          <Button
            key={g}
            className="py-4 text-lg"
            onClick={() => {
              if (id) store.update<SubjectData>(id, (d) => ({ ...d, status: 'polozen', grade: g, passedOn: iso() }))
              onClose()
            }}
          >
            {g}
          </Button>
        ))}
      </div>
    </Modal>
  )
}

function SubjectEditor({ id, onClose }: { id: string | 'new' | null; onClose: () => void }) {
  const existing = id && id !== 'new' ? store.get<SubjectData>(id) : undefined
  const cat = existing?.data.categoryId ? store.get<Category>(existing.data.categoryId) : undefined
  const [d, setD] = useState<SubjectData>(blank())
  const [color, setColor] = useState(PALETTE[0])
  const [lastId, setLastId] = useState<string | null>(null)
  if (id !== lastId) {
    setLastId(id)
    setD(existing?.data ?? blank())
    setColor(cat?.data.color ?? PALETTE[Math.floor(Math.random() * PALETTE.length)])
  }
  const set = <K extends keyof SubjectData>(k: K, v: SubjectData[K]) => setD((x) => ({ ...x, [k]: v }))

  function save() {
    if (!d.name.trim()) return
    let categoryId = d.categoryId
    if (categoryId && store.get(categoryId)) {
      store.update<Category>(categoryId, (c) => ({ ...c, name: d.name.trim(), color }))
    } else {
      categoryId = store.put<Category>('category', { name: d.name.trim(), color, group: 'fakultet', order: 100 })
    }
    const data = { ...d, name: d.name.trim(), categoryId }
    if (existing) store.update<SubjectData>(existing.id, () => data)
    else store.put<SubjectData>('subject', data)
    onClose()
  }
  function remove() {
    if (existing && confirm(`Obrisati predmet ${existing.data.name}?`)) {
      store.remove(existing.id)
      if (existing.data.categoryId) store.remove(existing.data.categoryId)
      onClose()
    }
  }

  return (
    <Modal
      open={!!id}
      onClose={onClose}
      title={existing ? 'Izmeni predmet' : 'Novi predmet'}
      footer={
        <>
          {existing && (
            <Button variant="ghost" className="mr-auto text-rose-600" onClick={remove}>
              Obriši
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Otkaži
          </Button>
          <Button variant="primary" onClick={save} disabled={!d.name.trim()}>
            Sačuvaj
          </Button>
        </>
      }
    >
      <Field label="Naziv">
        <input className="w-full" value={d.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Oznaka">
          <input className="w-full" value={d.code} onChange={(e) => set('code', e.target.value)} />
        </Field>
        <Field label="ESPB">
          <input type="number" className="w-full" value={d.espb} onChange={(e) => set('espb', Number(e.target.value))} />
        </Field>
        <Field label="Godina">
          <input type="number" className="w-full" value={d.year} onChange={(e) => set('year', Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Način slušanja">
        <select className="w-full" value={d.mode} onChange={(e) => set('mode', e.target.value)}>
          <option>Prvi put</option>
          <option>Ponovo sluša</option>
          <option>Polaže preko kolokvijuma</option>
        </select>
      </Field>
      <Field label="Nastavnik">
        <input className="w-full" value={d.professor ?? ''} onChange={(e) => set('professor', e.target.value)} />
      </Field>
      <Field label="Boja u kalendaru">
        <ColorPicker value={color} onChange={setColor} />
      </Field>
      <Field label="Veza sa rasporedom časova">
        <select className="w-full" value={d.rasporedKey ?? ''} onChange={(e) => set('rasporedKey', e.target.value || undefined)}>
          <option value="">— nema u rasporedu —</option>
          {Object.entries(RASPORED_SUBJECTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.name}
            </option>
          ))}
        </select>
      </Field>
      {d.rasporedKey && (
        <>
          <Field label="Grupa za vežbe">
            <div className="flex flex-wrap gap-1.5">
              {ALL_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set('group', g)}
                  className={cx('w-9 h-9 rounded-lg border text-sm', (d.group ?? '1') === g ? 'bg-accent text-white border-accent' : 'border-line')}
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!d.attendLectures} onChange={(e) => set('attendLectures', e.target.checked)} />
              Dolazim na predavanja
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!d.attendExercises} onChange={(e) => set('attendExercises', e.target.checked)} />
              Dolazim na vežbe
            </label>
          </div>
        </>
      )}
      <Field label="Beleška (kolokvijumi, bodovi…)">
        <textarea className="w-full" rows={3} value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </Modal>
  )
}
