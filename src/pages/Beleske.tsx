import { useState } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { store, useKind } from '../lib/store'
import type { NoteData } from '../lib/types'
import { fmtShort, iso } from '../lib/dates'
import { Button, Card, CheckCircle, Empty, IconButton, PageHeader, SectionTitle, cx } from '../ui/kit'

export default function Beleske() {
  const notes = useKind<NoteData>('note')
  const [text, setText] = useState('')
  const sorted = [...notes].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const open = sorted.filter((n) => !n.data.done)
  const done = sorted.filter((n) => n.data.done)
  const add = () => {
    if (!text.trim()) return
    store.put<NoteData>('note', { text: text.trim(), done: false })
    setText('')
  }
  return (
    <div>
      <PageHeader title="Beleške" sub="Brzo ubaci misao — sredi kad stigneš." />
      <div className="flex gap-2 mb-5">
        <textarea
          rows={2}
          className="flex-1"
          placeholder="npr. Pitati asistenta za bodove sa kolokvijuma…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button variant="primary" onClick={add} disabled={!text.trim()} title="Sačuvaj">
          <Send size={16} />
        </Button>
      </div>
      <Card className="px-4 py-1 mb-5">
        {open.length === 0 ? (
          <Empty>Sve je sređeno.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {open.map((n) => (
              <NoteRow key={n.id} id={n.id} data={n.data} at={n.updated_at} />
            ))}
          </ul>
        )}
      </Card>
      {done.length > 0 && (
        <>
          <SectionTitle>Završeno</SectionTitle>
          <Card className="px-4 py-1">
            <ul className="divide-y divide-line">
              {done.slice(0, 30).map((n) => (
                <NoteRow key={n.id} id={n.id} data={n.data} at={n.updated_at} />
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}

function NoteRow({ id, data, at }: { id: string; data: NoteData; at: string }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <CheckCircle done={data.done} color="#64748b" size={22} onClick={() => store.update<NoteData>(id, (d) => ({ ...d, done: !d.done }))} />
      <div className={cx('flex-1 min-w-0', data.done && 'opacity-50 line-through')}>
        <div className="text-sm whitespace-pre-wrap break-words">{data.text}</div>
        <div className="text-[11px] text-ink-faint mt-0.5">{fmtShort(iso(new Date(at)))}</div>
      </div>
      <IconButton title="Obriši" onClick={() => store.remove(id)}>
        <Trash2 size={14} />
      </IconButton>
    </li>
  )
}
