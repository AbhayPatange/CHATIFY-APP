# What changed & why

## 🔴 Do this first: rotate your credentials
`backend/.env` (MongoDB user/password, Resend key, Cloudinary secret, Arcjet key, JWT secret) was inside the zip.
It was **not** committed to git (history is clean), but treat everything in it as exposed:
1. MongoDB Atlas → change the DB user password.
2. Rotate Resend, Cloudinary and Arcjet keys.
3. Set a new `JWT_SECRET` (`openssl rand -base64 48`). This logs everyone out once.
`.env` is removed from this package; use `backend/.env.example`.

## Bugs fixed
| Area | Problem | Fix |
|---|---|---|
| Config | `CLIENT_URL` had a trailing `/` → CORS & socket origin never matched | Origins normalised; comma-separated list supported |
| Config | `NODE_ENV=devlopment` typo silently changed cookie/static behaviour | Strict parsing + startup warning |
| Security | `update-profile` returned the user **including the bcrypt hash** | Password is `select:false`; responses use an explicit public shape |
| Security | Login accepted objects → NoSQL operator injection (`{"$gt":""}`) | Strict type validation on all inputs |
| Security | Every user's **email** exposed via `/contacts` | Only `fullName` + `profilePic` returned |
| Security | No brute-force protection when Arcjet is absent/limited | Built-in limiter: 10 failed logins / 15 min, 10 signups / hour per IP |
| Security | Login timing revealed which emails exist | Dummy bcrypt compare for unknown users |
| Security | Arbitrary strings sent to Cloudinary | Data-URL type + 3 MB checks; server-side folders; avatars resized |
| Security | Emails case-sensitive (duplicate accounts), name injected unescaped into email HTML | Emails lower-cased; HTML-escaped template |
| Auth | Expired/invalid JWT returned **500** | Returns 401 and clears the cookie |
| Auth | Logout cookie never actually cleared on HTTPS (attribute mismatch) | `clearCookie` with identical options |
| Auth | Frontend stayed "logged in" after session expiry | 401 interceptor returns to login |
| Realtime | One socket per user: 2nd tab broke delivery, closing a tab marked user offline | Per-user rooms + connection counting |
| Realtime | Messages from non-open chats were silently dropped; listener captured stale state; `off("newMessage")` removed all listeners | Page-level subscription, unread badges, named handlers, refetch after reconnect |
| State | Sending a message used a stale array: dropped concurrent incoming messages; failure rollback also stale | Functional updates keyed by temp id |
| State | Previous user's chats/messages survived logout → login | Chat store reset on logout |
| State | Switching chats quickly could show the wrong conversation | Request results ignored if selection changed |
| UI | Cancelling the file picker threw (`file.type` of undefined) | Guarded; type + size validated |
| UI | Avatar preview showed an image even when upload failed; error handlers crashed on network errors (`error.response.data`) | Shows server-confirmed avatar; shared `getErrorMessage` |
| UI | Fixed 800 px height / no mobile layout; clickable `div`s; missing labels/alts | Responsive list↔chat view, buttons, labels, `autocomplete`, aria |
| UI | Quick-reply chips ("Say Hello"…) did nothing | They send the message |
| Email | `<a href=${url}>` unquoted, expiring Freepik image, "Messenger" branding, hard-coded 2025 | Fixed and rebranded |
| Startup | Server listened before DB connected; missing Resend key crashed on import | Connect first; optional services degrade gracefully |

## Production hardening added
- Fail-fast env validation (≥32-char secret, `CLIENT_URL` required in prod).
- Security headers + CSP (prod), `x-powered-by` off, HSTS, 100 kb JSON limit (5 MB only on image routes).
- Central error handler (400 malformed JSON, 413 too large, JSON 404 for `/api/*`), no stack details in prod.
- `/api/health`, graceful SIGTERM/SIGINT shutdown, unhandled-error logging.
- Message pagination (50 per page + "Load older messages"), MongoDB indexes, aggregation for chat list (was loading every message).
- Static serving with immutable caching for hashed assets; SPA fallback no longer swallows `/api`.
- Vite dev proxy (no hard-coded `localhost:3000`), error boundary, favicon/meta tags.
- Dockerfile, `.dockerignore`, `.gitignore`, `.env.example`, root `build` now installs dev deps (needed by Vite) even when `NODE_ENV=production`.
- Tests: 11 backend tests (`npm test`).

## Heads-up / migration
- **Existing users with upper-case emails** must be normalised once, otherwise they can't log in:
  `db.users.updateMany({}, [{ $set: { email: { $toLower: "$email" } } }])` (mongosh, MongoDB ≥ 4.2).
- Login failures now return **401** (was 400).
- No new npm dependencies were added, so your existing `package-lock.json` files stay valid.
- I could not run `vite build` in my sandbox (no network, Windows-built binaries). Backend tests and frontend lint pass; run `npm run build` once on your machine to confirm.

## Not included (product features, not fixes)
Email verification, password reset, message read receipts / delete, Redis adapter for multi-instance sockets.
