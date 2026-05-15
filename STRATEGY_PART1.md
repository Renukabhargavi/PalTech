# 🗳️ PollForge — Hackathon Battle Plan (Part 1)

> **Project Name: PollForge** — _Real-time polling with precision access control_
>
> Tagline: _"Structured opinions. Zero noise."_

---

## 1. DOCUMENT ANALYSIS — COMPLETE REQUIREMENTS EXTRACTION

### 1.1 Business Requirements (BR1–BR12)

| ID | Requirement | Priority |
|----|-------------|----------|
| BR1 | Authenticated users create polls with configurable behaviour | **CRITICAL** |
| BR2 | Poll lifecycle: Draft → Open → Closed | **CRITICAL** |
| BR3 | Public vs Private visibility modes | **CRITICAL** |
| BR4 | Stable shareable URL with unguessable token | **CRITICAL** |
| BR5 | Authenticated users with access can vote on Open polls | **CRITICAL** |
| BR6 | One vote-set per user per poll, changeable while Open | **CRITICAL** |
| BR7 | Aggregate results (counts + percentages), individual votes private | **CRITICAL** |
| BR8 | Results-visibility setting: "Always visible" vs "Visible after voting" | **HIGH** |
| BR9 | Browseable list with filters, sort, scoped to viewer's access | **HIGH** |
| BR10 | Auth + prevent tampering with votes/config/invitees | **CRITICAL** |
| BR11 | Data persists across restarts | **CRITICAL** |
| BR12 | Scale gracefully as polls grow | **MEDIUM** |

### 1.2 Functional Requirements (FR1–FR50)

#### Authentication (FR1–FR5)
- Register with name, email, password
- Sign in / sign out
- All screens behind auth guard
- **Passwords stored hashed** (bcrypt/argon2/scrypt) — _this is explicitly verifiable by reviewers_

#### Poll Management (FR6–FR10)
- Poll fields: title, description (optional), type (Single/Multi), 2+ options, visibility (Public/Private), results-visibility (Always/After-voting), optional end-at, share-token, creator, status, timestamps
- New polls start as **Draft**
- Creator can edit/delete Drafts freely
- Drafts visible only to creator

#### Poll Lifecycle (FR11–FR16)
- States: `Draft` → `Open` → `Closed` (one-way)
- Publish locks: options, type, visibility
- After publish: can extend end-at (not shorten), can manually close
- Auto-close on next access if end-at passed (no background scheduler needed)
- Closed = permanent read-only, cannot be deleted

#### Visibility & Share Links (FR17–FR21)
- Share-token: 16+ char URL-safe random string, stable forever
- Public: any auth user can access + vote
- Private: only creator + invitees. **Even with correct URL, non-invitees get "no access" (without revealing poll details)**

