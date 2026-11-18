import { useEffect, useMemo, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { store, useKind } from '../lib/store'
import { fmtLong, iso } from '../lib/dates'
import { occursOn } from '../lib/logic'
import type { Category, EventData } from '../lib/types'
import { Button, Modal, cx } from './kit'

/**
 * Prozor za jedan dan: šta je upisano + izbor događaja iz liste i opciono vreme od–do.
 * Novi događaji se prave samo u listi desno u kalendaru.
 */
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
  const events = useKind<EventData>('event')
  const day = (eventId && store.get<EventData>(eventId)?.data.date) || date || iso()
  const [catId, setCatId] = useState('')
  const [from, setFrom] = useState(start ?? '')
  const [to, setTo] = useState('')
  const [name, setName] = useState('')
  const [place, setPlace] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [isDeadline, setIsDeadline] = useState(false)

  useEffect(() => {
    if (open) {
      setCatId('')
      setFrom(start ?? '')
      setTo('')
      setName('')
      setPlace('')
      setEditId(null)
      setIsDeadline(false)
    }
  }, [open, start, day])

  const sortedCats = useMemo(() => [...cats].sort((a, b) => a.data.order - b.data.order), [cats])
  const catMap = new Map(cats.map((c) => [c.id, c.data]))
  const onDay = events
    .filter((e) => occursOn(e.data, day))
    .sort((a, b) => (a.data.start || '99').localeCompare(b.data.start || '99'))

  const add = () => {
    const c = catMap.get(catId)
    if (!c) return
    store.put<EventData>('event', {
      title: name.trim() || c.name,
      place: place.trim() || undefined,
      categoryId: catId,
      date: day,
      start: !isDeadline && from ? from : undefined,
      end: !isDeadline && from && to ? to : undefined,
      deadline: isDeadline || undefined,
      repeat: 'none',
      remindBefore: [],
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      tall={false}
      title={fmtLong(day)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Zatvori
          </Button>
          <Button variant="primary" onClick={add} disabled={!catId}>
            Dodaj
          </Button>
        </>
      }
    >
      {onDay.length > 0 && (
        <div className="mb-4 divide-y divide-line border-y border-line">
          {onDay.map((e) => {
            const c = e.data.categoryId ? catMap.get(e.data.categoryId) : undefined
            return (
              <div key={e.id} className="py-1.5">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c?.color ?? '#64748b' }} />
                <span className="flex-1 min-w-0">
                  <span className={cx('block truncate font-medium', (e.data.doneDates ?? []).length > 0 && e.data.repeat === 'none' && 'line-through opacity-60')}>
                    {e.data.deadline && <span className="text-xs font-semibold text-rose-600 mr-1.5">ROK</span>}
                    {e.data.title}
                  </span>
                  {((c && c.name !== e.data.title) || e.data.place) && (
                    <span className="block truncate text-xs text-ink-faint">
                      {[c && c.name !== e.data.title ? c.name : '', e.data.place ? '📍 ' + e.data.place : ''].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                {editId === e.id ? (
                  <>
                    <input
                      type="time"
                      className="w-[7.5rem] py-0.5 text-sm"
                      value={e.data.start ?? ''}
                      onChange={(ev) => store.update<EventData>(e.id, (d) => ({ ...d, start: ev.target.value || undefined, end: ev.target.value ? d.end : undefined }))}
                      title="Od"
                    />
                    <span className="text-ink-faint">–</span>
                    <input
                      type="time"
                      className="w-[7.5rem] py-0.5 text-sm"
                      value={e.data.end ?? ''}
                      disabled={!e.data.start}
                      onChange={(ev) => store.update<EventData>(e.id, (d) => ({ ...d, end: ev.target.value || undefined }))}
                      title="Do"
                    />
                    <button title="Gotovo" className="text-emerald-600 hover:text-emerald-500" onClick={() => setEditId(null)}>
                      <Check size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    {e.data.start && (
                      <span className="text-sm text-ink-soft tabular">
                        {e.data.start}
                        {e.data.end ? `–${e.data.end}` : ''}
                      </span>
                    )}
                    <button title="Izmeni vreme i mesto" className="text-ink-faint hover:text-ink" onClick={() => setEditId(e.id)}>
                      <Pencil size={15} />
                    </button>
                  </>
                )}
                <button title="Obriši" className="text-ink-faint hover:text-rose-600" onClick={() => store.remove(e.id)}>
                  <X size={17} />
                </button>
              </div>
              {editId === e.id && (
                <input
                  className="w-full mt-1.5 py-1 text-sm"
                  placeholder="Mesto (opciono)"
                  value={e.data.place ?? ''}
                  onChange={(ev) => store.update<EventData>(e.id, (d) => ({ ...d, place: ev.target.value || undefined }))}
                />
              )}
              </div>
            )
          })}
        </div>
      )}

      {sortedCats.length === 0 ? (
        <p className="text-ink-soft">Prvo dodaj događaj u listu desno u kalendaru.</p>
      ) : (
        <>
          <div className="flex rounded-lg bg-paper-sunk p-0.5 text-sm mb-3">
            {[
              { v: false, label: 'Termin (tačan dan)' },
              { v: true, label: 'Rok (uraditi do ovog dana)' },
            ].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => setIsDeadline(o.v)}
                className={cx('flex-1 px-3 py-1.5 rounded-md', isDeadline === o.v ? 'bg-paper-raised font-semibold shadow-sm' : 'text-ink-faint hover:text-ink')}
              >
                {o.label}
              </button>
            ))}
          </div>
          <select className="w-full mb-3" value={catId} onChange={(e) => setCatId(e.target.value)} autoFocus>
            <option value="">Izaberi događaj…</option>
            {sortedCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.data.name}
              </option>
            ))}
          </select>
          <input
            className="w-full mb-3"
            placeholder={isDeadline ? 'Naziv (npr. Predaja K1)' : 'Naziv (opciono, npr. PZ1 i PZ2)'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <input
            className="w-full mb-3"
            placeholder="Mesto (opciono)"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          {!isDeadline && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-soft w-6">Od</span>
            <input type="time" className="w-[8rem]" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-sm text-ink-soft ml-2">Do</span>
            <input type="time" className="w-[8rem]" value={to} onChange={(e) => setTo(e.target.value)} disabled={!from} />
          </div>
          )}
        </>
      )}
    </Modal>
  )
}
