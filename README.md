# Pollaris

Pollaris is an authenticated online polling platform built for the "Online Polling Platform" challenge. It supports draft → open → closed poll lifecycle management, public and private visibility, invite-only private polls, single-choice and multi-choice voting, aggregate results, and shareable poll links.

## Setup & Run Instructions

### Prerequisites

- Node.js 20.9+ recommended
- npm
- A Firebase project with:
  - Authentication enabled for Email/Password
  - Firestore database enabled
  - A Firebase Admin service account

### Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_auth_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_CLIENT_EMAIL="your_service_account_email"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### Run locally

```bash
git clone https://github.com/Renukabhargavi/PalTech.git
cd PalTech
npm install
npm run dev
```

Open `http://localhost:3000`.

### Docker

This repo also includes `Dockerfile` and `docker-compose.yml`.

```bash
docker compose --env-file .env.local up --build
```

## Tech Stack & Rationale

- Next.js 16 App Router
  - Good fit for authenticated product flows with server components and server actions.
- Firebase Authentication
  - Handles email/password auth, secure password hashing, and identity lifecycle.
  - Passwords are not stored by this app directly; Firebase Auth stores them securely using Google-managed hashing infrastructure.
- Firebase Firestore
  - Persistent storage for polls, votes, share tokens, invites, and user profiles.
  - Firestore transactions are used for vote replacement and withdrawal flows.
- Tailwind CSS
  - Fast iteration for a clean, readable UI.
- Recharts
  - Used for optional visual result charts.

## Architectural Overview

- `app/(auth)`
  - Sign-in and sign-up screens.
- `app/(dashboard)`
  - Authenticated product area:
  - `/feed` for public poll discovery
  - `/my-polls` for creator-owned polls
  - `/shared` for private polls where the user is invited
  - `/poll/[pollId]` for voting/results
  - `/my-polls/[pollId]/edit` for draft management and poll administration
- `app/p/[token]`
  - Resolves stable share links to the real poll route.
- `components/polls`
  - Poll form, share link, CSV export, and related poll UI.
- `lib/actions`
  - Server-side mutations and secured Firestore access for auth, polls, invites, and votes.
- `lib/firebase`
  - Firebase client/admin initialization.
- `proxy.ts`
  - Redirects unauthenticated users away from protected screens.

## How AI Tools Were Used

- GitHub Copilot and ChatGPT/Codex were used for scaffolding, refactors, server-action wiring, UI iteration, and spec compliance review.
- AI-generated or AI-assisted work included:
  - Initial page/component scaffolding
  - Form validation setup
  - Firestore transaction logic
  - README drafting and later correction
- Reviewed/edited manually:
  - Access-control logic
  - Poll lifecycle validation
  - Multi-choice voting behavior
  - Requirement gap analysis against the challenge brief
- Rejected or corrected:
  - Earlier mismatches between UI claims and actual behavior
  - Missing private-poll enforcement on vote paths
  - Incomplete draft editing flow

## Assumptions

- All voters must be authenticated.
- Public links control discoverability, not anonymous access.
- Firestore is the single system of record for persistence.
- Auto-closing on next read/write is sufficient for the challenge.
- Revoking an invite removes access immediately, but an already-recorded historical vote remains counted.

## Trade-offs

- Firestore list pages now use simple in-memory filtering/sorting/pagination after query fetches to avoid demo-time index failures. This is acceptable for small challenge datasets but not ideal for large-scale production use.
- Real-time updates are lightweight and localized; this is not a fully collaborative live system.
- Some lint debt remains in older files, even though production build passes.

## Future Work

- Replace in-memory list processing with indexed Firestore queries designed for scale.
- Add test coverage for lifecycle, access control, and vote replacement rules.
- Reduce TypeScript/lint debt across the repo.
- Add richer activity and invitation notifications.
- Add stronger admin/debug tooling and audit logs.

