import { useLayoutEffect, useRef, useState } from 'react'
import { daysBetween, fmtShort, addDays, parse } from '../lib/dates'
import type { WeightData } from '../lib/types'

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 600, h: 300 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ w: Math.max(200, el.clientWidth), h: Math.max(180, el.clientHeight) })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

const SHORT_MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec']

/**
 * Grafik kilaže po vremenu:
 *  - tačke = merenja
 *  - zelena zastavica = početak (datum + kilaža tog dana)
 *  - plava meta = ciljna kilaža na ciljni datum
 *  - isprekidana linija = idealna putanja od početka do cilja
 */
export function WeightChart({
  weights,
  startDate,
  startKg,
  targetKg,
  targetDate,
}: {
  weights: WeightData[]
  startDate: string
  startKg: number | null
  targetKg: number | null
  targetDate: string | null
}) {
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>()
  const pad = { l: 44, r: 70, t: 20, b: 28 }

  // vremenska osa
  const dates = weights.map((x) => x.date)
  let d0 = [startDate, ...dates].sort()[0]
  let d1 = [targetDate ?? startDate, ...dates].sort().reverse()[0]
  if (d0 === d1) d1 = addDays(d0, 30)
  d0 = addDays(d0, -3)
  d1 = addDays(d1, 3)
  const span = daysBetween(d0, d1)

  // kilaža osa
  const ys = [...weights.map((x) => x.kg), ...(startKg !== null ? [startKg] : []), ...(targetKg !== null ? [targetKg] : [])]
  let lo = ys.length ? Math.min(...ys) : 60
  let hi = ys.length ? Math.max(...ys) : 80
  if (hi - lo < 4) {
    const mid = (hi + lo) / 2
    lo = mid - 2
    hi = mid + 2
  }
  lo = Math.floor(lo - 1)
  hi = Math.ceil(hi + 1)

  const sx = (d: string) => pad.l + (daysBetween(d0, d) / span) * (W - pad.l - pad.r)
  const sy = (kg: number) => pad.t + (1 - (kg - lo) / (hi - lo)) * (H - pad.t - pad.b)

  // podeoci: ceo kilogram, otprilike 6–8 linija
  const step = Math.max(1, Math.ceil((hi - lo) / 7))
  const yTicks: number[] = []
  for (let v = Math.ceil(lo); v <= hi; v += step) yTicks.push(v)

  // meseci na x osi
  const xTicks: string[] = []
  const first = parse(d0)
  for (let m = new Date(first.getFullYear(), first.getMonth() + 1, 1); ; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    const iso = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-01`
    if (iso > d1) break
    xTicks.push(iso)
  }

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const path = sorted.map((p, i) => `${i ? 'L' : 'M'}${sx(p.date).toFixed(1)},${sy(p.kg).toFixed(1)}`).join(' ')
  const last = sorted[sorted.length - 1]

  return (
    <div ref={ref} className="w-full h-full min-h-[220px]">
      <svg width={W} height={H} className="block">
        {/* mreža */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} stroke="rgb(var(--line))" />
            <text x={pad.l - 8} y={sy(v) + 4} textAnchor="end" fontSize={12} fill="rgb(var(--ink-faint))">
              {v}
            </text>
          </g>
        ))}
        {xTicks.map((d) => (
          <g key={d}>
            <line x1={sx(d)} x2={sx(d)} y1={pad.t} y2={H - pad.b} stroke="rgb(var(--line))" strokeDasharray="2 4" />
            <text x={sx(d)} y={H - 8} textAnchor="middle" fontSize={12} fill="rgb(var(--ink-faint))">
              {SHORT_MONTHS[parse(d).getMonth()]}
            </text>
          </g>
        ))}

        {/* idealna putanja */}
        {startKg !== null && targetKg !== null && targetDate && (
          <line
            x1={sx(startDate)}
            y1={sy(startKg)}
            x2={sx(targetDate)}
            y2={sy(targetKg)}
            stroke="#16a34a"
            strokeWidth={2}
            strokeDasharray="6 6"
            strokeOpacity={0.6}
          />
        )}

        {/* ciljna kilaža: horizontalna linija + meta */}
        {targetKg !== null && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={sy(targetKg)} y2={sy(targetKg)} stroke="#16a34a" strokeOpacity={0.35} />
            <text x={W - pad.r + 6} y={sy(targetKg) + 4} fontSize={12} fontWeight={600} fill="#16a34a">
              Cilj {targetKg} kg
            </text>
            {targetDate && (
              <g>
                <circle cx={sx(targetDate)} cy={sy(targetKg)} r={9} fill="none" stroke="#16a34a" strokeWidth={2} />
                <circle cx={sx(targetDate)} cy={sy(targetKg)} r={3.5} fill="#16a34a" />
              </g>
            )}
          </g>
        )}

        {/* početak */}
        <g>
          <line x1={sx(startDate)} x2={sx(startDate)} y1={pad.t} y2={H - pad.b} stroke="#2563eb" strokeOpacity={0.5} strokeWidth={1.5} />
          <text x={sx(startDate) + 5} y={pad.t + 10} fontSize={12} fontWeight={600} fill="#2563eb">
            Početak {fmtShort(startDate)}
            {startKg !== null ? ` · ${startKg} kg` : ''}
          </text>
          {startKg !== null && <circle cx={sx(startDate)} cy={sy(startKg)} r={6} fill="#2563eb" stroke="rgb(var(--paper-raised))" strokeWidth={2} />}
        </g>

        {/* merenja */}
        {sorted.length > 0 && <path d={path} fill="none" stroke="rgb(var(--ink))" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {sorted.map((p) => (
          <circle key={p.date} cx={sx(p.date)} cy={sy(p.kg)} r={4} fill="rgb(var(--ink))">
            <title>
              {fmtShort(p.date)}: {p.kg} kg
            </title>
          </circle>
        ))}
        {last && (
          <text x={sx(last.date) + 8} y={sy(last.kg) - 8} fontSize={13} fontWeight={700} fill="rgb(var(--ink))">
            {last.kg} kg
          </text>
        )}
      </svg>
    </div>
  )
}
