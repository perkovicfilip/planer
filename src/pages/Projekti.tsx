import { useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { store, uid, useKind } from '../lib/store'
import type { Item, ProjectData } from '../lib/types'
import { Button, Card, CheckCircle, ColorPicker, Empty, Field, IconButton, Modal, PageHeader, Progress, SectionTitle, Segmented, cx } from '../ui/kit'

type Status = ProjectData['status']
const STATUS_LABEL: Record<Status, string> = { aktivan: 'Aktivni', pauza: 'Na pauzi', zavrsen: 'Završeni' }

export default function Projekti() {
  const projects = useKind<ProjectData>('project').sort((a, b) => a.data.order - b.data.order)
  const [filter, setFilter] = useState<Status>('aktivan')
  const [edit, setEdit] = useState<Item<ProjectData> | 'new' | null>(null)
  const shown = projects.filter((p) => p.data.status === filter)
  return (
    <div>
      <PageHeader
        title="Projekti"
        sub="Hobiji i poslovi sa svojim listama zadataka."
        right={
          <Button variant="primary" onClick={() => setEdit('new')}>
            <Plus size={16} /> Projekat
          </Button>
        }
      />
      <div className="mb-4">
        <Segmented<Status>
          value={filter}
          onChange={setFilter}
          options={(Object.keys(STATUS_LABEL) as Status[]).map((s) => ({
            value: s,
            label: `${STATUS_LABEL[s]} · ${projects.filter((p) => p.data.status === s).length}`,
          }))}
        />
      </div>
      {shown.length === 0 && <Empty>Nema projekata ovde. Npr. „Zastava 10“, „Nocto noćni stočić“, „YouTube kanal“…</Empty>}
      <div className="grid md:grid-cols-2 gap-4">
        {shown.map((p) => (
          <ProjectCard key={p.id} p={p} onEdit={() => setEdit(p)} />
        ))}
      </div>
      <ProjectEditor p={edit} count={projects.length} onClose={() => setEdit(null)} />
    </div>
  )
}

function ProjectCard({ p, onEdit }: { p: Item<ProjectData>; onEdit: () => void }) {
  const [text, setText] = useState('')
  const [showDone, setShowDone] = useState(false)
  const done = p.data.tasks.filter((t) => t.done).length
  const open = p.data.tasks.filter((t) => !t.done)
  const closed = p.data.tasks.filter((t) => t.done)
  const upd = (fn: (d: ProjectData) => ProjectData) => store.update<ProjectData>(p.id, fn)
  const add = () => {
    if (!text.trim()) return
    upd((d) => ({ ...d, tasks: [...d.tasks, { id: uid(), text: text.trim(), done: false }] }))
    setText('')
  }
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ background: p.data.color }} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{p.data.name}</div>
          {p.data.notes && <div className="text-xs text-ink-soft mt-0.5 whitespace-pre-wrap">{p.data.notes}</div>}
        </div>
        <IconButton title="Izmeni projekat" onClick={onEdit}>
          <Pencil size={15} />
        </IconButton>
      </div>
      {p.data.tasks.length > 0 && (
        <div className="flex items-center gap-2 mt-3">
          <Progress value={done} max={p.data.tasks.length} color={p.data.color} height={6} />
          <span className="text-xs text-ink-faint tabular shrink-0">
            {done}/{p.data.tasks.length}
          </span>
        </div>
      )}
      <ul className="mt-3 space-y-1">
        {[...open, ...(showDone ? closed : [])].map((t) => (
          <li key={t.id} className="group flex items-center gap-2.5 py-1">
            <CheckCircle
              done={t.done}
              color={p.data.color}
              size={20}
              onClick={() => upd((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }))}
            />
            <span className={cx('flex-1 text-sm', t.done && 'line-through text-ink-faint')}>{t.text}</span>
            <button
              aria-label="Ukloni zadatak"
              onClick={() => upd((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) }))}
              className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-rose-600"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      {closed.length > 0 && (
        <button className="text-xs text-ink-soft mt-1" onClick={() => setShowDone(!showDone)}>
          {showDone ? 'Sakrij urađeno' : `Prikaži urađeno (${closed.length})`}
        </button>
      )}
      <div className="flex gap-2 mt-3">
        <input className="flex-1 py-1.5 text-sm" placeholder="Novi zadatak…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add} disabled={!text.trim()}>
          <Plus size={15} />
        </Button>
      </div>
    </Card>
  )
}

function ProjectEditor({ p, count, onClose }: { p: Item<ProjectData> | 'new' | null; count: number; onClose: () => void }) {
  const existing = p && p !== 'new' ? p : undefined
  const blank = (): ProjectData => ({ name: '', color: '#8b5cf6', status: 'aktivan', tasks: [], order: count + 1 })
  const [d, setD] = useState<ProjectData>(blank())
  const [last, setLast] = useState<typeof p>(null)
  if (p !== last) {
    setLast(p)
    setD(existing?.data ?? blank())
  }
  return (
    <Modal
      open={!!p}
      onClose={onClose}
      title={existing ? 'Izmeni projekat' : 'Novi projekat'}
      footer={
        <>
          {existing && (
            <Button
              variant="ghost"
              className="mr-auto text-rose-600"
              onClick={() => {
                store.remove(existing.id)
                onClose()
              }}
            >
              <Trash2 size={15} /> Obriši
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!d.name.trim()}
            onClick={() => {
              if (existing) store.update<ProjectData>(existing.id, () => d)
              else store.put<ProjectData>('project', d)
              onClose()
            }}
          >
            Sačuvaj
          </Button>
        </>
      }
    >
      <Field label="Naziv">
        <input className="w-full" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
      </Field>
      <Field label="Status">
        <Segmented<Status>
          value={d.status}
          onChange={(v) => setD({ ...d, status: v })}
          options={[
            { value: 'aktivan', label: 'Aktivan' },
            { value: 'pauza', label: 'Pauza' },
            { value: 'zavrsen', label: 'Završen' },
          ]}
        />
      </Field>
      <Field label="Beleška">
        <textarea className="w-full" rows={3} value={d.notes ?? ''} onChange={(e) => setD({ ...d, notes: e.target.value || undefined })} />
      </Field>
      <Field label="Boja">
        <ColorPicker value={d.color} onChange={(c) => setD({ ...d, color: c })} />
      </Field>
      <SectionTitle>{d.tasks.length} zadataka</SectionTitle>
    </Modal>
  )
}
