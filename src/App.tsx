import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  CalendarDays,
  CalendarClock,
  Home,
  UtensilsCrossed,
  Dumbbell,
  MoreHorizontal,
  Flame,
  GraduationCap,
  Table2,
  Target,
  StickyNote,
  Settings,
  CloudOff,
  RefreshCw,
  Cloud,
} from 'lucide-react'
import { supabase, LOCAL_MODE, DEMO } from './lib/supabase'
import { store, useSyncStatus } from './lib/store'
import { useRoute, go, type Route } from './lib/router'
import { ensureDefaults } from './data/defaults'
import { useSettings } from './lib/logic'
import { cx } from './ui/kit'
import Auth from './pages/Auth'
import Danas from './pages/Danas'
import Kalendar from './pages/Kalendar'
import Dan from './pages/Dan'
import Ishrana from './pages/Ishrana'
import Trening from './pages/Trening'
import Navike from './pages/Navike'
import Predmeti from './pages/Predmeti'
import Raspored from './pages/Raspored'
import Ciljevi from './pages/Ciljevi'
import Beleske from './pages/Beleske'
import Podesavanja from './pages/Podesavanja'
import Vise from './pages/Vise'
import Finansije from './pages/Finansije'
import Lista from './pages/Lista'
import Projekti from './pages/Projekti'
import { NAV } from './nav'
import { startNative } from './native/bridge'


export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(LOCAL_MODE ? null : undefined)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (LOCAL_MODE) {
      store.start(null).then(async () => {
        if (DEMO) {
          const mods = import.meta.glob('./demo/load.ts')
          const loader = Object.values(mods)[0]
          if (loader) ((await loader()) as { loadDemo: () => void }).loadDemo()
        }
        ensureDefaults()
        setReady(true)
      })
      return
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (LOCAL_MODE || !userId) return
    setReady(false)
    store.start(userId).then(() => {
      ensureDefaults()
      setReady(true)
    })
    return () => store.stop()
  }, [userId])

  useEffect(() => {
    if (ready) startNative()
  }, [ready])

  if (session === undefined) return <Splash />
  if (!LOCAL_MODE && !session) return <Auth />
  if (!ready) return <Splash />
  return <Shell />
}

function Splash() {
  return (
    <div className="h-full grid place-items-center">
      <div className="w-10 h-10 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
    </div>
  )
}

function SyncBadge() {
  const s = useSyncStatus()
  const map = {
    lokalno: { icon: <CloudOff size={14} />, text: 'Lokalno', cls: 'text-ink-faint' },
    offline: { icon: <CloudOff size={14} />, text: 'Offline', cls: 'text-amber-600' },
    sinhronizujem: { icon: <RefreshCw size={14} className="animate-spin" />, text: 'Čuvam…', cls: 'text-ink-faint' },
    sinhronizovano: { icon: <Cloud size={14} />, text: 'Sačuvano', cls: 'text-emerald-600' },
    greska: { icon: <CloudOff size={14} />, text: 'Greška sinhr.', cls: 'text-rose-600' },
  }[s]
  return (
    <button
      onClick={() => store.pull().then(() => store.flush())}
      title="Sinhronizuj sada"
      className={cx('inline-flex items-center gap-1 text-xs', map.cls)}
    >
      {map.icon}
      {map.text}
    </button>
  )
}

function applySize(px: number) {
  document.documentElement.style.setProperty('--ui-size', `${px}px`)
  try {
    localStorage.setItem('planer:ui-size', String(px))
  } catch {
    /* nije bitno */
  }
}
try {
  const saved = Number(localStorage.getItem('planer:ui-size'))
  if (saved >= 12 && saved <= 22) document.documentElement.style.setProperty('--ui-size', `${saved}px`)
} catch {
  /* nije bitno */
}

