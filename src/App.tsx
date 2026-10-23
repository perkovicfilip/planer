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
import { supabase, LOCAL_MODE } from './lib/supabase'
import { store, useSyncStatus } from './lib/store'
import { useRoute, go, type Route } from './lib/router'
import { ensureDefaults } from './data/defaults'
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
import { NAV } from './nav'
import { startNative } from './native/bridge'


export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(LOCAL_MODE ? null : undefined)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (LOCAL_MODE) {
      store.start(null).then(() => {
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
      default: return <Danas />
    }
  })()
  const moreActive = !NAV.find((n) => n.route === route)?.mobile
  return (
    <div className="min-h-full md:flex">
      {/* Bočni meni (laptop) */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-line h-screen sticky top-0 px-3 py-5">
        <div className="px-3 mb-6 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Planer</span>
          <SyncBadge />
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <a
              key={n.route}
              href={'#/' + n.route}
              className={cx(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition',
                route === n.route ? 'bg-paper-sunk font-medium text-ink' : 'text-ink-soft hover:bg-paper-sunk/60',
              )}
            >
              {n.icon}
              {n.label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 pt-3 safe-top">
          <span className="text-sm font-semibold text-ink-soft">Planer</span>
          <SyncBadge />
        </div>
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-3 md:pt-8 pb-28 md:pb-12">{page}</div>
      </main>

      {/* Donji meni (telefon) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper-raised/95 backdrop-blur border-t border-line safe-bottom">
        <div className="grid grid-cols-5">
          {NAV.filter((n) => n.mobile).map((n) => (
            <button
              key={n.route}
              onClick={() => go(n.route)}
              className={cx('flex flex-col items-center gap-0.5 py-2 text-[11px]', route === n.route ? 'text-accent' : 'text-ink-faint')}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
          <button
            onClick={() => go('vise')}
            className={cx('flex flex-col items-center gap-0.5 py-2 text-[11px]', moreActive ? 'text-accent' : 'text-ink-faint')}
          >
            <MoreHorizontal size={20} />
            Više
          </button>
        </div>
      </nav>
    </div>
  )
}

