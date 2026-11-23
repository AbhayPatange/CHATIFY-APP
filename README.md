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
- 📞 Browser-based voice and video calls with WebRTC, Socket.IO signaling, TURN fallback, fullscreen video, and microphone mute

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

## Voice and video calls

Calls use peer-to-peer WebRTC media encrypted in transit; Pinglet only relays authenticated signaling and does not record call audio or video. Both participants must be signed in and online. The browser asks for microphone permission for voice calls, and camera plus microphone permission for video calls.

For reliable calls across mobile networks, corporate Wi-Fi, and NAT/firewall restrictions, configure these Vercel production variables from a TURN provider such as Metered:

```bash
VITE_TURN_URL=turns:global.relay.metered.ca:443?transport=tcp
VITE_TURN_USERNAME=...
VITE_TURN_CREDENTIAL=...
```

TURN allowance is bandwidth-based, not time-based. Direct peer-to-peer calls generally do not use relay allowance; calls that require a relay consume it. Any variable prefixed `VITE_` is included in the browser build, so use limited-scope TURN credentials and rotate them if exposed.

## Android APK

Pinglet is packaged as an Android app with Capacitor. The app opens `https://pinglet.site`, so changes deployed to the website are available in the installed app the next time it loads. The Android manifest also requests camera and microphone access only when a user starts a voice or video call.

Every push to `main` runs the **Build Android APK** GitHub Action. Open the action run on GitHub and download the `Pinglet-debug-<commit>` artifact. It contains an installable debug APK. Android may ask you to allow installs from the browser or file manager used to open it.

To create an APK locally:

```bash
cd frontend
npm install
npm run android:apk
```

The APK is written to `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

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
