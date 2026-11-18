import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Field } from '../ui/kit'

function translate(msg: string): string {
  if (/invalid login/i.test(msg)) return 'Pogrešan email ili lozinka.'
  if (/already registered/i.test(msg)) return 'Nalog sa ovim emailom već postoji — prijavi se.'
  if (/email not confirmed/i.test(msg)) return 'Email još nije potvrđen — otvori link koji ti je stigao na mejl.'
  if (/at least 6/i.test(msg)) return 'Lozinka mora imati bar 6 karaktera.'
  if (/fetch/i.test(msg)) return 'Nema veze sa serverom. Proveri internet.'
  return msg
}

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const res =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (res.error) setMsg({ ok: false, text: translate(res.error.message) })
    else if (mode === 'signup' && !res.data.session)
      setMsg({ ok: true, text: 'Nalog je napravljen. Potvrdi email preko linka koji ti je stigao, pa se prijavi.' })
  }

  return (
    <div className="min-h-full grid place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent grid place-items-center mb-4">
            <img src="./favicon.svg" alt="" className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Planer</h1>
          <p className="text-ink-soft mt-1">{mode === 'login' ? 'Prijavi se da vidiš svoj dan.' : 'Napravi nalog — samo jednom.'}</p>
        </div>
        <Field label="Email">
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
        </Field>
        <Field label="Lozinka">
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
          />
        </Field>
        {msg && <p className={msg.ok ? 'text-emerald-600 text-sm mb-3' : 'text-rose-600 text-sm mb-3'}>{msg.text}</p>}
        <Button type="submit" variant="primary" className="w-full py-3" disabled={busy}>
          {busy ? 'Sačekaj…' : mode === 'login' ? 'Prijavi se' : 'Napravi nalog'}
        </Button>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full text-sm text-ink-soft mt-4 hover:text-ink"
        >
          {mode === 'login' ? 'Nemaš nalog? Napravi ga' : 'Već imaš nalog? Prijavi se'}
        </button>
      </form>
    </div>
  )
}
