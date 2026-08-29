// Supabase mode — what this fork runs on instead of the Node/passkey API.
//
// The upstream app keeps one JSON document per profile on its own server (PUT /api/data).
// Here that document lives in a `gym_state` row on the same Supabase project as Cuppy, so a
// Cuppy account *is* the gym account: sign in with the same email and password, and the gym
// history follows it. Row-level security keeps every row private to its owner.
//
// Enabled at build time by VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (see frontend/.env).
// Without them the app builds exactly like upstream and expects the Node API.
import { createClient } from '@supabase/supabase-js'

const URL_ = import.meta.env.VITE_SUPABASE_URL || ''
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const SUPA = !!(URL_ && KEY)

export const supabase = SUPA
  ? createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null

// Shape the rest of the app already understands for `user` (see useStore.setUser).
const toUser = u => u ? ({
  id: u.id,
  email: u.email,
  name: u.user_metadata?.name || u.user_metadata?.full_name || (u.email || '').split('@')[0] || 'me',
  admin: false,
}) : null

const fail = e => { const err = new Error(e.message || String(e)); err.status = e.status || 0; throw err }

export async function sbSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) fail(error)
  return session ? toUser(session.user) : null
}

export async function sbSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) fail(error)
  return toUser(data.user)
}

// Returns { user, pending }: `pending` when the project requires email confirmation, in
// which case there is no session yet and the caller should say "check your inbox".
export async function sbSignUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: name ? { name } : {} } })
  if (error) fail(error)
  return { user: data.session ? toUser(data.user) : null, pending: !data.session }
}

export async function sbSignOut(everywhere = false) {
  const { error } = await supabase.auth.signOut({ scope: everywhere ? 'global' : 'local' })
  if (error) fail(error)
}

export async function sbPull() {
  const { data, error } = await supabase.from('gym_state').select('state, updated_at').maybeSingle()
  if (error) fail(error)
  return data ? data.state : null
}

export async function sbPush(state) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { const e = new Error('Not signed in'); e.status = 401; throw e }
  const { error } = await supabase.from('gym_state').upsert({ user_id: session.user.id, state }, { onConflict: 'user_id' })
  if (error) fail(error)
}
