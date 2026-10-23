// Svi podaci se čuvaju kao "items" u jednoj tabeli: { id, kind, data, updated_at, deleted }.
// Novi tip podataka = novi `kind`, bez menjanja baze.

export type Kind =
  | 'category'
  | 'event'
  | 'subject'
  | 'habit'
  | 'food'
  | 'mealday'
  | 'exercise'
  | 'workout'
  | 'workoutlog'
  | 'weekplan'
  | 'weight'
  | 'goal'
  | 'note'
  | 'settings'
  | 'meta'

export interface Item<T = unknown> {
  id: string
  kind: Kind
  data: T
  updated_at: string
  deleted: boolean
}

export type CategoryGroup = 'fakultet' | 'posao' | 'sport' | 'licno' | 'ostalo'

export interface Category {
  name: string
  color: string
  group: CategoryGroup
  order: number
}

export type Repeat = 'none' | 'daily' | 'weekly'

export interface EventData {
  title: string
  categoryId?: string
  date: string // YYYY-MM-DD
  endDate?: string // za višednevne (npr. Na putu)
  start?: string // HH:MM
  end?: string
  notes?: string
  repeat: Repeat
  repeatUntil?: string
  doneDates?: string[] // za ponavljajuće: datumi kad je urađeno
  remindBefore?: number[] // minuta pre početka
}

export type SubjectStatus = 'nepolozen' | 'polozen'

export interface SubjectData {
  code: string
  name: string
  espb: number
  year: number
  mode: string // Polaže preko kolokvijuma / Ponovo sluša / Prvi put
  professor?: string
  status: SubjectStatus
  grade?: number
  passedOn?: string
  categoryId?: string
  rasporedKey?: string // veza sa rasporedom časova
  group?: string // grupa za vežbe (npr. "1")
  attendLectures?: boolean
  attendExercises?: boolean
  notes?: string
}

export interface HabitData {
  name: string
  alias?: string // diskretan naziv koji se prikazuje
  color: string
  days: number[] // 0 = ponedeljak ... 6 = nedelja
  hidden?: boolean // ne prikazuj na početnoj
  order: number
  doneDates: string[]
  time?: string // opcionalno vreme za notifikaciju
}

export interface FoodData {
  name: string
  kcal: number
  protein: number
  favorite?: boolean
}

export type MealSlot = 'pre' | 'post' | null

export interface Meal {
  id: string
  foodId?: string
  name: string
  kcal: number
  protein: number
  slot: MealSlot
  time?: string // planirano vreme HH:MM (opciono)
  remindAfter?: number // minuta kašnjenja pre podsetnika
  eatenAt?: string // ISO
}

export interface MealDayData {
  date: string
  meals: Meal[]
}

export interface ExerciseData {
  name: string
  muscle?: string
  notes?: string
}

export interface WorkoutExercise {
  exerciseId: string
  sets: number
  reps: string // "8-12"
}

export interface WorkoutData {
  name: string
  exercises: WorkoutExercise[]
  order: number
}

export interface LoggedSet {
  exerciseId: string
  kg: number | null
  reps: number | null
}

export interface WorkoutLogData {
  date: string
  type: 'teretana' | 'plivanje' | 'drugo'
  workoutId?: string
  title: string
  sets: LoggedSet[]
  done: boolean
  note?: string
}

export type DayActivity = 'teretana' | 'plivanje' | 'odmor'

export interface WeekPlanDay {
  activity: DayActivity
  workoutId?: string
  time: string // početak
  duration: number // minuta
}

export interface WeekPlanData {
  days: WeekPlanDay[] // 7 dana, 0 = ponedeljak
  rotation?: string[] // ako se treninzi rotiraju
}

export interface WeightData {
  date: string
  kg: number
}

export type GoalType = 'kg' | 'espb' | 'predmeti' | 'novac' | 'custom'

export interface GoalData {
  title: string
  type: GoalType
  target: number
  start?: number
  current?: number // za ručne ciljeve
  unit?: string
  deadline?: string
  order: number
  color?: string
}

export interface NoteData {
  text: string
  done: boolean
}

export interface SettingsData {
  name: string
  kcalGoal: number
  proteinGoal: number
  mealGapDefault: number // minuta
  remindDelay: number // minuta
  preMealBefore: number // koliko pre treninga obrok 1
  baseEspb: number // ESPB položeni pre aplikacije
  basePassed: number // broj položenih predmeta pre aplikacije
  baseAverage: number | null
  totalEspb: number
  bedtime?: string // podsetnik za spavanje
  wakeTime?: string
  notifyObligations: boolean
  weeklyReview: boolean
}

export const DEFAULT_SETTINGS: SettingsData = {
  name: '',
  kcalGoal: 3000,
  proteinGoal: 150,
  mealGapDefault: 180,
  remindDelay: 60,
  preMealBefore: 45,
  baseEspb: 0,
  basePassed: 0,
  baseAverage: null,
  totalEspb: 240,
  bedtime: '21:30',
  wakeTime: '05:50',
  notifyObligations: true,
  weeklyReview: true,
}