#### Invitations (FR22–FR26)
- Creator invites by email (must be registered user)
- Can revoke at any time (revoked user's vote stays counted but loses access)
- Invitee list visible only to creator
- Can invite at any status (Draft/Open/Closed)
- Invitations only on private polls — reject for public with clear message

#### Voting (FR27–FR31)
- Single-choice: exactly 1 option
- Multi-choice: 1 or more options
- One vote-set per user, re-vote replaces (not adds)
- Can withdraw vote (back to non-voter state)
- Individual choices never visible to others

#### Results (FR32–FR36)
- Per-option count + percentage + total respondents
- Single: percentages sum to 100%
- Multi: percentages may exceed 100% (display this clearly)
- "Always visible" → everyone with access sees results
- "Visible after voting" → must vote first (creator always sees); all see after Closed

#### Listing/Filtering/Pagination (FR37–FR41)
- Public feed: Open + Closed PUBLIC polls only
- "My Polls": all statuses/visibilities for current user
- "Shared with me": private polls where user is invitee (not creator)
- Filter by status, sort by created-at/end-at/respondents (asc/desc)
- Paginated with default page size ~20

#### Persistence & Validation (FR42–FR50)
- All data persists across restarts
- Title required, non-empty
- Min 2 options, non-empty labels
- End-at must be future at publish time
- Vote option IDs must belong to the poll
- Single = exactly 1 option ID, Multi = 1+ option IDs
- Invite email must be registered user
- Emails: syntactically valid + unique
- All validation failures: clear, actionable messages

### 1.3 Acceptance Criteria (AC1–AC25) — Checklist

Every single one maps to FRs above. **AC25 is the persistence test** — they WILL restart your app.

### 1.4 What is NOT Required (Don't Build These)

| Explicitly Out of Scope | Impact |
|------------------------|--------|
| Production deployment | Local-run is enough |
| Websockets / real-time updates | Refresh on reload |
| Charts beyond simple bars/percent | Don't over-engineer |
| Comments on polls | Skip |
| Email/SMS/push notifications | Skip |
| CSV export | Skip (optional wow-factor) |
| Scheduled-start polls | Skip |
| Bulk CSV invite upload | Skip |
| Multi-tenant/org separation | Skip |

### 1.5 Optional Wow-Factor Features (Pick 1-2 if Time Allows)

| Feature | Effort | Impact |
|---------|--------|--------|
| Dark mode | 30 min | HIGH — instant visual wow |
| Bar/pie chart visualizations | 30 min | MEDIUM |
| CSV export of results | 20 min | LOW |
| Bulk-invite (comma-separated) | 15 min | MEDIUM |
| Notification panel for invites | 30 min | MEDIUM |
| Containerization (Dockerfile) | 20 min | HIGH — shows DevOps maturity |
| Keyboard shortcuts | 15 min | LOW |

---

## 2. WHAT INTERVIEWERS ARE ACTUALLY EVALUATING

> **The document says:** _"Correct lifecycle handling, correct enforcement of the one-vote-per-user rule, and correct results-visibility behaviour matter more than visual polish."_

### Primary Evaluation Criteria (Ranked)

1. **Data Model Quality** — Is your schema normalized? Are edge cases handled? Can a reviewer read your DB schema and understand the whole system?
2. **Correctness of Business Logic** — Vote enforcement, lifecycle transitions, access control, results-visibility
3. **Security Thinking** — Password hashing, auth guards on EVERY endpoint, private poll access enforcement, vote tampering prevention
4. **Code Organization** — Clean separation, layered architecture, not a monolithic mess
5. **Incremental Commit History** — They WILL read your git log. Meaningful commits showing progression
6. **README Quality** — Setup instructions, tech rationale, architecture overview, AI tool usage honesty, trade-offs
7. **Validation & Error Handling** — Clear messages, edge case handling, defensive coding
8. **Engineering Maturity** — TypeScript usage, consistent patterns, proper error boundaries

### Secondary (Differentiators)

9. **UI/UX Quality** — Clean, functional, modern (but NOT the primary evaluation)
10. **Optional Features** — Dark mode, charts, Docker
11. **Testing** — Even a few key tests show maturity

### Hidden Signals They Look For

- **Do you understand access control deeply?** The private poll + invitee system is the core test
- **Do you handle state transitions correctly?** Draft→Open→Closed with proper locking
- **Do you validate on both client AND server?** Client-only validation = instant red flag
- **Is your password hashing verifiable?** They will inspect your code/DB
- **Do you handle the "results-visibility" edge cases?** This is a nuanced feature

---

## 3. TECH STACK RECOMMENDATION

### Your Proposed Stack — VERDICT: EXCELLENT (with adjustments)

| Layer | Your Proposal | My Recommendation | Reason |
|-------|--------------|-------------------|--------|
| Frontend | Next.js | **Next.js 14+ (App Router)** | Server Actions = no separate API layer needed |
| Auth | Firebase Auth | **Custom Auth with NextAuth.js + Credentials** | See critical note below |
| Database | Firestore | **SQLite with Prisma** | See critical note below |
| Storage | Firebase Storage | **Not needed** — no file uploads in requirements |
| Hosting | GCP | **Local-run only** (not required to deploy) |
| Styling | — | **Tailwind CSS** | Speed of development |

### CRITICAL: Why NOT Firebase Auth + Firestore?

**The document explicitly requires:**
- FR5: _"Passwords must be stored hashed (e.g. bcrypt, argon2, scrypt). Plaintext or reversibly-encrypted password storage is not acceptable."_
- They want to **verify by inspecting the storage or code** (AC1)

**Firebase Auth handles password hashing internally** — you cannot demonstrate bcrypt/argon2 usage. A reviewer cannot verify your hashing approach by inspecting Firestore. This could lose you points on a CRITICAL requirement.

**Firestore** makes the complex queries (filter by status + sort by respondents + paginate + access control) very painful. SQL is dramatically better for this use case.

### RECOMMENDED STACK

```
Next.js 14+ (App Router + Server Actions)
TypeScript · React 18 · Tailwind CSS
NextAuth.js v5 (Credentials Provider) + bcrypt
Prisma ORM + SQLite
Local filesystem (SQLite file persists)
```

### Why This Stack Wins

| Factor | Benefit |
|--------|---------|
| **Speed** | Server Actions eliminate API route boilerplate. Prisma generates types automatically |
| **Correctness** | SQL handles complex queries/filters/pagination natively. Transactions for vote integrity |
| **Verifiability** | bcrypt hashing is in YOUR code, reviewer can inspect it. SQLite file is inspectable |
| **Persistence** | SQLite file survives restarts (AC25) — trivially provable |
| **Scalability story** | "SQLite for dev, Prisma makes switching to PostgreSQL a one-line change" |
| **Modern standards** | Next.js App Router + Server Actions is cutting-edge |
| **Demo reliability** | Zero external dependencies — no Firebase console needed, no network issues |

### Alternative: If You INSIST on Firebase

If you strongly prefer Firebase, here's how to make it work:

- Use Firebase Auth BUT implement a custom `signUp` Cloud Function that uses `bcrypt` and stores the hash in Firestore alongside the user doc — then use `createCustomToken` for auth
- This is complex and risky in 6 hours. **I strongly advise against it.**

---

## 4. COMPLETE ARCHITECTURE

### 4.1 System Architecture

```
BROWSER (Client)
├── Auth Pages
├── Dashboard Views (Feed, My Polls, Shared)
├── Poll Detail + Vote + Results
└── React Server Components + Client Components

            │ Server Actions / Route Handlers

NEXT.JS SERVER
├── Server Actions Layer
│   auth.actions · poll.actions · vote.actions · invite.actions
├── Service Layer (Business Logic)
│   auth.service · poll.service · vote.service · invite.service · results.service
├── Data Access Layer (Prisma)
│   prisma/schema.prisma + Generated Prisma Client
├── NextAuth.js (Session Management)
│   Credentials Provider + bcrypt
└── SQLite (.db file)
```

### 4.2 Frontend Architecture

```
app/
├── (auth)/                    # Auth group (no sidebar layout)
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   └── layout.tsx
├── (dashboard)/               # Main app group (with sidebar)
│   ├── layout.tsx
│   ├── feed/page.tsx          # Public feed (default landing)
│   ├── my-polls/page.tsx
│   ├── shared/page.tsx
│   └── polls/
│       ├── new/page.tsx
│       ├── [id]/page.tsx      # Poll detail + vote + results
│       ├── [id]/edit/page.tsx
│       └── s/[token]/page.tsx # Share URL handler
├── api/auth/[...nextauth]/route.ts
├── layout.tsx
├── page.tsx
└── globals.css
```

### 4.3 Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  polls        Poll[]
  votes        Vote[]
  invitations  Invitation[] @relation("InviteeRelation")

  @@map("users")
}

