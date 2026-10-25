import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { store, useKind } from '../lib/store'
import { fmtLong, iso } from '../lib/dates'
import { distinctColor } from '../lib/colors'
import { occursOn } from '../lib/logic'
import type { Category, EventData } from '../lib/types'
import { Button, Modal } from './kit'

/**
 * Jednostavan prozor za jedan dan: šta je već upisano tog dana + klik na događaj da se doda.
 * Vreme je opciono.
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
  const [time, setTime] = useState(start ?? '')
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (open) {
      setTime(start ?? '')
      setNewName('')
    }
  }, [open, start, day])

  const sortedCats = useMemo(() => [...cats].sort((a, b) => a.data.order - b.data.order), [cats])
  const catMap = new Map(cats.map((c) => [c.id, c.data]))
  const onDay = events
    .filter((e) => occursOn(e.data, day))
    .sort((a, b) => (a.data.start || '99').localeCompare(b.data.start || '99'))

  const add = (cat: { id: string; name: string }) => {
    store.put<EventData>('event', {
      title: cat.name,
      categoryId: cat.id,
      date: day,
      start: time || undefined,
      repeat: 'none',
      remindBefore: [],
    })
    setTime('')
  }

  const addNew = () => {
    const name = newName.trim()
    if (!name) return
    const existing = cats.find((c) => c.data.name.toLowerCase() === name.toLowerCase())
    const id =
      existing?.id ??
      store.put<Category>('category', {
        name,
        color: distinctColor(cats.map((c) => c.data.color)),
        group: 'ostalo',
        order: cats.length + 1,
      })
    add({ id, name: existing?.data.name ?? name })
    setNewName('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      tall={false}
      title={fmtLong(day)}
      footer={
        <Button variant="primary" onClick={onClose}>
          Gotovo
        </Button>
      }
    >
      {onDay.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {onDay.map((e) => {
            const c = e.data.categoryId ? catMap.get(e.data.categoryId) : undefined
            return (
              <div
                key={e.id}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-white"
                style={{ background: c?.color ?? '#64748b' }}
              >
                <span className="flex-1 font-medium truncate" style={{ textShadow: '0 1px 2px rgb(0 0 0 / 0.35)' }}>
                  {e.data.title}
                </span>
                <input
                  type="time"
                  className="w-[7.5rem] py-0.5 text-sm text-ink"
                  value={e.data.start ?? ''}
                  onChange={(ev) => store.update<EventData>(e.id, (d) => ({ ...d, start: ev.target.value || undefined }))}
                  title="Vreme (opciono)"
                />
                <button title="Obriši" className="opacity-80 hover:opacity-100" onClick={() => store.remove(e.id)}>
                  <X size={18} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-ink-soft">U koliko sati</span>
        <input type="time" className="w-[7.5rem]" value={time} onChange={(e) => setTime(e.target.value)} />
        {time && (
          <button className="text-ink-faint hover:text-ink" onClick={() => setTime('')} title="Bez vremena">
            <X size={16} />
          </button>
        )}
        <span className="text-xs text-ink-faint">(nije obavezno)</span>
      </div>

      {sortedCats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {sortedCats.map((c) => (
            <button
              key={c.id}
              onClick={() => add({ id: c.id, name: c.data.name })}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line hover:border-ink text-left"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.data.color }} />
              <span className="truncate">{c.data.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 min-w-0"
          placeholder="Novi događaj…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNew()}
        />
        <Button onClick={addNew} disabled={!newName.trim()}>
          <Plus size={16} /> Dodaj
        </Button>
      </div>
    </Modal>
  )
}
