import { useState } from 'react'
import { useStore, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { sbSignIn, sbSignUp } from '../lib/supabase.js'
import { t } from '../lib/i18n.js'
import { Button, TextField } from '../components/ui.jsx'

// Email + password sign-in — this fork's replacement for the passkey ceremony. One form does
// both jobs (sign in / create an account) so the sign-in screen and the Settings sheet share it.
//
// What happens to the data already on this device follows upstream's registration rule: a brand
// new account takes whatever this device has; an existing account is pulled, and pullState()
// decides which copy wins (see useStore.pullState).
export default function EmailAuth({ onDone, sheet = false }) {
  const { setUser, pushState, pullState } = useStore()
  const toast = useUI(s => s.toast)
  const [mode, setMode] = useState('in')      // 'in' | 'up'
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const creating = mode === 'up'

  const finish = async (u, created) => {
    setUser(u)
    if (created && hasData(useStore.getState().S)) {
      await pushState()
      toast(t('Account created — data from this device moved into it'))
    } else {
      await pullState()
      toast(created ? t('Welcome, {0}', u.name) : t('Welcome back, {0}', u.name))
    }
    onDone?.()
  }

  const go = async ev => {
    ev?.preventDefault()
    const e = email.trim()
    if (!e || !e.includes('@')) { toast(t('Enter your email address')); return }
    if (pw.length < 6) { toast(t('Password must be at least 6 characters')); return }
    setBusy(true)
    try {
      if (creating) {
        const { user, pending } = await sbSignUp(e, pw, name.trim())
        if (pending) { toast(t('Check your inbox to confirm your email, then sign in.')); setMode('in') }
        else await finish(user, true)
      } else {
        await finish(await sbSignIn(e, pw), false)
      }
    } catch (err) {
      toast(err.message || (creating ? t('Could not create the account') : t('Sign-in failed')))
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={go} style={{ textAlign: 'left' }}>
      {sheet && <h3>{creating ? t('Create your account') : t('Sign in')}</h3>}
      {creating && <>
        <TextField placeholder={t('Your name')} maxLength={40} autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
        <div style={{ height: 10 }} />
      </>}
      <TextField type="email" placeholder={t('Email')} autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />
      <div style={{ height: 10 }} />
      <TextField type="password" placeholder={t('Password')} autoComplete={creating ? 'new-password' : 'current-password'} value={pw} onChange={e => setPw(e.target.value)} />
      <div style={{ height: 14 }} />
      <Button type="submit" variant="primary" icon={creating ? 'sparkles' : 'person'} disabled={busy}>
        {creating ? t('Create account') : t('Sign in')}
      </Button>
      <div style={{ height: 8 }} />
      <Button type="button" onClick={() => setMode(creating ? 'in' : 'up')}>
        {creating ? t('I already have an account') : t('Create new account')}
      </Button>
    </form>
  )
}
