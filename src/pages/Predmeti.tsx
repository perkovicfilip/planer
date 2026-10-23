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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="ESPB" value={`${st.espb} / ${st.total}`}>
          <Progress value={st.espb} max={st.total} />
        </Stat>
        <Stat label="Prosek" value={st.average ? st.average.toFixed(2) : '—'} />
        <Stat label="Preostalo predmeta" value={String(st.remaining)} />
        <Stat label="Preostalo ESPB (na spisku)" value={String(st.remainingEspb)} />
      </div>

      <SectionTitle>Nepoloženi</SectionTitle>
      {open.length === 0 ? (
        <Empty>Nema predmeta. Dodaj ih ili uvezi u Podešavanjima.</Empty>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 mb-8">
          {open.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ background: catColor(s.data.categoryId) }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium leading-snug">{s.data.name}</div>
                  <div className="text-xs text-ink-faint mt-0.5">
                    {s.data.code} · {s.data.espb} ESPB · {s.data.year}. godina · {s.data.mode}
                  </div>
                  {s.data.professor && <div className="text-xs text-ink-faint">{s.data.professor}</div>}
                  {s.data.rasporedKey && (
                    <div className="text-xs text-ink-soft mt-1">
                      Raspored: grupa {s.data.group ?? '1'} ·{' '}
                      {[s.data.attendLectures && 'predavanja', s.data.attendExercises && 'vežbe'].filter(Boolean).join(' + ') || 'ne dolazim'}
                    </div>
                  )}
                </div>
                <IconButton title="Izmeni" onClick={() => setEdit(s.id)}>
                  <Pencil size={15} />
                </IconButton>
              </div>
              <div className="flex gap-2 mt-3">
                <Button className="flex-1" onClick={() => setGrading(s.id)}>
                  Položio sam ✓
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {passed.length > 0 && (
        <>
          <SectionTitle>Položeni u aplikaciji</SectionTitle>
          <Card className="px-4 py-1 mb-6">
            <ul className="divide-y divide-line">
              {passed.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
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
    <Card className="p-4">
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
