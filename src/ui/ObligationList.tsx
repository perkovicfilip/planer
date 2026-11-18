import { useState } from 'react'
import { store, useVersion } from '../lib/store'
import { addDays, fmtShort, today } from '../lib/dates'
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

/** Traka poslednjih 60 dana: zeleno = sve obaveze urađene, crveno = bar jedna nije. */
export function ObligationStrip() {
  useVersion()
  const DAYS = 60
  const end = today()
  const start = addDays(end, -(DAYS - 1))
  const firstData = [
    ...store.list<{ date: string }>('actday').map((x) => x.data.date),
    ...store.list<{ date: string }>('mealday').map((x) => x.data.date),
  ]
    .filter(Boolean)
    .sort()[0] ?? end
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i))
  const status = new Map<string, 'ok' | 'bad' | 'none'>()
  for (const d of days) {
    if (d < firstData) {
      status.set(d, 'none')
      continue
    }
    const list = obligationsFor(d)
    status.set(d, list.length === 0 ? 'none' : list.every((o) => o.done) ? 'ok' : d === end ? 'none' : 'bad')
  }
  const tracked = days.filter((d) => d < end && status.get(d) !== 'none')
  const okCount = tracked.filter((d) => status.get(d) === 'ok').length
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const st = status.get(days[i])
    if (days[i] === end && st !== 'ok') continue
    if (st === 'ok') streak++
    else break
  }
  return (
    <div className="pt-3 border-t border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5 text-sm">
        <span className="font-semibold">Poslednjih {DAYS} dana</span>
        <span className="text-ink-soft">
          Sve urađeno <b className="text-emerald-600">{okCount}</b> od {tracked.length} dana · niz <b>{streak}</b>
        </span>
      </div>
      <div className="flex h-7 rounded-lg overflow-hidden border border-line">
        {days.map((d) => {
          const st = status.get(d)
          const bg = st === 'ok' ? '#16a34a' : st === 'bad' ? '#e11d48' : 'rgb(var(--paper-sunk))'
          return (
            <div
              key={d}
              title={`${fmtShort(d)}${st === 'ok' ? ': sve urađeno' : st === 'bad' ? ': nije sve urađeno' : ''}`}
              className={cx('flex-1 border-r border-black/10 last:border-r-0', d === end && 'ring-2 ring-inset ring-ink')}
              style={{ background: bg }}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-ink-faint mt-1">
        <span>{fmtShort(start)}</span>
        <span className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#16a34a]" /> sve urađeno
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#e11d48]" /> nije sve
          </span>
        </span>
        <span>danas</span>
      </div>
    </div>
  )
}