model Poll {
  id                String   @id @default(cuid())
  title             String
  description       String?
  type              String   // "single" | "multi"
  visibility        String   // "public" | "private"
  resultsVisibility String   // "always" | "after_voting"
  status            String   @default("draft") // "draft" | "open" | "closed"
  shareToken        String   @unique
  endAt             DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  creatorId    String
  creator      User         @relation(fields: [creatorId], references: [id])
  options      Option[]
  votes        Vote[]
  invitations  Invitation[]

  @@index([status, visibility])
  @@index([creatorId])
  @@index([shareToken])
  @@map("polls")
}

model Option {
  id     String @id @default(cuid())
  label  String
  order  Int
  pollId String
  poll   Poll   @relation(fields: [pollId], references: [id], onDelete: Cascade)

  voteSelections VoteSelection[]
  @@map("options")
}

model Vote {
  id        String   @id @default(cuid())
  userId    String
  pollId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user       User            @relation(fields: [userId], references: [id])
  poll       Poll            @relation(fields: [pollId], references: [id])
  selections VoteSelection[]

  @@unique([userId, pollId])  // One vote per user per poll at DB level
  @@map("votes")
}

model VoteSelection {
  id       String @id @default(cuid())
  voteId   String
  optionId String

  vote   Vote   @relation(fields: [voteId], references: [id], onDelete: Cascade)
  option Option @relation(fields: [optionId], references: [id])

  @@unique([voteId, optionId])
  @@map("vote_selections")
}