function SizeControl() {
  const [s, setS] = useSettings()
  const size = s.uiSize || 17
  useEffect(() => applySize(size), [size])
  const change = (d: number) => setS((x) => ({ ...x, uiSize: Math.min(22, Math.max(13, (x.uiSize || 17) + d)) }))
  return (
    <div className="flex items-center gap-1 px-2.5 text-ink-soft">
      <span className="text-xs mr-auto whitespace-nowrap">Slova</span>
      <button onClick={() => change(-1)} className="w-7 h-7 rounded-md hover:bg-paper-sunk text-sm font-semibold" title="Manja slova">
        A−
      </button>
      <span className="text-xs tabular w-6 text-center">{size}</span>
      <button onClick={() => change(1)} className="w-7 h-7 rounded-md hover:bg-paper-sunk text-base font-semibold" title="Veća slova">
        A+
      </button>
    </div>
  )
}

function Shell() {
  const { route, param } = useRoute()
  const page = (() => {
    switch (route) {
      case 'kalendar': return <Kalendar param={param} />
      case 'dan': return <Dan param={param} />
      case 'ishrana': return <Ishrana param={param} />
      case 'trening': return <Trening param={param} />
      case 'navike': return <Navike />
      case 'predmeti': return <Predmeti />
      case 'raspored': return <Raspored />
      case 'ciljevi': return <Ciljevi />
      case 'beleske': return <Beleske />
      case 'podesavanja': return <Podesavanja />
      case 'vise': return <Vise />
      case 'finansije': return <Finansije param={param} />
      case 'lista': return <Lista />
      case 'projekti': return <Projekti />
      default: return <Danas />
    }
  })()
  const moreActive = !NAV.find((n) => n.route === route)?.mobile
  return (
    <div className="min-h-full md:flex">
      {/* Bočni meni (laptop) */}
      <aside className="hidden md:flex md:flex-col w-52 shrink-0 border-r border-line h-screen sticky top-0 px-2.5 py-4 overflow-y-auto">
        <div className="px-2.5 mb-4 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Planer</span>
          <SyncBadge />
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <a
              key={n.route}
              href={'#/' + n.route}
              className={cx(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition [&>svg]:w-[18px] [&>svg]:h-[18px]',
                route === n.route ? 'bg-paper-sunk font-medium text-ink' : 'text-ink-soft hover:bg-paper-sunk/60',
              )}
            >
              {n.icon}
              {n.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto pt-3">
          <SizeControl />
        </div>
      </aside>

      <main className="flex-1 min-w-0 md:h-screen md:overflow-y-auto md:flex md:flex-col">
        <div className="md:hidden flex items-center justify-between px-4 pt-3 safe-top">
          <span className="text-sm font-semibold text-ink-soft">Planer</span>
          <SyncBadge />
        </div>
        {DEMO && (
          <div className="mx-4 md:mx-6 mt-3 md:mt-4 rounded-lg bg-accent-soft text-ink px-3 py-2 text-xs">
            Probna verzija sa primerima — sve što menjaš čuva se samo u ovom browseru.
          </div>
        )}
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-3 md:pt-5 pb-28 md:pb-5 md:flex-1 md:flex md:flex-col md:min-h-0">{page}</div>
      </main>

      {/* Donji meni (telefon) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper-raised/95 backdrop-blur border-t border-line safe-bottom">
        <div className="grid grid-cols-5">
          {NAV.filter((n) => n.mobile).map((n) => (
            <button
              key={n.route}
              onClick={() => go(n.route)}
              className={cx('flex flex-col items-center gap-0.5 py-2 text-xs', route === n.route ? 'text-accent' : 'text-ink-faint')}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
          <button
            onClick={() => go('vise')}
            className={cx('flex flex-col items-center gap-0.5 py-2 text-xs', moreActive ? 'text-accent' : 'text-ink-faint')}
          >
            <MoreHorizontal size={20} />
            Više
          </button>
        </div>
      </nav>
    </div>
  )
}

