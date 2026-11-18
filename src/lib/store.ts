import { useMemo, useSyncExternalStore } from 'react'
import { supabase, LOCAL_MODE } from './supabase'
import type { Item, Kind } from './types'

// Offline-first skladište:
//  - sve je u memoriji + lokalnom kešu (radi i bez interneta)
//  - svaka izmena ide u "outbox" i šalje se na Supabase čim može
//  - promene sa drugog uređaja stižu preko realtime kanala

type Listener = () => void
export type SyncStatus = 'lokalno' | 'offline' | 'sinhronizujem' | 'sinhronizovano' | 'greska'

const nowIso = () => new Date().toISOString()
export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* pun ili blokiran storage — podaci ostaju u memoriji i na serveru */
  }
}

class Store {
  items = new Map<string, Item>()
  outbox = new Set<string>()
  version = 0
  status: SyncStatus = 'lokalno'
  userId: string | null = null
  private listeners = new Set<Listener>()
  private saveTimer: number | undefined
  private flushTimer: number | undefined
  private channel: ReturnType<typeof supabase.channel> | null = null
  private flushing = false

  private get cacheKey() {
    return `planer:items:${this.userId ?? 'lokalno'}`
  }
  private get outboxKey() {
    return `planer:outbox:${this.userId ?? 'lokalno'}`
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  getVersion = () => this.version

  private emit() {
    this.version++
    this.listeners.forEach((l) => l())
    window.clearTimeout(this.saveTimer)
    this.saveTimer = window.setTimeout(() => this.saveCache(), 200)
  }

  private setStatus(s: SyncStatus) {
    if (this.status !== s) {
      this.status = s
      this.version++
      this.listeners.forEach((l) => l())
    }
  }

  private loadCache() {
    this.items.clear()
    this.outbox.clear()
    const raw = safeGet(this.cacheKey)
    if (raw) {
      try {
        for (const it of JSON.parse(raw) as Item[]) this.items.set(it.id, it)
      } catch {
        /* oštećen keš — biće povučen sa servera */
      }
    }
    const ob = safeGet(this.outboxKey)
    if (ob) {
      try {
        for (const id of JSON.parse(ob) as string[]) this.outbox.add(id)
      } catch {
        /* ignore */
      }
    }
  }

  private saveCache() {
    safeSet(this.cacheKey, JSON.stringify([...this.items.values()]))
    safeSet(this.outboxKey, JSON.stringify([...this.outbox]))
  }

  async start(userId: string | null) {
    this.stopRealtime()
    this.userId = userId
    this.loadCache()
    this.emit()
    if (!userId || LOCAL_MODE) {
      this.setStatus('lokalno')
      return
    }
    await this.pull()
    this.flush()
    this.startRealtime()
    window.addEventListener('online', this.onOnline)
    document.addEventListener('visibilitychange', this.onVisible)
    window.clearInterval(this.flushTimer)
    this.flushTimer = window.setInterval(() => this.flush(), 20000)
  }

  stop() {
    this.stopRealtime()
    window.removeEventListener('online', this.onOnline)
    document.removeEventListener('visibilitychange', this.onVisible)
    window.clearInterval(this.flushTimer)
  }

  private onOnline = () => {
    this.pull().then(() => this.flush())
  }
  private onVisible = () => {
    if (document.visibilityState === 'visible') this.onOnline()
  }

  async pull() {
    if (!this.userId) return
    this.setStatus('sinhronizujem')
    try {
      const pageSize = 1000
      let from = 0
      for (;;) {
        const { data, error } = await supabase
          .from('items')
          .select('id, kind, data, updated_at, deleted')
          .order('id')
          .range(from, from + pageSize - 1)
        if (error) throw error
        for (const row of (data ?? []) as Item[]) this.mergeRemote(row, false)
        if (!data || data.length < pageSize) break
        from += pageSize
      }
      this.emit()
      this.setStatus(this.outbox.size ? 'sinhronizujem' : 'sinhronizovano')
    } catch (e) {
      console.warn('pull', e)
      this.setStatus(navigator.onLine ? 'greska' : 'offline')
    }
  }

  private mergeRemote(raw: Item, emit = true) {
    const row: Item = {
      id: raw.id,
      kind: raw.kind,
      data: raw.data,
      deleted: !!raw.deleted,
      updated_at: new Date(raw.updated_at).toISOString(),
    }
    const local = this.items.get(row.id)
    if (local && this.outbox.has(row.id) && local.updated_at >= row.updated_at) return
    if (local && local.updated_at > row.updated_at) return
    this.items.set(row.id, row)
    if (emit) this.emit()
  }

  async flush() {
    if (!this.userId || LOCAL_MODE || this.flushing || this.outbox.size === 0) return
    this.flushing = true
    this.setStatus('sinhronizujem')
    const ids = [...this.outbox]
    const rows = ids
      .map((id) => this.items.get(id))
      .filter((x): x is Item => !!x)
      .map((it) => ({ ...it, user_id: this.userId }))
    try {
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200)
        const { error } = await supabase.from('items').upsert(chunk, { onConflict: 'user_id,id' })
        if (error) throw error
      }
      ids.forEach((id) => {
        // ako je u međuvremenu ponovo izmenjen, ostaje u outbox-u
        const it = this.items.get(id)
        const sent = rows.find((r) => r.id === id)
        if (it && sent && it.updated_at === sent.updated_at) this.outbox.delete(id)
      })
      this.saveCache()
      this.setStatus(this.outbox.size ? 'sinhronizujem' : 'sinhronizovano')
    } catch (e) {
      console.warn('flush', e)
      this.setStatus(navigator.onLine ? 'greska' : 'offline')
    } finally {
      this.flushing = false
    }
  }

  private startRealtime() {
    if (!this.userId) return
    this.channel = supabase
      .channel('items-' + this.userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${this.userId}` },
        (payload) => {
          const row = payload.new as Item
          if (row && row.id) this.mergeRemote(row)
        },
      )
      .subscribe()
  }
  private stopRealtime() {
    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }
  }

  // ---------- API za aplikaciju ----------

  put<T>(kind: Kind, data: T, id: string = uid()): string {
    const it: Item = { id, kind, data, updated_at: nowIso(), deleted: false }
    this.items.set(id, it)
    this.outbox.add(id)
    this.emit()
    this.scheduleFlush()
    return id
  }

  update<T>(id: string, fn: (d: T) => T) {
    const it = this.items.get(id)
    if (!it) return
    const next: Item = { ...it, data: fn(structuredClone(it.data) as T), updated_at: nowIso() }
    this.items.set(id, next)
    this.outbox.add(id)
    this.emit()
    this.scheduleFlush()
  }

  remove(id: string) {
    const it = this.items.get(id)
    if (!it) return
    this.items.set(id, { ...it, deleted: true, updated_at: nowIso() })
    this.outbox.add(id)
    this.emit()
    this.scheduleFlush()
  }

  /** Ubaci više stavki odjednom (uvoz). */
  bulk(items: { id?: string; kind: Kind; data: unknown }[]) {
    for (const x of items) {
      const id = x.id ?? uid()
      this.items.set(id, { id, kind: x.kind, data: x.data, updated_at: nowIso(), deleted: false })
      this.outbox.add(id)
    }
    this.emit()
    this.scheduleFlush()
  }

  private scheduleFlush() {
    window.setTimeout(() => this.flush(), 400)
  }

  list<T>(kind: Kind): Item<T>[] {
    const out: Item<T>[] = []
    for (const it of this.items.values()) if (it.kind === kind && !it.deleted) out.push(it as Item<T>)
    return out
  }

  get<T>(id: string): Item<T> | undefined {
    const it = this.items.get(id)
    return it && !it.deleted ? (it as Item<T>) : undefined
  }

  exportAll() {
    return [...this.items.values()].filter((i) => !i.deleted)
  }
}

export const store = new Store()

export function useVersion() {
  return useSyncExternalStore(store.subscribe, store.getVersion)
}

export function useKind<T>(kind: Kind): Item<T>[] {
  const v = useVersion()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => store.list<T>(kind), [v, kind])
}

/** Stavka koja postoji samo jednom (podešavanja, nedeljni plan). */
export function useSingleton<T>(kind: Kind, defaults: T): [T, (fn: (d: T) => T) => void] {
  const items = useKind<T>(kind)
  const first = items.sort((a, b) => a.id.localeCompare(b.id))[0]
  const data = useMemo(() => ({ ...defaults, ...(first?.data ?? {}) }) as T, [first, defaults])
  const set = (fn: (d: T) => T) => {
    if (first) store.update<T>(first.id, (d) => fn({ ...defaults, ...d }))
    else store.put<T>(kind, fn(defaults), kind + '-singleton')
  }
  return [data, set]
}

export function useSyncStatus(): SyncStatus {
  useVersion()
  return store.status
}
