import { useState } from 'react'
import { MapPin, User } from 'lucide-react'
import { store, useKind } from '../lib/store'
import type { Category, SubjectData } from '../lib/types'
import { RASPORED, RASPORED_SUBJECTS, ALL_GROUPS, type ClassSlot } from '../data/raspored'
import { DAYS_LONG, DAYS_SHORT, weekday, today } from '../lib/dates'
import { Card, PageHeader, SectionTitle, Segmented, cx } from '../ui/kit'

export default function Raspored() {
  const subjects = useKind<SubjectData>('subject')
  const cats = useKind<Category>('category')
  const [onlyMine, setOnlyMine] = useState<'moji' | 'sve'>('moji')
  const todayWd = Math.min(weekday(today()), 4)
  const [day, setDay] = useState(todayWd)

  const byKey = new Map(subjects.filter((s) => s.data.rasporedKey).map((s) => [s.data.rasporedKey!, s]))
  const colorOf = (key: string) => {
    const s = byKey.get(key)
    const c = s?.data.categoryId ? cats.find((x) => x.id === s.data.categoryId) : undefined
    return c?.data.color ?? '#6366f1'
  }
  const visible = (slot: ClassSlot) => {
    const s = byKey.get(slot.subject)
    const group = s?.data.group ?? '1'
    if (slot.group !== 'SVI' && slot.group !== group) return null
    const attending = s ? (slot.type === 'pred' ? !!s.data.attendLectures : !!s.data.attendExercises) : false
    if (onlyMine === 'moji' && !attending) return null
    return { attending }
  }

  const column = (d: number) =>
    RASPORED.filter((r) => r.day === d)
      .map((r) => ({ r, v: visible(r) }))
      .filter((x) => x.v)
      .sort((a, b) => a.r.from.localeCompare(b.r.from))

  return (
    <div>
      <PageHeader
        title="Raspored časova"
        sub="Zimski semestar 2026/27"
        right={
          <Segmented
            value={onlyMine}
            onChange={setOnlyMine}
            options={[
              { value: 'moji', label: 'Gde dolazim' },
              { value: 'sve', label: 'Moje grupe' },
            ]}
          />
        }
      />

      {/* Telefon: jedan dan */}
      <div className="md:hidden">
        <div className="flex gap-1 mb-3">
          {DAYS_SHORT.slice(0, 5).map((d, i) => (
            <button
              key={d}
              onClick={() => setDay(i)}
              className={cx('flex-1 py-2 rounded-xl text-sm', day === i ? 'bg-ink text-paper font-medium' : 'bg-paper-sunk text-ink-soft')}
            >
              {d}
            </button>
          ))}
        </div>
        <DayColumn items={column(day)} colorOf={colorOf} />
      </div>

      {/* Laptop: cela nedelja */}
      <div className="hidden md:grid grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((d) => (
          <div key={d}>
            <div className={cx('text-sm font-semibold mb-2', d === weekday(today()) && 'text-accent')}>{DAYS_LONG[d]}</div>
            <DayColumn items={column(d)} colorOf={colorOf} />
          </div>
        ))}
      </div>

      <SectionTitle>
        <span className="mt-8 block">Grupe i dolasci</span>
      </SectionTitle>
      <Card className="px-4 py-1">
        <ul className="divide-y divide-line">
          {Object.entries(RASPORED_SUBJECTS).map(([key, info]) => {
            const s = byKey.get(key)
            return (
              <li key={key} className="py-2 flex flex-wrap items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorOf(key) }} />
                <span className="flex-1 min-w-[160px] text-sm font-medium">{info.name}</span>
                {s ? (
                  <>
                    <select
                      className="py-1 text-sm"
                      value={s.data.group ?? '1'}
                      onChange={(e) => store.update<SubjectData>(s.id, (d) => ({ ...d, group: e.target.value }))}
                    >
                      {ALL_GROUPS.map((g) => (
                        <option key={g} value={g}>
                          Grupa {g}
                        </option>
                      ))}
                    </select>
                    <Toggle
                      on={!!s.data.attendLectures}
                      label="Predavanja"
                      onClick={() => store.update<SubjectData>(s.id, (d) => ({ ...d, attendLectures: !d.attendLectures }))}
                    />
                    <Toggle
                      on={!!s.data.attendExercises}
                      label="Vežbe"
                      onClick={() => store.update<SubjectData>(s.id, (d) => ({ ...d, attendExercises: !d.attendExercises }))}
                    />
                  </>
                ) : (
                  <span className="text-xs text-ink-faint">Predmet nije povezan — dodaj ga u Predmetima</span>
                )}
              </li>
            )
          })}
        </ul>
      </Card>
      <p className="text-xs text-ink-faint mt-2">Samo časovi označeni sa „dolazim“ ulaze u obaveze dana i notifikacije.</p>
    </div>
  )
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx('px-2.5 py-1 rounded-full text-xs border', on ? 'bg-emerald-600 text-white border-emerald-600' : 'border-line text-ink-soft')}
    >
      {on ? '✓ ' : ''}
      {label}
    </button>
  )
}

function DayColumn({ items, colorOf }: { items: { r: ClassSlot; v: { attending: boolean } | null }[]; colorOf: (k: string) => string }) {
  if (items.length === 0) return <div className="text-sm text-ink-faint py-4">Nema časova.</div>
  return (
    <div className="space-y-2">
      {items.map(({ r, v }) => (
        <div
          key={`${r.subject}-${r.type}-${r.from}-${r.group}`}
          className={cx('rounded-xl p-3 border-l-4 bg-paper-raised border border-line', !v?.attending && 'opacity-50')}
          style={{ borderLeftColor: colorOf(r.subject) }}
        >
          <div className="text-xs tabular text-ink-soft">
            {r.from}–{r.to} · {r.type === 'pred' ? 'Predavanje' : `Vežbe (gr. ${r.group})`}
          </div>
          <div className="text-sm font-medium leading-snug mt-0.5">{RASPORED_SUBJECTS[r.subject]?.name ?? r.subject}</div>
          <div className="text-xs text-ink-faint mt-1 flex items-center gap-1">
            <MapPin size={11} /> {r.room}
          </div>
          <div className="text-xs text-ink-faint flex items-center gap-1">
            <User size={11} /> {r.teacher}
          </div>
        </div>
      ))}
    </div>
  )
}
