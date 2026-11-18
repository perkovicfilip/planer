import { useState } from 'react'
import { Button, Modal } from './kit'
import { iso, parse } from '../lib/dates'

/** Pita "kad si jeo?" — Sad / pre 10 / 30 / 60 min / tačno vreme. */
export function EatenPicker({
  open,
  date,
  name,
  onPick,
  onClose,
}: {
  open: boolean
  date: string
  name: string
  onPick: (isoTime: string) => void
  onClose: () => void
}) {
  const [custom, setCustom] = useState('')
  const pickAgo = (min: number) => {
    const d = new Date(Date.now() - min * 60000)
    // ako je obrok za drugi dan (npr. upisuješ za juče), zadrži taj datum
    if (iso(d) !== date) {
      const base = parse(date)
      base.setHours(d.getHours(), d.getMinutes(), 0, 0)
      onPick(base.toISOString())
    } else onPick(d.toISOString())
  }
  const pickCustom = () => {
    if (!custom) return
    const [h, m] = custom.split(':').map(Number)
    const base = parse(date)
    base.setHours(h, m, 0, 0)
    onPick(base.toISOString())
  }
  return (
    <Modal open={open} onClose={onClose} title={`Kad si jeo? · ${name}`}>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button variant="primary" className="py-3" onClick={() => pickAgo(0)}>
          Sad
        </Button>
        <Button className="py-3" onClick={() => pickAgo(10)}>
          Pre 10 min
        </Button>
        <Button className="py-3" onClick={() => pickAgo(30)}>
          Pre 30 min
        </Button>
        <Button className="py-3" onClick={() => pickAgo(60)}>
          Pre 1 h
        </Button>
      </div>
      <div className="flex gap-2">
        <input type="time" className="flex-1" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <Button onClick={pickCustom} disabled={!custom}>
          Upiši vreme
        </Button>
      </div>
    </Modal>
  )
}
