import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { store, useKind } from '../lib/store'
import { iso } from '../lib/dates'
import type { Category, EventData, Repeat } from '../lib/types'
import { Button, Field, Modal, Segmented, cx } from './kit'

const REMIND_OPTIONS: { v: number; label: string }[] = [
  { v: 10, label: '10 min' },
  { v: 30, label: '30 min' },
  { v: 60, label: '1 h' },
  { v: 180, label: '3 h' },
  { v: 1440, label: '1 dan' },
  { v: 4320, label: '3 dana' },
  { v: 10080, label: '7 dana' },
]

export function EventEditor({
  open,
  onClose,
  eventId,
  date,
  start,
}: {
  open: boolean
  onClose: () => void
  eventId?: string
  date?: string
  start?: string
}) {
  const cats = useKind<Category>('category')
  const sortedCats = useMemo(
    () => [...cats].sort((a, b) => a.data.group.localeCompare(b.data.group) || a.data.order - b.data.order),
    [cats],
  )
  const existing = eventId ? store.get<EventData>(eventId) : undefined
  const blank = (): EventData => ({
    title: '',
    date: date ?? iso(),
    start,
    end: start ? addHour(start) : undefined,
    repeat: 'none',
    remindBefore: [],
  })
  const [d, setD] = useState<EventData>(existing?.data ?? blank())
  const [timed, setTimed] = useState<boolean>(!!(existing?.data.start ?? start))
  const [multi, setMulti] = useState<boolean>(!!existing?.data.endDate)

  useEffect(() => {
    if (!open) return
    const ex = eventId ? store.get<EventData>(eventId) : undefined
    setD(ex?.data ?? blank())
    setTimed(!!(ex?.data.start ?? start))
    setMulti(!!ex?.data.endDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId, date, start])

  const set = <K extends keyof EventData>(k: K, v: EventData[K]) => setD((x) => ({ ...x, [k]: v }))

  function save() {
    if (!d.title.trim()) return
    const clean: EventData = {
      ...d,
      title: d.title.trim(),
      start: timed ? d.start || '09:00' : undefined,
      end: timed ? d.end || undefined : undefined,
      endDate: multi && d.endDate && d.endDate > d.date ? d.endDate : undefined,
      repeatUntil: d.repeat !== 'none' ? d.repeatUntil : undefined,
    }
    if (eventId) store.update<EventData>(eventId, () => clean)
    else store.put<EventData>('event', clean)
    onClose()
  }

  function remove() {
    if (eventId && confirm('Obrisati ovaj događaj?')) {
      store.remove(eventId)
      onClose()
    }
  }

  const toggleRemind = (v: number) => {
    const s = new Set(d.remindBefore ?? [])
    if (s.has(v)) s.delete(v)
    else s.add(v)
    set('remindBefore', [...s].sort((a, b) => a - b))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={eventId ? 'Izmeni događaj' : 'Novi događaj'}
      footer={
        <>
          {eventId && (
            <Button variant="ghost" onClick={remove} className="mr-auto text-rose-600">
              <Trash2 size={16} /> Obriši
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
        <input
          autoFocus
          className="w-full"
          placeholder="npr. Kolokvijum 1, Ispit, Wolt smena…"
          value={d.title}
          onChange={(e) => set('title', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      </Field>

      <Field label="Aktivnost (boja u kalendaru)">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => set('categoryId', undefined)}
            className={cx('px-2.5 py-1 rounded-full text-sm border', !d.categoryId ? 'border-ink' : 'border-line text-ink-soft')}
          >
            Bez
          </button>
          {sortedCats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => set('categoryId', c.id)}
              className={cx(
                'px-2.5 py-1 rounded-full text-sm border inline-flex items-center gap-1.5',
                d.categoryId === c.id ? 'border-ink font-medium' : 'border-line text-ink-soft',
              )}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.data.color }} />
              {c.data.name}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={multi ? 'Od' : 'Datum'}>
          <input type="date" className="w-full" value={d.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        {multi ? (
          <Field label="Do">
            <input type="date" className="w-full" value={d.endDate ?? d.date} min={d.date} onChange={(e) => set('endDate', e.target.value)} />
          </Field>
        ) : (
          <div className="flex items-end pb-3">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
              Više dana
            </label>
          </div>
        )}
      </div>
      {multi && (
        <label className="flex items-center gap-2 text-sm text-ink-soft -mt-1 mb-3">
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
          Više dana (npr. Na putu)
        </label>
      )}

      <label className="flex items-center gap-2 text-sm mb-2">
        <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
        Tačno vreme
      </label>
      {timed && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Od">
            <input type="time" className="w-full" value={d.start ?? ''} onChange={(e) => set('start', e.target.value)} />
          </Field>
          <Field label="Do">
            <input type="time" className="w-full" value={d.end ?? ''} onChange={(e) => set('end', e.target.value)} />
          </Field>
        </div>
      )}

      <Field label="Ponavljanje">
        <Segmented<Repeat>
          value={d.repeat}
          onChange={(v) => set('repeat', v)}
          options={[
            { value: 'none', label: 'Nikad' },
            { value: 'daily', label: 'Svaki dan' },
            { value: 'weekly', label: 'Svake nedelje' },
          ]}
        />
      </Field>
      {d.repeat !== 'none' && (
        <Field label="Ponavljaj do (opciono)">
          <input type="date" className="w-full" value={d.repeatUntil ?? ''} onChange={(e) => set('repeatUntil', e.target.value || undefined)} />
        </Field>
      )}

      <Field label="Podsetnik pre početka" hint={!timed ? 'Za događaje bez vremena podsetnik se računa od 09:00.' : undefined}>
        <div className="flex flex-wrap gap-1.5">
          {REMIND_OPTIONS.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => toggleRemind(o.v)}
              className={cx(
                'px-2.5 py-1 rounded-full text-sm border',
                d.remindBefore?.includes(o.v) ? 'bg-accent text-white border-accent' : 'border-line text-ink-soft',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Beleška">
        <textarea className="w-full" rows={2} value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </Modal>
  )
}

function addHour(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
