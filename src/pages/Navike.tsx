import { useState } from 'react'
import { Plus, Pencil, EyeOff } from 'lucide-react'
import { store, useKind } from '../lib/store'
import type { HabitData } from '../lib/types'
import { DAYS_MIN, DAYS_SHORT, addDays, today, weekStart, fmtShort } from '../lib/dates'
import { bestStreak, habitDone, habitDue, streak, toggleHabit } from '../lib/logic'
import { Button, Card, CheckCircle, ColorPicker, Empty, Field, IconButton, Modal, PageHeader, cx } from '../ui/kit'

const WEEKS = 12

export default function Navike() {
  const habits = useKind<HabitData>('habit').sort((a, b) => a.data.order - b.data.order)
  const [edit, setEdit] = useState<string | 'new' | null>(null)
  const date = today()
  const start = addDays(weekStart(date), -7 * (WEEKS - 1))

  return (
    <div>
      <PageHeader
        title="Navike i izazovi"
        right={
          <Button variant="primary" onClick={() => setEdit('new')}>
            <Plus size={16} /> Navika
          </Button>
        }
      />
      {habits.length === 0 && <Empty>Nema navika.</Empty>}
      <div className="grid md:grid-cols-2 gap-3">
        {habits.map((h) => {
          const s = streak(h.data)
          const best = bestStreak(h.data)
          const due = habitDue(h.data, date)
          return (
            <Card key={h.id} className="p-3">
              <div className="flex items-center gap-3">
                {due ? (
                  <CheckCircle done={habitDone(h.data, date)} color={h.data.color} onClick={() => toggleHabit(h.id, date)} size={30} />
                ) : (
                  <span className="w-[30px] h-[30px] rounded-full border-2 border-dashed border-line" title="Danas nije zakazano" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium leading-snug flex items-center gap-1.5">
                    {h.data.alias || h.data.name}
                    {h.data.hidden && <EyeOff size={13} className="text-ink-faint" />}
                  </div>
                  <div className="text-xs text-ink-faint">
                    {h.data.days.length === 7 ? 'Svaki dan' : h.data.days.map((d) => DAYS_SHORT[d]).join(', ')}
                    {h.data.time && ` · ${h.data.time}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold tabular leading-none" style={{ color: h.data.color }}>
                    {s}
                  </div>
                  <div className="text-xs text-ink-faint">niz · rekord {best}</div>
                </div>
                <IconButton title="Izmeni" onClick={() => setEdit(h.id)}>
                  <Pencil size={15} />
                </IconButton>
              </div>
              {/* Mreža poslednjih nedelja: klik na dan = štikliraj unazad */}
              <div className="mt-4 flex gap-1 overflow-x-auto scrollbar-none">
                <div className="grid grid-rows-7 gap-1 text-[0.65rem] text-ink-faint pr-1">
                  {DAYS_MIN.map((d, i) => (
                    <span key={i} className="h-3.5 leading-[14px]">
                      {i % 2 === 0 ? d : ''}
                    </span>
                  ))}
                </div>
                {Array.from({ length: WEEKS }, (_, w) => (
                  <div key={w} className="grid grid-rows-7 gap-1">
                    {Array.from({ length: 7 }, (_, d) => {
                      const day = addDays(start, w * 7 + d)
                      const future = day > date
                      const isDue = habitDue(h.data, day)
                      const done = habitDone(h.data, day)
                      return (
                        <button
                          key={d}
                          disabled={future || !isDue}
                          title={fmtShort(day)}
                          onClick={() => toggleHabit(h.id, day)}
                          className={cx('w-3.5 h-3.5 rounded-[3px]', day === date && 'ring-1 ring-ink')}
                          style={{
                            background: done ? h.data.color : future || !isDue ? 'transparent' : 'rgb(var(--paper-sunk))',
                            border: !isDue && !future ? '1px dashed rgb(var(--line))' : undefined,
                          }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
      <HabitEditor id={edit} onClose={() => setEdit(null)} count={habits.length} />
    </div>
  )
}

function HabitEditor({ id, onClose, count }: { id: string | 'new' | null; onClose: () => void; count: number }) {
  const existing = id && id !== 'new' ? store.get<HabitData>(id) : undefined
  const blank = (): HabitData => ({ name: '', color: '#14b8a6', days: [0, 1, 2, 3, 4, 5, 6], order: count + 1, doneDates: [] })
  const [d, setD] = useState<HabitData>(blank())
  const [last, setLast] = useState<string | null>(null)
  if (id !== last) {
    setLast(id)
    setD(existing?.data ?? blank())
  }
  const set = <K extends keyof HabitData>(k: K, v: HabitData[K]) => setD((x) => ({ ...x, [k]: v }))
  const toggleDay = (i: number) => set('days', d.days.includes(i) ? d.days.filter((x) => x !== i) : [...d.days, i].sort())
  return (
    <Modal
      open={!!id}
      onClose={onClose}
      title={existing ? 'Izmeni naviku' : 'Nova navika'}
      footer={
        <>
          {existing && (
            <Button
              variant="ghost"
              className="mr-auto text-rose-600"
              onClick={() => {
                if (confirm('Obrisati naviku i njenu istoriju?')) {
                  store.remove(existing.id)
                  onClose()
                }
              }}
            >
              Obriši
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!d.name.trim() || d.days.length === 0}
            onClick={() => {
              if (existing) store.update<HabitData>(existing.id, () => d)
              else store.put<HabitData>('habit', d)
              onClose()
            }}
          >
            Sačuvaj
          </Button>
        </>
      }
    >
      <Field label="Naziv">
        <input className="w-full" value={d.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Diskretan naziv (opciono)" hint="Ako je popunjen, svuda se prikazuje on — i u notifikacijama.">
        <input className="w-full" value={d.alias ?? ''} onChange={(e) => set('alias', e.target.value || undefined)} />
      </Field>
      <Field label="Dani">
        <div className="flex gap-1.5">
          {DAYS_SHORT.map((n, i) => (
            <button
              key={n}
              type="button"
              onClick={() => toggleDay(i)}
              className={cx('flex-1 py-2 rounded-lg text-sm border', d.days.includes(i) ? 'bg-accent text-white border-accent' : 'border-line text-ink-soft')}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Vreme (opciono)" hint="Npr. za podsetnik u notifikaciji. Prazno = kraj dana.">
        <input type="time" className="w-full" value={d.time ?? ''} onChange={(e) => set('time', e.target.value || undefined)} />
      </Field>
      <Field label="Boja">
        <ColorPicker value={d.color} onChange={(c) => set('color', c)} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!d.hidden} onChange={(e) => set('hidden', e.target.checked)} />
        Ne prikazuj na početnoj (samo ovde i u obavezama dana)
      </label>
    </Modal>
  )
}
