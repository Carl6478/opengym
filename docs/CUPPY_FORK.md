# The Cuppy fork of openGym

This repository is a fork of [openGym](https://gitlab.com/DuarteSantos8/opengym) by Duarte Santos,
kept under the same **GNU AGPL v3** license (see [LICENSE](../LICENSE) and [NOTICE.md](../NOTICE.md)).
It is the gym companion of [Cuppy](https://github.com/taljsubs-eng/Cuppy) and runs at
**https://opengym-cuppy.web.app**.

## What changed

| Area | Upstream | This fork |
|---|---|---|
| Backend | Node API + passkeys (`api/`), Docker | **Supabase** — the same project Cuppy uses |
| Sign-in | Passkey (WebAuthn) | **Email + password** (`supabase.auth`) — one account for Cuppy and the gym |
| Storage | one JSON document per profile in `data/state-<uid>.json` | one JSON document per user in the `gym_state` table (row-level security, owner only) |
| Hosting | nginx container | Firebase Hosting, static build (`firebase.json`) |
| Exercise media | served by the container | loaded from the dataset's jsDelivr CDN (`VITE_IMG_BASE` / `VITE_GIF_BASE`) — **not redistributed here** |
| Theme | light / dark + accents | + **Webhead** (navy CRT, chamfered 8-bit panels, pixel labels) |

Everything else — routines, guided workouts, stats, body maps, import/export, guest mode — is
upstream, untouched. The Node API, Docker files and mobile (Capacitor) build are still in the tree
and still work; they are simply not what the hosted site uses.

The fork is switched on at build time by two variables in [`frontend/.env`](../frontend/.env)
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Without them the app builds exactly like upstream.
The anon key is a public client key — the database's row-level security is what protects the data.

Source files that carry the fork:

- `frontend/src/lib/supabase.js` — client, sign-in/up/out, `gym_state` pull/push
- `frontend/src/views/EmailAuth.jsx` — the email + password form (sign-in screen and Settings)
- `frontend/src/store/useStore.js` — `SUPA` branches in `boot`, `pushState`, `pullState`, `signOut`, `signOutAll`, `loadConfig`
- `frontend/src/views/Login.jsx`, `views/Settings.jsx`, `store/useUI.js`, `views/Workout.jsx` — server-only features (passkeys, pairing, web push, presence, admin) folded away under `SUPA`
- `frontend/src/index.css` (bottom) and `frontend/src/App.jsx` — the Webhead theme

The `gym_state` table lives in Cuppy's migrations: `supabase/migrations/202608290001_gym_state.sql`.

## Sync rules

Same as upstream's server sync, just against Supabase:

- every change is saved to `localStorage` immediately and pushed 1.5 s later (and on tab hide);
- on boot / sign-in the account's copy is pulled — it wins when it is newer and nothing local is
  unsynced; otherwise the local copy is pushed;
- creating an account on a device that already has guest data moves that data into the account;
- guest mode (no account) keeps working, data stays in the browser.

## Build & deploy

```sh
cd frontend
npm ci
npm run build            # frontend/dist — .env supplies Supabase + CDN media
cd ..
firebase deploy --only hosting     # project cuppy-planner, site opengym-cuppy
```

Run the tests with `npm test` in `frontend/`.

## Keeping up with upstream

```sh
git fetch upstream
git merge upstream/main
```

`upstream` is `https://gitlab.com/DuarteSantos8/opengym.git`.