model Invitation {
  id        String   @id @default(cuid())
  pollId    String
  inviteeId String
  invitedAt DateTime @default(now())

  poll    Poll @relation(fields: [pollId], references: [id])
  invitee User @relation("InviteeRelation", fields: [inviteeId], references: [id])

  @@unique([pollId, inviteeId])  // Can't invite same user twice
  @@map("invitations")
}
```

### 4.4 Why This Schema Wins

- `@@unique([userId, pollId])` on Vote → DB-level enforcement of one-vote-per-user (AC23)
- Separate `VoteSelection` table → clean handling of Single vs Multi choice, easy replace/withdraw
- `shareToken` with `@unique` → indexed for fast lookup via share URLs
- `onDelete: Cascade` on Options → deleting a draft poll cascades correctly
- Compound index `[status, visibility]` → fast public feed queries

### 4.5 Auth Flow

```
REGISTRATION:
User → POST signUp action → bcrypt.hash(password, 12) → prisma.user.create → Redirect to /sign-in

SIGN IN:
User → NextAuth Credentials Provider → findUnique by email → bcrypt.compare → JWT session cookie

ALL ROUTES:
middleware.ts checks session → unauthenticated? redirect to /sign-in
```

### 4.6 API Structure (Server Actions)

```typescript
// lib/actions/auth.actions.ts
"use server"
signUp(formData) → ActionResult
// signOut handled by NextAuth

// lib/actions/poll.actions.ts
"use server"
createPoll(data) → ActionResult<Poll>
updatePoll(id, data) → ActionResult<Poll>
publishPoll(id) → ActionResult<Poll>
closePoll(id) → ActionResult<Poll>
extendPollEndAt(id, newEndAt) → ActionResult<Poll>
deletePoll(id) → ActionResult

// lib/actions/vote.actions.ts
"use server"
castVote(pollId, optionIds[]) → ActionResult
withdrawVote(pollId) → ActionResult

// lib/actions/invite.actions.ts
"use server"
inviteUser(pollId, email) → ActionResult
revokeInvitation(pollId, inviteeId) → ActionResult
```

### 4.7 State Management

| Concern | Approach |
|---------|----------|
| Auth session | NextAuth `useSession()` |
| Poll lists | Server Components with `searchParams` for filter/sort/page |
| Poll detail | Server Component, fetched on page load |
| Vote form state | Local `useState` in client component |
| Create/Edit form | React Hook Form + Zod validation |
| Optimistic updates | `useTransition` + `revalidatePath` after Server Actions |
| Toast notifications | Sonner (lightweight toast library) |

### 4.8 Security Practices

| Concern | Implementation |
|---------|---------------|
| Password hashing | bcrypt with cost factor 12 |
| Session | HTTP-only JWT cookie via NextAuth |
| Auth guard | Middleware redirects unauthenticated to `/sign-in` |
| Server Action auth | Every action starts with session check |
| Private poll access | `checkPollAccess(userId, pollId)` utility in every poll action |
| Vote tampering | DB-level `@@unique` constraint + server-side validation |
| Input validation | Zod schemas on both client and server |
| CSRF | Built-in with Server Actions |
| SQL injection | Prisma parameterized queries (automatic) |
| Share token | `crypto.randomBytes(16).toString('base64url')` — 22 chars, URL-safe |
