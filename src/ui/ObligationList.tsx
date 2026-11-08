import { useState } from 'react'
import { useVersion } from '../lib/store'
import { obligationsFor, type Obligation } from '../lib/logic'
import { Empty, cx } from './kit'

export function ObligationList({ date, hideDone = false, kinds }: { date: string; hideDone?: boolean; kinds?: Obligation['kind'][] }) {
  useVersion()
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
      <div className="space-y-2">
        {shown.map((o) => (
          <div
            key={o.key}
            role="button"
            tabIndex={0}
            onClick={() => o.toggle()}
            onKeyDown={(e) => e.key === 'Enter' && o.toggle()}
            title={o.done ? 'Klikni da poništiš' : 'Klikni kad uradiš'}
            className={cx(
              'flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 cursor-pointer select-none transition',
              o.done ? 'meal-done' : 'meal-todo',
            )}
          >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: o.color }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base leading-snug truncate">{o.title}</div>
              {o.sub && <div className="text-xs opacity-70 truncate">{o.sub}</div>}
            </div>
            {o.time && <span className="text-sm tabular opacity-80">{o.time}</span>}
            {o.done && <span className="text-emerald-600 font-bold">✓</span>}
          </div>
        ))}
      </div>
      {hideDone && done > 0 && <div className="text-xs text-ink-faint mt-2">{done} urađeno je sklonjeno sa liste.</div>}
    </div>
  )
}
