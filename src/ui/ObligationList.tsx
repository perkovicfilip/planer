import { useState } from 'react'
import { BookOpen, CalendarCheck, Dumbbell, Flame, Utensils } from 'lucide-react'
import { useVersion } from '../lib/store'
import { obligationsFor, setMealEaten, type Obligation } from '../lib/logic'
import { CheckCircle, Empty, cx } from './kit'
import { EatenPicker } from './EatenPicker'

const KIND_ICON: Record<Obligation['kind'], React.ReactNode> = {
  event: <CalendarCheck size={13} />,
  class: <BookOpen size={13} />,
  training: <Dumbbell size={13} />,
  habit: <Flame size={13} />,
  meal: <Utensils size={13} />,
}

export function ObligationList({ date, hideDone = false, kinds }: { date: string; hideDone?: boolean; kinds?: Obligation['kind'][] }) {
  useVersion()
  const [mealPick, setMealPick] = useState<{ id: string; name: string } | null>(null)
  let list = obligationsFor(date)
  if (kinds) list = list.filter((o) => kinds.includes(o.kind))
  const done = list.filter((o) => o.done).length
  const shown = hideDone ? list.filter((o) => !o.done) : list
  if (list.length === 0) return <Empty>Nema obaveza za ovaj dan.</Empty>
  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-ink-faint mb-2">
        <span className="tabular">
          {done}/{list.length} urađeno
        </span>
        <div className="flex-1 h-1 rounded-full bg-paper-sunk overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(done / list.length) * 100}%` }} />
        </div>
      </div>
      <ul className="divide-y divide-line">
        {shown.map((o) => (
          <li key={o.key} className="flex items-center gap-3 py-1.5">
            <CheckCircle
              done={o.done}
              color={o.color}
              onClick={() => {
                if (o.kind === 'meal' && !o.done) setMealPick({ id: o.key.slice(3), name: o.title })
                else o.toggle()
              }}
            />
            <div className={cx('flex-1 min-w-0', o.done && 'opacity-45')}>
              <div className={cx('text-sm leading-snug truncate', o.done && 'line-through')}>{o.title}</div>
              <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                {KIND_ICON[o.kind]}
                {o.sub && <span className="truncate">{o.sub}</span>}
              </div>
            </div>
            {o.time && <span className="text-sm tabular text-ink-soft">{o.time}</span>}
          </li>
        ))}
      </ul>
      {hideDone && done > 0 && <div className="text-xs text-ink-faint mt-2">{done} urađeno je sklonjeno sa liste.</div>}
      <EatenPicker
        open={!!mealPick}
        date={date}
        name={mealPick?.name ?? ''}
        onClose={() => setMealPick(null)}
        onPick={(t) => {
          if (mealPick) setMealEaten(date, mealPick.id, t)
          setMealPick(null)
        }}
      />
    </div>
  )
}
