import { useState } from 'react'
import { Book, Film, Tv, Shuffle, Star, Trash2, Pencil, Plus } from 'lucide-react'
import { store, useKind } from '../lib/store'
import type { Item, MediaData, MediaType } from '../lib/types'
import { fmtShort, today } from '../lib/dates'
import { Button, Card, Empty, Field, IconButton, Modal, PageHeader, SectionTitle, Segmented, cx } from '../ui/kit'

const TYPES: { v: MediaType; label: string; icon: React.ReactNode }[] = [
  { v: 'film', label: 'Filmovi', icon: <Film size={15} /> },
  { v: 'serija', label: 'Serije', icon: <Tv size={15} /> },
  { v: 'knjiga', label: 'Knjige', icon: <Book size={15} /> },
]

export default function Lista() {
  const all = useKind<MediaData>('media')
  const [type, setType] = useState<MediaType>('film')
  const [title, setTitle] = useState('')
  const [who, setWho] = useState('')
  const [pick, setPick] = useState<Item<MediaData> | null>(null)
  const [edit, setEdit] = useState<Item<MediaData> | null>(null)
  const [rate, setRate] = useState<Item<MediaData> | null>(null)

  const list = all.filter((m) => m.data.type === type)
  const todo = list.filter((m) => !m.data.done).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const done = list.filter((m) => m.data.done).sort((a, b) => (b.data.doneOn ?? '').localeCompare(a.data.doneOn ?? ''))

  const add = () => {
    if (!title.trim()) return
    store.put<MediaData>('media', { title: title.trim(), type, done: false, recommendedBy: who.trim() || undefined })
    setTitle('')
    setWho('')
  }
  const random = () => {
    if (todo.length === 0) return
    setPick(todo[Math.floor(Math.random() * todo.length)])
  }
  const verb = type === 'knjiga' ? 'pročitano' : 'odgledano'

  return (
    <div>
      <PageHeader title="Filmovi i knjige" sub="Šta da gledam ili čitam kad mi se gleda ili čita." />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Segmented<MediaType>
          value={type}
          onChange={setType}
          options={TYPES.map((t) => ({
            value: t.v,
            label: (
              <span className="inline-flex items-center gap-1.5">
                {t.icon}
                {t.label}
              </span>
            ),
          }))}
        />
        <Button className="ml-auto" onClick={random} disabled={todo.length === 0}>
          <Shuffle size={15} /> Izaberi mi nešto
        </Button>
      </div>

      <Card className="p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1"
            placeholder={type === 'knjiga' ? 'Naziv knjige' : type === 'serija' ? 'Naziv serije' : 'Naziv filma'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <input className="sm:w-48" placeholder="Ko je preporučio?" value={who} onChange={(e) => setWho(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button variant="primary" onClick={add} disabled={!title.trim()}>
            <Plus size={16} /> Dodaj
          </Button>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <section>
          <SectionTitle>Na listi · {todo.length}</SectionTitle>
          <Card className="px-4 py-1">
            {todo.length === 0 ? (
              <Empty>Lista je prazna — dodaj nešto što ti je neko preporučio.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {todo.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{m.data.title}</div>
                      {(m.data.recommendedBy || m.data.note) && (
                        <div className="text-xs text-ink-faint truncate">
                          {m.data.recommendedBy && `preporuka: ${m.data.recommendedBy}`}
                          {m.data.recommendedBy && m.data.note && ' · '}
                          {m.data.note}
                        </div>
                      )}
                    </div>
                    <Button variant="soft" className="py-1.5" onClick={() => setRate(m)}>
                      ✓ {verb[0].toUpperCase() + verb.slice(1)}
                    </Button>
                    <IconButton title="Izmeni" onClick={() => setEdit(m)}>
                      <Pencil size={14} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
        <section>
          <SectionTitle>Završeno · {done.length}</SectionTitle>
          <Card className="px-4 py-1">
            {done.length === 0 ? (
              <Empty>Još ništa {verb}.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {done.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{m.data.title}</div>
                      <div className="text-xs text-ink-faint">{m.data.doneOn ? fmtShort(m.data.doneOn) : ''}</div>
                    </div>
                    <Stars value={m.data.rating ?? 0} small />
                    <IconButton title="Izmeni" onClick={() => setEdit(m)}>
                      <Pencil size={14} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <Modal open={!!pick} onClose={() => setPick(null)} title="Predlog za danas">
        {pick && (
          <div className="text-center py-4">
            <div className="text-2xl font-semibold">{pick.data.title}</div>
            {pick.data.recommendedBy && <div className="text-sm text-ink-soft mt-1">preporuka: {pick.data.recommendedBy}</div>}
            <div className="flex justify-center gap-2 mt-4">
              <Button onClick={random}>
                <Shuffle size={15} /> Drugo
              </Button>
              <Button variant="primary" onClick={() => setPick(null)}>
                Može
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!rate} onClose={() => setRate(null)} title={rate ? rate.data.title : ''}>
        <p className="text-sm text-ink-soft mb-3">Kako ti se svidelo?</p>
        <div className="flex justify-center mb-4">
          <Stars
            value={0}
            onPick={(r) => {
              if (rate) store.update<MediaData>(rate.id, (d) => ({ ...d, done: true, doneOn: today(), rating: r }))
              setRate(null)
            }}
          />
        </div>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            if (rate) store.update<MediaData>(rate.id, (d) => ({ ...d, done: true, doneOn: today() }))
            setRate(null)
          }}
        >
          Bez ocene
        </Button>
      </Modal>

      <MediaEditor item={edit} onClose={() => setEdit(null)} />
    </div>
  )
}

function Stars({ value, onPick, small }: { value: number; onPick?: (n: number) => void; small?: boolean }) {
  const [hover, setHover] = useState(0)
  const v = hover || value
  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onPick}
          onMouseEnter={() => onPick && setHover(n)}
          onClick={() => onPick?.(n)}
          aria-label={`${n} od 5`}
          className={cx(!onPick && 'cursor-default')}
        >
          <Star size={small ? 13 : 32} className={n <= v ? 'text-amber-500 fill-amber-500' : 'text-line'} />
        </button>
      ))}
    </div>
  )
}

function MediaEditor({ item, onClose }: { item: Item<MediaData> | null; onClose: () => void }) {
  const [d, setD] = useState<MediaData | null>(null)
  const [last, setLast] = useState<Item<MediaData> | null>(null)
  if (item !== last) {
    setLast(item)
    setD(item?.data ?? null)
  }
  if (!item || !d) return null
  return (
    <Modal
      open
      onClose={onClose}
      title="Izmeni"
      footer={
        <>
          <Button
            variant="ghost"
            className="mr-auto text-rose-600"
            onClick={() => {
              store.remove(item.id)
              onClose()
            }}
          >
            <Trash2 size={15} /> Obriši
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              store.update<MediaData>(item.id, () => d)
              onClose()
            }}
          >
            Sačuvaj
          </Button>
        </>
      }
    >
      <Field label="Naziv">
        <input className="w-full" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
      </Field>
      <Field label="Vrsta">
        <Segmented<MediaType> value={d.type} onChange={(v) => setD({ ...d, type: v })} options={TYPES.map((t) => ({ value: t.v, label: t.label }))} />
      </Field>
      <Field label="Ko je preporučio">
        <input className="w-full" value={d.recommendedBy ?? ''} onChange={(e) => setD({ ...d, recommendedBy: e.target.value || undefined })} />
      </Field>
      <Field label="Beleška">
        <textarea className="w-full" rows={2} value={d.note ?? ''} onChange={(e) => setD({ ...d, note: e.target.value || undefined })} />
      </Field>
      {d.done && (
        <>
          <Field label="Ocena">
            <Stars value={d.rating ?? 0} onPick={(r) => setD({ ...d, rating: r })} />
          </Field>
          <Button variant="ghost" onClick={() => setD({ ...d, done: false, doneOn: undefined, rating: undefined })}>
            Vrati na listu
          </Button>
        </>
      )}
    </Modal>
  )
}
