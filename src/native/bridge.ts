// Most između aplikacije i Androida: notifikacije u baru i podsetnici.
// Na webu (laptop) sve ovo su prazne funkcije.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { App } from '@capacitor/app'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import { store } from '../lib/store'
import { addDays, fromMin, iso, nowMin, parse, toMin, weekday } from '../lib/dates'
import {
  expectedTimes,
  eventsOn,
  getSettings,
  getWeekPlan,
  habitDone,
  habitDue,
  mealDayFor,
  mealRemindAt,
  obligationsFor,
  setMealEaten,
  type Obligation,
} from '../lib/logic'
import type { EventData, HabitData } from '../lib/types'

interface NativeItem {
  id: number
  key: string
  title: string
  text: string
  color: string
}

interface ObavezePlugin {
  sync(o: { date: string; items: NativeItem[]; summary: string }): Promise<void>
  scheduleDay(o: { date: string; at: number; items: NativeItem[]; summary: string }): Promise<void>
  takePending(): Promise<{ items: { key: string; at: number }[] }>
  clear(): Promise<void>
  addListener(event: 'done', fn: (d: { key: string; at: number }) => void): Promise<PluginListenerHandle>
}

const Obaveze = registerPlugin<ObavezePlugin>('Obaveze')

export const isNative = () => Capacitor.isNativePlatform()

/** Stabilan broj iz teksta (za ID notifikacije). */
function hashId(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 1) % 2000000000 + 1
}

function toNative(list: Obligation[]): NativeItem[] {
  return list
    .filter((o) => !o.done)
    .map((o) => ({
      id: hashId(o.key),
      key: o.key,
      title: o.title,
      text: [o.time, o.sub].filter(Boolean).join(' · '),
      color: o.color,
    }))
}

function summaryText(list: Obligation[]) {
  const left = list.filter((o) => !o.done).length
  return left === 0 ? 'Sve obaveze za danas su urađene' : `Danas: još ${left} ${left === 1 ? 'obaveza' : 'obaveza'}`
}

/** Primeni "Gotovo" pritisnuto u notifikaciji. */
function applyDone(key: string, at: number) {
  const today = iso()
  for (const date of [today, addDays(today, -1)]) {
    const o = obligationsFor(date).find((x) => x.key === key)
    if (!o) continue
    if (o.done) return
    if (o.kind === 'meal') setMealEaten(date, key.slice(3), new Date(at || Date.now()).toISOString())
    else o.toggle()
    return
  }
}

let started = false
let timer: number | undefined

export async function startNative() {
  if (!isNative() || started) return
  started = true
  try {
    await LocalNotifications.createChannel({
      id: 'podsetnici',
      name: 'Podsetnici',
      description: 'Obroci, događaji, spavanje',
      importance: 4,
      visibility: 1,
      vibration: true,
    })
  } catch {
    /* kanal već postoji */
  }
  await requestNotificationPermission()

  await Obaveze.addListener('done', (d) => applyDone(d.key, d.at))
  await consumePending()

  LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const extra = a.notification.extra as { route?: string } | undefined
    if (extra?.route) window.location.hash = extra.route
  })

  App.addListener('resume', async () => {
    await consumePending()
    store.pull().then(() => store.flush())
    schedule()
  })

  store.subscribe(() => {
    window.clearTimeout(timer)
    timer = window.setTimeout(schedule, 1500)
  })
  schedule()
}

async function consumePending() {
  try {
    const { items } = await Obaveze.takePending()
    for (const p of items) applyDone(p.key, p.at)
  } catch (e) {
    console.warn('takePending', e)
  }
}

export async function requestNotificationPermission() {
  if (!isNative()) return
  const p = await LocalNotifications.checkPermissions()
  if (p.display !== 'granted') await LocalNotifications.requestPermissions()
}

export function rescheduleNow() {
  schedule()
}

