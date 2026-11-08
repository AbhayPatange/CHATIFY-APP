<h1 align="center">Pinglet – real-time chat with sent, delivered & seen ticks</h1>

- 🔐 Custom JWT auth (httpOnly cookie, bcrypt)
- ⚡ Real-time messaging with Socket.io (multi-tab / multi-device safe)
- ✓ **Message ticks, like WhatsApp:** clock = sending · ✓ sent · ✓✓ delivered · <span style="color:#53bdeb">✓✓</span> seen (blue)
- 💬 WhatsApp-style dark UI: chat list with last message, time and unread badges, date separators, bubble tails, search, Unread filter
- 🟢 Online / offline presence, unread count in the browser tab title
- 🗂️ Image messages & avatars (Cloudinary) with validation and size limits
- 📨 Welcome email on signup (Resend, optional)
- 🚦 Rate limiting: Arcjet (optional) + built-in brute-force protection on login/signup
- 🎨 React 19, Tailwind, Zustand
- No voice or video calls (by design, for now)

## How the ticks work

| Tick | Status | When it is set |
|---|---|---|
| 🕒 | `pending` | Shown only in the sender's browser while the message is being sent |
| ✓ | `sent` | Saved on the server, receiver is offline |
| ✓✓ grey | `delivered` | Receiver has Pinglet open on at least one device (or opens it later: everything waiting is marked delivered on connect) |
| ✓✓ blue | `seen` | Receiver has the chat open **and** the tab is visible (`PUT /api/messages/seen/:id`) |

Socket events: `messagesDelivered`, `messagesSeen` (to the sender) and `chatRead` (to the reader's other devices).
Messages created before this feature have no status and are treated as already seen.

## Quick start (development)

```bash
# 1. backend
cd backend
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET (see below)
npm install
npm run dev               # http://localhost:3000

# 2. frontend (new terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173  (proxies /api and /socket.io to the backend)
```

Generate a secret: `openssl rand -base64 48`

## Environment variables (`backend/.env`)

See [`backend/.env.example`](backend/.env.example). Required: `MONGO_URI`, `JWT_SECRET`.
In production also required: `CLIENT_URL` (public URL of the site) and a `JWT_SECRET` of ≥ 32 chars –
the server refuses to start otherwise. Cloudinary, Resend and Arcjet are optional; when missing, the related
feature is disabled and a warning is logged at startup.

## Production

The backend serves the built frontend, so one service is enough.

```bash
npm run build                      # installs deps + builds frontend/dist
NODE_ENV=production npm start      # needs the env vars above
```

Or with Docker (from this folder):

```bash
docker build -t pinglet .
docker run -p 3000:3000 --env-file backend/.env -e NODE_ENV=production pinglet
```

Checklist:
- Serve over **HTTPS** (auth cookies are `Secure` in production).
- Behind a reverse proxy / PaaS, `TRUST_PROXY=1` (default in production) so rate limits see the real client IP.
- Point your platform's health check at `GET /api/health` (returns 503 while the DB is unreachable).
- Run a **single instance**, or add a Redis adapter for Socket.io and a shared rate limiter before scaling out.
- MongoDB Atlas: allow your server's IP in Network Access.
- Resend's `onboarding@resend.dev` sender can only email your own account address; verify a domain to email real users.

## Tests & lint

```bash
npm test         # backend unit/integration tests (node:test, no DB needed)
npm run lint     # frontend ESLint
```
