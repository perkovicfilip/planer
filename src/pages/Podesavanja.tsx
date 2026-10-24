import { useRef, useState } from 'react'
import { Download, Upload, LogOut, Plus, Pencil } from 'lucide-react'
import { store, useKind } from '../lib/store'
import { supabase, LOCAL_MODE } from '../lib/supabase'
import type { Category, CategoryGroup, Kind } from '../lib/types'
import { useSettings, learnedGap } from '../lib/logic'
import { iso } from '../lib/dates'
import { isNative, requestNotificationPermission, rescheduleNow } from '../native/bridge'
import { Button, Card, ColorPicker, Field, IconButton, Modal, PageHeader, SectionTitle } from '../ui/kit'

const GROUPS: { v: CategoryGroup; label: string }[] = [
  { v: 'fakultet', label: 'Fakultet' },
  { v: 'posao', label: 'Posao' },
  { v: 'sport', label: 'Sport' },
  { v: 'licno', label: 'Lično' },
  { v: 'ostalo', label: 'Ostalo' },
]

const KINDS: Kind[] = ['category', 'event', 'subject', 'habit', 'food', 'mealday', 'exercise', 'workout', 'workoutlog', 'weekplan', 'weight', 'goal', 'note', 'settings', 'meta', 'fincat', 'transaction', 'media', 'project']

