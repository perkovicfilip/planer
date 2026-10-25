import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { store, useKind } from '../lib/store'
import { fmtLong, iso } from '../lib/dates'
import { occursOn } from '../lib/logic'
import type { Category, EventData } from '../lib/types'
import { Button, Modal } from './kit'

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

  useEffect(() => {
    if (open) {
      setCatId('')
      setFrom(start ?? '')
      setTo('')
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
      title: c.name,
      categoryId: catId,
      date: day,
      start: from || undefined,
      end: from && to ? to : undefined,
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
              <div key={e.id} className="flex items-center gap-2.5 py-1.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c?.color ?? '#64748b' }} />
                <span className="flex-1 truncate">{c?.name ?? e.data.title}</span>
                {e.data.start && (
                  <span className="text-sm text-ink-soft tabular">
                    {e.data.start}
                    {e.data.end ? `–${e.data.end}` : ''}
                  </span>
                )}
                <button title="Obriši" className="text-ink-faint hover:text-rose-600" onClick={() => store.remove(e.id)}>
                  <X size={17} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {sortedCats.length === 0 ? (
        <p className="text-ink-soft">Prvo dodaj događaj u listu desno u kalendaru.</p>
      ) : (
        <>
          <select className="w-full mb-3" value={catId} onChange={(e) => setCatId(e.target.value)} autoFocus>
            <option value="">Izaberi događaj…</option>
            {sortedCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.data.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-soft w-6">Od</span>
            <input type="time" className="w-[8rem]" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-sm text-ink-soft ml-2">Do</span>
            <input type="time" className="w-[8rem]" value={to} onChange={(e) => setTo(e.target.value)} disabled={!from} />
          </div>
        </>
      )}
    </Modal>
  )
}