let scheduling = false
async function schedule() {
  if (!isNative() || scheduling) return
  scheduling = true
  try {
    const settings = getSettings()
    const today = iso()

    // 1) Današnje obaveze u notifikacionom baru
    const list = obligationsFor(today)
    if (settings.notifyObligations) await Obaveze.sync({ date: today, items: toNative(list), summary: summaryText(list) })
    else await Obaveze.clear()

    // 2) Obaveze za narednih 7 dana — pojave se ujutru same, i bez otvaranja aplikacije
    if (settings.notifyObligations) {
      const wake = toMin(settings.wakeTime || '06:00')
      for (let i = 1; i <= 7; i++) {
        const d = addDays(today, i)
        const l = obligationsFor(d)
        const at = parse(d)
        at.setHours(Math.floor(wake / 60), wake % 60, 0, 0)
        await Obaveze.scheduleDay({ date: d, at: at.getTime(), items: toNative(l), summary: summaryText(l) })
      }
    }

    // 3) Podsetnici (obroci, događaji, spavanje, nedeljni pregled)
    const reminders: LocalNotificationSchema[] = []
    const now = Date.now()
    const at = (date: string, min: number) => {
      const d = parse(date)
      d.setHours(0, 0, 0, 0)
      return new Date(d.getTime() + min * 60000)
    }
    const push = (key: string, title: string, body: string, when: Date, route: string) => {
      if (when.getTime() <= now + 5000) return
      reminders.push({
        id: hashId('r:' + key),
        title,
        body,
        channelId: 'podsetnici',
        schedule: { at: when, allowWhileIdle: true },
        extra: { route },
        smallIcon: 'ic_stat_planer',
      })
    }

    // Obroci: danas i sutra (sutra samo ako ima planirana vremena)
    const plan = getWeekPlan()
    for (const date of [today, addDays(today, 1)]) {
      const md = mealDayFor(date)
      if (!md) continue
      const exp = expectedTimes(date, md.data.meals, settings, plan)
      md.data.meals.forEach((m, i) => {
        const r = mealRemindAt(exp[i], m, settings)
        if (r === null) return
        push(`meal:${m.id}`, `Nisi još pojeo: ${m.name}`, `Planirano oko ${fromMin(exp[i]!)} · ${m.kcal} kcal, ${m.protein} g`, at(date, r), '#/ishrana')
      })
    }

    // Događaji sa podsetnikom (narednih 14 dana)
    const events = store.list<EventData>('event')
    for (let i = 0; i <= 14; i++) {
      const date = addDays(today, i)
      for (const e of eventsOn(events, date)) {
        for (const before of e.data.remindBefore ?? []) {
          const start = toMin(e.data.start ?? '09:00')
          const when = at(date, start - before)
          const label = before >= 1440 ? `za ${Math.round(before / 1440)} d` : before >= 60 ? `za ${Math.round(before / 60)} h` : `za ${before} min`
          push(`ev:${e.id}:${date}:${before}`, e.data.title, `${label}${e.data.start ? ' · ' + e.data.start : ''}`, when, `#/dan/${date}`)
        }
      }
    }

    // Pre spavanja: neštiklirane navike + podsetnik za spavanje
    if (settings.bedtime) {
      const bt = toMin(settings.bedtime)
      for (const date of [today, addDays(today, 1)]) {
        const open = store
          .list<HabitData>('habit')
          .filter((h) => habitDue(h.data, date) && !habitDone(h.data, date))
          .map((h) => h.data.alias || h.data.name)
        const body = open.length ? `Štikliraj: ${open.join(', ')}` : `Ustaješ u ${settings.wakeTime ?? '06:00'}.`
        push(`bed:${date}`, 'Vreme za spavanje', body, at(date, bt), '#/navike')
      }
    }

    // Nedeljni pregled — nedelja 20:00
    if (settings.weeklyReview) {
      const toSunday = (6 - weekday(today) + 7) % 7
      const sun = addDays(today, toSunday)
      if (!(toSunday === 0 && nowMin() > 20 * 60)) push(`review:${sun}`, 'Nedeljni pregled', 'Pogledaj kako je prošla nedelja i isplaniraj sledeću.', at(sun, 20 * 60), '#/danas')
    }

    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
    if (reminders.length) await LocalNotifications.schedule({ notifications: reminders.slice(0, 60) })
  } catch (e) {
    console.warn('schedule', e)
  } finally {
    scheduling = false
  }
}