export default function Podesavanja() {
  const [s, setS] = useSettings()
  const cats = useKind<Category>('category').sort((a, b) => a.data.group.localeCompare(b.data.group) || a.data.order - b.data.order)
  const [catEdit, setCatEdit] = useState<{ id?: string; data: Category } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const gap = learnedGap(s)
  const num = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value === '' ? null : Number(e.target.value)
    setS((d) => ({ ...d, [k]: v ?? 0 }))
  }

  function exportData() {
    const data = { app: 'planer', version: 1, exportedAt: new Date().toISOString(), items: store.exportAll() }
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `planer-rezerva-${iso()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importData(file: File) {
    try {
      const json = JSON.parse(await file.text())
      const items: { id?: string; kind: Kind; data: unknown }[] = Array.isArray(json) ? json : json.items
      if (!Array.isArray(items)) throw new Error('format')
      const valid = items.filter((i) => i && KINDS.includes(i.kind) && i.data !== undefined)
      store.bulk(valid.map((i) => ({ id: i.id, kind: i.kind, data: i.data })))
      setMsg(`Uvezeno ${valid.length} stavki.`)
    } catch {
      setMsg('Fajl nije ispravan — očekujem JSON izvezen iz Planera.')
    }
  }

  return (
    <div>
      <PageHeader title="Podešavanja" />
      <div className="lg:columns-2 gap-4">

      <div className="break-inside-avoid">
      <SectionTitle>Opšte</SectionTitle>
      <Card className="p-3 mb-4">
        <Field label="Ime (za pozdrav)">
          <input className="w-full" value={s.name} onChange={(e) => setS((d) => ({ ...d, name: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Buđenje">
            <input type="time" className="w-full" value={s.wakeTime ?? ''} onChange={(e) => setS((d) => ({ ...d, wakeTime: e.target.value }))} />
          </Field>
          <Field label="Podsetnik za spavanje">
            <input type="time" className="w-full" value={s.bedtime ?? ''} onChange={(e) => setS((d) => ({ ...d, bedtime: e.target.value || undefined }))} />
          </Field>
        </div>
      </Card>
      </div>

      <div className="break-inside-avoid">
      <SectionTitle>Ishrana</SectionTitle>
      <Card className="p-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cilj kalorija (kcal)">
            <input type="number" className="w-full" value={s.kcalGoal} onChange={num('kcalGoal')} />
          </Field>
          <Field label="Cilj proteina (g)">
            <input type="number" className="w-full" value={s.proteinGoal} onChange={num('proteinGoal')} />
          </Field>
          <Field label="Početni razmak između obroka (min)" hint={gap.samples >= 3 ? `Trenutno naučeno: ${gap.gap} min iz ${gap.samples} razmaka.` : `Aplikacija uči posle 3+ razmaka (sad ${gap.samples}).`}>
            <input type="number" className="w-full" value={s.mealGapDefault} onChange={num('mealGapDefault')} />
          </Field>
          <Field label="Podsetnik ako kasnim (min)" hint="Može i posebno za svaki obrok.">
            <input type="number" className="w-full" value={s.remindDelay} onChange={num('remindDelay')} />
          </Field>
          <Field label="Obrok pre treninga — koliko ranije (min)">
            <input type="number" className="w-full" value={s.preMealBefore} onChange={num('preMealBefore')} />
          </Field>
        </div>
      </Card>
      </div>

      <div className="break-inside-avoid">
      <SectionTitle>Finansije</SectionTitle>
      <Card className="p-3 mb-4">
        <Field label="Početno stanje novca (din)" hint="Koliko imaš sad, pre nego što počneš da upisuješ. Na to se dodaju prihodi i oduzimaju troškovi.">
          <input type="number" className="w-full" value={s.balanceStart || ''} onChange={num('balanceStart')} />
        </Field>
        <a href="#/finansije/kategorije" className="text-sm text-accent">
          Kategorije prihoda i troškova →
        </a>
      </Card>
      </div>

      <div className="break-inside-avoid">
      <SectionTitle>Fakultet</SectionTitle>
      <Card className="p-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="ESPB položeni ranije">
            <input type="number" className="w-full" value={s.baseEspb} onChange={num('baseEspb')} />
          </Field>
          <Field label="Ukupno ESPB na studijama">
            <input type="number" className="w-full" value={s.totalEspb} onChange={num('totalEspb')} />
          </Field>
          <Field label="Broj položenih ranije">
            <input type="number" className="w-full" value={s.basePassed} onChange={num('basePassed')} />
          </Field>
          <Field label="Prosek do sada">
            <input
              type="number"
              step="0.01"
              className="w-full"
              value={s.baseAverage ?? ''}
              onChange={(e) => setS((d) => ({ ...d, baseAverage: e.target.value === '' ? null : Number(e.target.value) }))}
            />
          </Field>
        </div>
      </Card>
      </div>

      <div className="break-inside-avoid">
      <SectionTitle
        action={
          <Button variant="ghost" onClick={() => setCatEdit({ data: { name: '', color: '#3b82f6', group: 'ostalo', order: cats.length + 1 } })}>
            <Plus size={15} /> Aktivnost
          </Button>
        }
      >
        Aktivnosti i boje (kalendar)
      </SectionTitle>
      <Card className="px-3 py-1 mb-4 max-h-72 overflow-y-auto">
        <ul className="divide-y divide-line">
          {cats.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className="w-4 h-4 rounded-full" style={{ background: c.data.color }} />
              <span className="flex-1 text-sm">{c.data.name}</span>
              <span className="text-xs text-ink-faint">{GROUPS.find((g) => g.v === c.data.group)?.label}</span>
              <IconButton title="Izmeni" onClick={() => setCatEdit({ id: c.id, data: c.data })}>
                <Pencil size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      </Card>
      </div>

      <div className="break-inside-avoid">
      <SectionTitle>Notifikacije</SectionTitle>
      <Card className="p-3 mb-4 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.notifyObligations} onChange={(e) => setS((d) => ({ ...d, notifyObligations: e.target.checked }))} />
          Današnje obaveze u notifikacionom baru
        </label>
        {isNative() ? (
          <div className="flex gap-2">
            <Button onClick={() => requestNotificationPermission()}>Dozvoli notifikacije</Button>
            <Button onClick={() => rescheduleNow()}>Osveži notifikacije</Button>
          </div>
        ) : (
          <p className="text-xs text-ink-faint">Notifikacije rade u Android aplikaciji. Na laptopu (web) ih nema.</p>
        )}
      </Card>
      </div>

      <div className="break-inside-avoid">
      <SectionTitle>Podaci</SectionTitle>
      <Card className="p-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportData}>
            <Download size={16} /> Izvezi rezervnu kopiju
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Uvezi iz fajla
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
        </div>
        {msg && <p className="text-sm text-ink-soft mt-3">{msg}</p>}
        <p className="text-xs text-ink-faint mt-3">Uvoz dodaje stavke i menja one sa istim ID-jem — ništa se ne briše.</p>
      </Card>
      </div>
      </div>

      {!LOCAL_MODE && (
        <Button variant="ghost" className="text-rose-600" onClick={() => supabase.auth.signOut()}>
          <LogOut size={16} /> Odjavi se
        </Button>
      )}

      <Modal
        open={!!catEdit}
        onClose={() => setCatEdit(null)}
        title={catEdit?.id ? 'Izmeni aktivnost' : 'Nova aktivnost'}
        footer={
          <>
            {catEdit?.id && (
              <Button
                variant="ghost"
                className="mr-auto text-rose-600"
                onClick={() => {
                  if (confirm('Obrisati aktivnost? Događaji ostaju, samo bez boje.')) {
                    store.remove(catEdit.id!)
                    setCatEdit(null)
                  }
                }}
              >
                Obriši
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!catEdit?.data.name.trim()}
              onClick={() => {
                if (!catEdit) return
                if (catEdit.id) store.update<Category>(catEdit.id, () => catEdit.data)
                else store.put<Category>('category', catEdit.data)
                setCatEdit(null)
              }}
            >
              Sačuvaj
            </Button>
          </>
        }
      >
        {catEdit && (
          <>
            <Field label="Naziv">
              <input className="w-full" value={catEdit.data.name} onChange={(e) => setCatEdit({ ...catEdit, data: { ...catEdit.data, name: e.target.value } })} />
            </Field>
            <Field label="Grupa">
              <select
                className="w-full"
                value={catEdit.data.group}
                onChange={(e) => setCatEdit({ ...catEdit, data: { ...catEdit.data, group: e.target.value as CategoryGroup } })}
              >
                {GROUPS.map((g) => (
                  <option key={g.v} value={g.v}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Boja">
              <ColorPicker value={catEdit.data.color} onChange={(c) => setCatEdit({ ...catEdit, data: { ...catEdit.data, color: c } })} />
            </Field>
          </>
        )}
      </Modal>
    </div>
  )
}
