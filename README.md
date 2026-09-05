# ECHO — Anonymous Support (Firebase rebuild)

Anonymous, encrypted, real-time emotional support for teenagers.
This is the Firebase rewrite of the original NestJS + Socket.IO + Prisma project.

## Architecture (fully serverless, $0)

- **Frontend** — React + Vite (`web/`), hosted on Vercel.
- **Database + realtime** — Cloud Firestore with **Security Rules** (Row-Level Security).
- **Auth** — Firebase Auth (anonymous for teens, email/password for volunteers/admins + custom claims).
- **Encryption** — AES-256-GCM in the browser (`web/src/lib/crypto.js`) and in the bot (`functions/src/crypto.ts`).
- **Telegram bot** — Cloud Function webhook (`functions/src/telegram.ts`).
- **Admin** — callable Cloud Functions (`functions/src/admin.ts`).

## Project layout

```
├── firestore.rules          # Security rules (RLS)
├── firestore.indexes.json   # Composite indexes
├── firebase.json            # Firebase config + emulators
├── web/                     # React + Vite frontend
│   └── src/
│       ├── lib/firebase.js  # init + auth helpers
│       ├── lib/crypto.js    # AES-256-GCM (WebCrypto)
│       ├── services/        # Firestore + callable helpers
│       └── pages/           # Home, Chat, Volunteer, Admin
└── functions/               # Cloud Functions (TypeScript)
    └── src/
        ├── crypto.ts        # AES-256-GCM (Node)
        ├── admin.ts         # approval, claims, export
        ├── telegram.ts      # Telegram bot webhook
        └── index.ts
```

## Setup

Project: **`echo-e7875`** (already wired via `.firebaserc`).

1. In the Firebase console, enable the services this app uses:
   - **Firestore** — Build → Firestore Database → *Create database* (production mode).
   - **Authentication** — Build → Authentication → Get started → enable
     **Anonymous** and **Email/Password** sign-in methods.
   - (Cloud Functions is enabled automatically on first deploy.)
2. Copy the web app config into `web/.env.local` (see `web/.env.example`).
   Get it from Project settings → Your apps → Web app → SDK setup.
3. Install the Firebase CLI: `npm i -g firebase-tools`, then `firebase login`.

### Service account (local admin scripts)

A service-account key is stored at `serviceAccountKey.json` (gitignored) for
running admin scripts locally against the real project:

```bash
GOOGLE_APPLICATION_CREDENTIALS=../serviceAccountKey.json node some-script.js
```

⚠️ Never commit this file. When deploying to Cloud Functions, credentials are
injected automatically — no key file is needed in production.

### Local development

```bash
# Frontend
cd web && npm install && npm run dev

# Functions + Firestore + Auth emulators
npm i -g firebase-tools
firebase emulators:start
```

The Firestore rules and functions are exercised against the emulator, which is
the fastest way to verify the security model.

### Deploy

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
# Then set the functions env vars:
#   TELEGRAM_BOT_TOKEN, VOLUNTEER_GROUP_ID, TELEGRAM_WEBHOOK_URL, ADMIN_SEED_SECRET
firebase functions:config:set telegram.token="..." volunteer.group_id="..."
# Register the webhook once:
#   GET /setupWebhook
```

## Roles & custom claims

| Role | How granted |
|---|---|
| `volunteer` | Admin verifies the volunteer → `verifyVolunteer` sets the claim |
| `admin` | `seedAdmin?secret=…&uid=…` for the first admin, then `promoteAdmin` |

## Security notes

- Every teenager signs in **anonymously** — no personal data stored.
- Messages are AES-256-GCM encrypted client-side (and bot-side); the auth tag is
  appended to the ciphertext (WebCrypto convention).
- The per-room key is currently stored on the room document and is readable only
  by the two participants + admin (see `firestore.rules`). A future hardening step
  is end-to-end key exchange between the two parties.

### Running the Security Rules tests

```bash
npm install          # installs firebase-tools + @firebase/rules-unit-testing
npm test             # starts the Firestore emulator and runs tests/rules.test.js
```

Requires Java 11+ (for the Firestore emulator). The tests assert the RLS behavior
of `firestore.rules` (per-user access, queue visibility, room claiming, reviews).

## Implemented features

- ✅ Anonymous + registered teen flows (register / login / account / special ID / approval).
- ✅ Volunteer flow (register → admin verification → claim → chat).
- ✅ Admin dashboard (approve users, verify volunteers, stats, JSON export).
- ✅ Admin 2FA (TOTP + QR) via Cloud Function.
- ✅ Reviews + 1–5 rating after a chat closes.
- ✅ 24h auto-deletion of closed chats (scheduled function).
- ✅ Telegram bot webhook (request → volunteer accept → encrypted relay).
- ✅ Firestore Security Rules unit tests.

## Future enhancements

- End-to-end key exchange between teen ↔ volunteer (currently the per-room key
  lives on the room doc, readable by participants + admin).
- Push/email notifications and a public crisis-resources page.
- Rate-limiting and abuse reporting.
