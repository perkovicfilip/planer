import type { ReactNode } from 'react'
import {
  CalendarDays,
  CalendarClock,
  Home,
  UtensilsCrossed,
  Dumbbell,
  Flame,
  GraduationCap,
  Table2,
  Target,
  StickyNote,
  Settings,
} from 'lucide-react'
import type { Route } from './lib/router'

export const NAV: { route: Route; label: string; icon: ReactNode; mobile?: boolean }[] = [
  { route: 'danas', label: 'Danas', icon: <Home size={20} />, mobile: true },
  { route: 'kalendar', label: 'Kalendar', icon: <CalendarDays size={20} />, mobile: true },
  { route: 'dan', label: 'Organizator', icon: <CalendarClock size={20} /> },
  { route: 'ishrana', label: 'Ishrana', icon: <UtensilsCrossed size={20} />, mobile: true },
  { route: 'trening', label: 'Trening', icon: <Dumbbell size={20} />, mobile: true },
  { route: 'navike', label: 'Navike', icon: <Flame size={20} /> },
  { route: 'predmeti', label: 'Predmeti', icon: <GraduationCap size={20} /> },
  { route: 'raspored', label: 'Raspored', icon: <Table2 size={20} /> },
  { route: 'ciljevi', label: 'Ciljevi', icon: <Target size={20} /> },
  { route: 'beleske', label: 'Beleške', icon: <StickyNote size={20} /> },
  { route: 'podesavanja', label: 'Podešavanja', icon: <Settings size={20} /> },
]
