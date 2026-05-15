# 🗳️ PollForge — Hackathon Battle Plan (Part 2)

## 6. FULL 6-HOUR IMPLEMENTATION ROADMAP

### Time Budget Overview

| Phase | Time | Cumulative | Deliverable |
|-------|------|------------|-------------|
| Phase 0: Setup | 0:00–0:20 | 20 min | Project scaffold, Prisma, NextAuth |
| Phase 1: Auth | 0:20–1:00 | 40 min | Register, Login, Logout, Guards |
| Phase 2: Poll CRUD | 1:00–2:00 | 60 min | Create, Edit, Delete Draft polls |
| Phase 3: Lifecycle | 2:00–2:30 | 30 min | Publish, Close, Auto-close |
| Phase 4: Voting | 2:30–3:15 | 45 min | Cast, Replace, Withdraw votes |
| Phase 5: Results | 3:15–3:45 | 30 min | Results display, visibility rules |
| Phase 6: Access Control | 3:45–4:15 | 30 min | Private polls, Invitations |
| Phase 7: Feed & Lists | 4:15–5:00 | 45 min | Public feed, My Polls, Shared, Filters, Pagination |
| Phase 8: Share URLs | 5:00–5:15 | 15 min | Share token resolution, copy link |
| Phase 9: Polish + README | 5:15–6:00 | 45 min | UI polish, dark mode, README, final commits |

### Phase 0: Project Setup (20 min) — `git commit: "chore: project scaffold"`

```bash
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
npm install prisma @prisma/client next-auth@beta bcrypt zod react-hook-form @hookform/resolvers sonner
npm install -D @types/bcrypt
npx prisma init --datasource-provider sqlite
```

**Immediately do:**
1. Set up Prisma schema (copy from Part 1)
2. `npx prisma db push` to create SQLite
3. Set up NextAuth config with Credentials provider
4. Set up `middleware.ts` auth guard
5. Set up `lib/db.ts` Prisma singleton
6. **GIT COMMIT**

### Phase 1: Authentication (40 min) — `git commit: "feat: user registration and authentication"`

**Build order:**
1. `lib/validators/auth.schema.ts` — Zod schemas for signup/signin
2. `lib/actions/auth.actions.ts` — `signUp` server action with bcrypt
3. `app/(auth)/layout.tsx` — Centered card layout
4. `components/auth/sign-up-form.tsx` — Registration form (client component)
5. `app/(auth)/sign-up/page.tsx` — Registration page
6. `components/auth/sign-in-form.tsx` — Login form
7. `app/(auth)/sign-in/page.tsx` — Login page
8. Test: register → login → verify session → logout → can't access dashboard
9. **GIT COMMIT**

**Key code pattern for bcrypt (reviewers WILL check this):**
```typescript
// lib/actions/auth.actions.ts
import bcrypt from 'bcrypt';

export async function signUp(formData: FormData) {
  const password = formData.get('password') as string;
  const passwordHash = await bcrypt.hash(password, 12); // cost factor 12
  await prisma.user.create({
    data: { name, email, passwordHash }
  });
}
```

### Phase 2: Poll CRUD (60 min) — `git commit: "feat: poll creation and draft management"`

**Build order:**
1. `lib/validators/poll.schema.ts` — Zod schema for poll creation/editing
2. `lib/actions/poll.actions.ts` — `createPoll`, `updatePoll`, `deletePoll`
3. `components/polls/poll-form.tsx` — Dynamic form with add/remove options
4. `app/(dashboard)/layout.tsx` — Sidebar + header layout
5. `app/(dashboard)/polls/new/page.tsx` — Create poll page
6. `app/(dashboard)/my-polls/page.tsx` — List creator's polls
7. `components/polls/poll-card.tsx` — Poll preview card
8. `app/(dashboard)/polls/[id]/edit/page.tsx` — Edit draft
9. Test: create draft → edit → delete → verify DB state
10. **GIT COMMIT**

**Share token generation:**
```typescript
import crypto from 'crypto';
const shareToken = crypto.randomBytes(16).toString('base64url'); // 22 chars
```

### Phase 3: Poll Lifecycle (30 min) — `git commit: "feat: poll lifecycle (publish, close, auto-close)"`

1. `publishPoll` action — validates 2+ options, sets status to "open", locks fields
2. `closePoll` action — sets status to "closed"
3. `extendPollEndAt` action — validates new date > now
4. Auto-close middleware: utility function `checkAndAutoClose(poll)` called on every poll read
5. Update poll detail page to show lifecycle controls for creator
6. Add status badges (Draft/Open/Closed)
7. Test all transitions + rejection messages
8. **GIT COMMIT**

**Auto-close pattern (elegant, no scheduler):**
```typescript
async function getPolWithAutoClose(pollId: string) {
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (poll?.status === 'open' && poll.endAt && new Date(poll.endAt) < new Date()) {
    return prisma.poll.update({
      where: { id: pollId },
      data: { status: 'closed' }
    });
  }
  return poll;
}
```

### Phase 4: Voting (45 min) — `git commit: "feat: voting system with single/multi choice"`

1. `lib/validators/vote.schema.ts` — Zod schema
2. `lib/actions/vote.actions.ts` — `castVote`, `withdrawVote`
3. `components/polls/vote-form.tsx` — Radio buttons (single) / checkboxes (multi)
4. Vote replacement logic using Prisma transaction:

```typescript
await prisma.$transaction(async (tx) => {
  // Delete existing selections
  await tx.voteSelection.deleteMany({
    where: { vote: { userId, pollId } }
  });
  // Upsert vote + create new selections
  await tx.vote.upsert({
    where: { userId_pollId: { userId, pollId } },
    create: { userId, pollId, selections: { create: optionIds.map(id => ({ optionId: id })) } },
    update: { selections: { create: optionIds.map(id => ({ optionId: id })) } }
  });
});
```

5. Withdraw = delete Vote record (cascades to VoteSelection)
6. Add "Your vote" indicator on poll detail
7. Test: vote → change vote → withdraw → re-vote
8. **GIT COMMIT**

### Phase 5: Results Display (30 min) — `git commit: "feat: results display with visibility rules"`

1. `lib/services/results.service.ts` — Calculate counts + percentages
2. `components/polls/poll-results.tsx` — Bar display with percentages
3. Results-visibility logic:

```typescript
function canSeeResults(poll, userId, userVote) {
  if (poll.status === 'closed') return true;
  if (poll.creatorId === userId) return true;
  if (poll.resultsVisibility === 'always') return true;
  if (poll.resultsVisibility === 'after_voting' && userVote) return true;
  return false;
}
```

4. "Vote to see results" prompt for after-voting mode
5. Test both visibility modes
6. **GIT COMMIT**

### Phase 6: Access Control & Invitations (30 min) — `git commit: "feat: private polls and invitation system"`

1. `lib/services/access.service.ts` — `checkPollAccess(userId, poll)`
2. `lib/actions/invite.actions.ts` — `inviteUser`, `revokeInvitation`
3. `components/invitations/invite-form.tsx` — Email input + invite button
4. `components/invitations/invitee-list.tsx` — List with revoke buttons
5. Access check applied to: poll detail, vote, results, share URL
6. "No access" page that doesn't reveal poll details
7. Test: private poll → can't access without invite → invite → can access → revoke → can't access
8. **GIT COMMIT**

### Phase 7: Feed, Filters, Pagination (45 min) — `git commit: "feat: public feed, my polls, shared with me, filters"`

1. `app/(dashboard)/feed/page.tsx` — Public feed (Server Component with searchParams)
2. `components/polls/poll-filters.tsx` — Filter/sort controls
3. `components/ui/pagination.tsx` — Pagination component
4. Query builder pattern:

```typescript
async function getPublicFeed({ status, sortBy, sortOrder, page, pageSize = 20 }) {
  const where = {
    visibility: 'public',
    status: { not: 'draft' },
    ...(status && { status }),
  };
  const [polls, total] = await Promise.all([
    prisma.poll.findMany({
      where,
      orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      skip: ((page || 1) - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { votes: true } }, creator: { select: { name: true } } }
    }),
    prisma.poll.count({ where })
  ]);
  return { polls, total, pageSize };
}
```

5. `app/(dashboard)/shared/page.tsx` — Shared with me view
6. Test all three views with proper scoping
7. **GIT COMMIT**

### Phase 8: Share URLs (15 min) — `git commit: "feat: shareable poll URLs"`

1. `app/(dashboard)/polls/s/[token]/page.tsx` — Resolve token → redirect to poll detail with access check
2. `components/polls/share-link.tsx` — Copy-to-clipboard button
3. Test: share link → public poll accessible → private poll access denied for non-invitee
4. **GIT COMMIT**

### Phase 9: Polish + README (45 min) — Multiple commits

#### UI Polish (20 min) — `git commit: "style: UI polish and dark mode"`
- Dark mode toggle (if time)
- Loading states / skeletons
- Empty states ("No polls yet")
- Error boundaries
- Mobile responsive nav

#### README (25 min) — `git commit: "docs: comprehensive README"`
Write all required sections (template below in section 10).

---

## 7. UI/UX DIRECTION

### Project Branding

- **Name:** PollForge
- **Tagline:** "Structured opinions. Zero noise."

### Color Palette

```css
/* Dark theme primary */
--background: #0a0a0f;        /* Near-black */
--card: #12121a;               /* Dark card */
--card-hover: #1a1a28;         /* Card hover */
--border: #2a2a3a;             /* Subtle borders */

/* Accent */
--primary: #6366f1;            /* Indigo-500 */
--primary-hover: #818cf8;      /* Indigo-400 */
--primary-foreground: #ffffff;

/* Status badges */
--status-draft: #f59e0b;      /* Amber */
--status-open: #22c55e;       /* Green */
--status-closed: #ef4444;     /* Red */

/* Text */
--foreground: #f1f5f9;        /* Slate-100 */
--muted: #94a3b8;             /* Slate-400 */
```

### Typography
- **Headings:** Inter (Google Fonts) — 600/700 weight
- **Body:** Inter — 400 weight
- **Monospace (tokens/IDs):** JetBrains Mono

### Dashboard Structure

```
┌──────────────────────────────────────────────┐
│  HEADER: Logo | Search | User avatar/menu    │
├──────┬───────────────────────────────────────┤
│      │                                       │
│  S   │   MAIN CONTENT AREA                  │
│  I   │                                       │
│  D   │   Feed / My Polls / Shared           │
│  E   │   ┌─────┐ ┌─────┐ ┌─────┐          │
│  B   │   │Card │ │Card │ │Card │          │
│  A   │   └─────┘ └─────┘ └─────┘          │
│  R   │                                       │
│      │   Filters | Sort | Pagination        │
│  ────│───────────────────────────────────────│
│  Feed│                                       │
│  My  │                                       │
│  Shrd│                                       │
│  +New│                                       │
│      │                                       │
└──────┴───────────────────────────────────────┘
```

### Component Hierarchy

```
RootLayout
├── AuthLayout (no sidebar)
│   ├── SignInPage → SignInForm
│   └── SignUpPage → SignUpForm
└── DashboardLayout (sidebar + header)
    ├── Sidebar
    │   ├── NavLink (Feed)
    │   ├── NavLink (My Polls)
    │   ├── NavLink (Shared with me)
    │   └── CreatePollButton
    ├── Header
    │   ├── PageTitle
    │   └── UserMenu (avatar, sign out)
    ├── FeedPage
    │   ├── PollFilters (status, sort)
    │   ├── PollCard[] (grid/list)
    │   └── Pagination
    ├── MyPollsPage (same structure)
    ├── SharedPage (same structure)
    ├── CreatePollPage → PollForm
    ├── EditPollPage → PollForm
    └── PollDetailPage
        ├── PollHeader (title, status badge, share link)
        ├── PollMeta (type, visibility, end-at, respondents)
        ├── VoteForm (radio/checkbox) OR PollResults (bars)
        ├── InviteeList (if private + creator)
        └── InviteForm (if private + creator)
```

### Mobile Responsiveness Strategy

- **Sidebar:** Collapsible hamburger menu on mobile (sheet/drawer)
- **Poll cards:** Single column on mobile, 2-col on tablet, 3-col on desktop
- **Poll detail:** Stack vote form and results vertically on mobile
- **Forms:** Full-width inputs, stacked vertically
- **Use Tailwind responsive prefixes:** `sm:`, `md:`, `lg:`

---

## 8. NAMING CONVENTIONS & GIT STRATEGY

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `poll-card.tsx` |
| Components | PascalCase | `PollCard` |
| Functions | camelCase | `createPoll` |
| Server Actions | camelCase | `castVote` |
| Types/Interfaces | PascalCase | `PollWithOptions` |
| Constants | SCREAMING_SNAKE | `DEFAULT_PAGE_SIZE` |
| DB tables | snake_case (via @@map) | `vote_selections` |
| CSS classes | Tailwind utilities | — |
| Env variables | SCREAMING_SNAKE | `NEXTAUTH_SECRET` |

### Git Commit Strategy

```
chore: project scaffold with Next.js, Prisma, NextAuth
feat: user registration and authentication
feat: poll creation and draft management
feat: poll lifecycle (publish, close, auto-close)
feat: voting system with single/multi choice
feat: results display with visibility rules
feat: private polls and invitation system
feat: public feed, my polls, shared with me, filters and pagination
feat: shareable poll URLs
style: UI polish and dark mode
docs: comprehensive README
```

**Rules:**
- Commit after EVERY phase — minimum 10 commits
- Use conventional commits: `feat:`, `fix:`, `chore:`, `style:`, `docs:`
- Each commit should be a working state (no broken builds)
- NEVER do a single giant commit at the end

---

## 9. WHAT NOT TO WASTE TIME ON

### Time Traps (AVOID)

| Trap | Why | Alternative |
|------|-----|-------------|
| Perfect pixel UI | Doc says correctness > polish | Clean Tailwind, functional UI |
| Custom design system | Too slow for 6 hours | Use shadcn/ui or raw Tailwind |
| Real-time websockets | Explicitly not required | Reload to refresh |
| Email notifications | Explicitly not required | Skip entirely |
| Unit test coverage | Not required, time-expensive | Maybe 1-2 critical tests if time |
| CI/CD pipeline | Not needed for local-run | Skip |
| Docker multi-stage build | Nice-to-have only | Simple Dockerfile if time |
| Fancy animations | Secondary priority | Subtle transitions only |
| Complex form validation UX | Overkill | Clear error messages are enough |
| Deployment to cloud | Explicitly not required | Local-run only |

### Maximum Interviewer Impact

| High Impact, Low Effort | Why It Works |
|--------------------------|-------------|
| Clean Prisma schema | They will read your schema first |
| Visible bcrypt usage | They will ctrl+F for "bcrypt" |
| Proper access check on EVERY endpoint | Shows security maturity |
| Clear error messages | Shows attention to UX |
| Meaningful git history | Shows engineering process |
| Good README | Shows communication skills |
| Dark mode | 30 min for massive visual impact |
| Status badges with colors | Makes the app feel polished instantly |

### Common Hackathon Mistakes

1. **Building features not in spec** — Wasting time on things that aren't evaluated
2. **Single giant commit** — Signals you built it all at once with AI and didn't iterate
3. **No error handling** — First edge case breaks the demo
4. **Client-only validation** — Red flag for security awareness
5. **Firebase Auth without demonstrating hashing** — Fails FR5/AC1
6. **Not reading the "What is NOT required" section** — Building websockets, notifications, etc.
7. **Spending 2+ hours on UI** — When business logic is broken
8. **No README** — Instant disqualification-level mistake
9. **Hardcoded IDs/data** — Looks like a fake demo
10. **Not testing the restart scenario** — AC25 will catch you

---

## 10. README TEMPLATE

```markdown
# PollForge — Online Polling Platform

## Setup & Run Instructions

### Prerequisites
- Node.js 18+ and npm

### Quick Start
git clone <repo-url>
cd pollforge
npm install
cp .env.example .env.local
npx prisma db push
npx prisma db seed  # Optional: seed demo data
npm run dev
# Open http://localhost:3000

### Environment Variables
NEXTAUTH_SECRET=<any-random-string>
NEXTAUTH_URL=http://localhost:3000

## Tech Stack & Rationale

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 14 (App Router) | Server Actions eliminate API boilerplate; RSC for performance |
| Language | TypeScript | Type safety, better DX, catches bugs at compile time |
| Auth | NextAuth.js v5 + bcrypt | Credentials provider gives full control over password hashing; bcrypt with cost factor 12 for verifiable security |
| Database | SQLite via Prisma | Zero-config persistence; SQL handles complex queries natively; Prisma provides type-safe ORM with easy migration path to PostgreSQL |
| Styling | Tailwind CSS | Rapid development, consistent design tokens, responsive utilities |
| Validation | Zod | Runtime type validation on both client and server |

### Why SQLite over Firestore/MongoDB?
- Complex queries (filter + sort + paginate + access control) are trivial in SQL
- `@@unique` constraints enforce business rules at the database level
- File-based persistence is trivially verifiable (AC25)
- Prisma makes switching to PostgreSQL a one-line config change

### Password Hashing
Passwords are hashed using bcrypt with a cost factor of 12.
See: `lib/actions/auth.actions.ts` — `bcrypt.hash(password, 12)`
Verify: inspect `prisma/dev.db` users table — `passwordHash` column contains bcrypt hashes starting with `$2b$12$`

## Architectural Overview
[Include the layered architecture from Part 1]

## How AI Tools Were Used
- **AI Assistant:** [Your tool]
- **AI-Generated:** Initial Prisma schema, boilerplate components, Zod schemas
- **AI-Assisted:** Business logic (reviewed and modified), access control checks
- **Hand-Written:** Core vote transaction logic, results-visibility algorithm, access control service
- **Reviewed & Edited:** All AI output was reviewed for correctness and edge cases
- **Rejected:** [Anything you rejected]

## Assumptions
- Single-server deployment (SQLite is sufficient)
- All users are in the same timezone for end-at display
- Email format validation uses standard regex (not full RFC 5322)
- Share tokens are cryptographically random (crypto.randomBytes)

## Trade-offs
- **SQLite vs PostgreSQL:** SQLite chosen for zero-config setup; production would use PostgreSQL
- **No real-time:** Results refresh on page reload (explicitly out of scope)
- **No email delivery:** Invitations are in-app only (explicitly out of scope)
- **Minimal test coverage:** Focused on correct business logic over test infrastructure given 6-hour constraint

## Future Work
- Migrate to PostgreSQL for production
- Add WebSocket for real-time result updates
- Email notifications for invitations
- Chart visualizations (Chart.js/Recharts)
- Rate limiting and abuse prevention
- E2E tests with Playwright
- Docker containerization
- CSV export of results
```

---

## 11. DEMO FLOW / SCRIPT

### Elevator Pitch (30 seconds)

> "PollForge is an online polling platform where authenticated users can create configurable polls — single or multi-choice, public or private — with a complete lifecycle from draft to open to closed. The platform enforces strict access control: private polls are invisible to non-invitees even with the correct URL, and every vote is attributed internally for one-vote-per-user enforcement while keeping individual choices completely private. I built it in 6 hours using Next.js with Server Actions, Prisma ORM with SQLite, and NextAuth with bcrypt for verifiable password security."

### Demo Script (5-7 minutes)

**Act 1: Authentication (1 min)**
1. Show the sign-up page → Register "Alice" (alice@example.com)
2. Show the sign-up page → Register "Bob" (bob@example.com)
3. "Notice the passwords are hashed with bcrypt — let me show you the database..."
4. Open SQLite browser or terminal: `SELECT email, passwordHash FROM users` → show bcrypt hashes
5. Sign out → Sign back in as Alice

**Act 2: Poll Creation & Lifecycle (1.5 min)**
1. Create a PUBLIC Single-choice poll: "Best programming language?" with options: TypeScript, Python, Rust, Go
2. Set results-visibility to "Always visible", end-at to 1 hour from now
3. Show it's in Draft state → Edit the title → Save
4. **Publish** the poll → Show options are now locked
5. Copy the share URL

**Act 3: Voting & Results (1.5 min)**
1. As Alice (creator), vote for TypeScript → Show results appear immediately
2. Switch to Bob's account → Show the poll appears in the public feed
3. Bob votes for Rust → Results update with correct percentages
4. Bob changes vote to Python → Show the previous vote is replaced, counts are correct
5. Bob withdraws vote → Counts decrement correctly

**Act 4: Private Poll + Access Control (1.5 min)**
1. As Alice, create a PRIVATE Multi-choice poll: "Team lunch options?" with options: Pizza, Sushi, Tacos, Salad
2. Set results-visibility to "Visible after voting"
3. Publish it → Show it does NOT appear in the public feed
4. Switch to Bob → Show Bob cannot see the poll (even with the share URL → "No access")
5. Switch back to Alice → Invite Bob by email
6. Switch to Bob → Show the poll now appears in "Shared with me"
7. Bob votes → Results become visible
8. Alice revokes Bob's invitation → Bob can no longer access the poll

**Act 5: Feed & Filtering (1 min)**
1. Show the public feed with multiple polls
2. Filter by status (Open only)
3. Sort by most respondents
4. Show pagination working
5. Show "My Polls" view — Alice sees all her polls (including private ones)

**Act 6: Architecture Highlight (30 sec)**
1. "Let me quickly show the codebase organization..."
2. Show the Prisma schema → "Notice the @@unique constraint on Vote — one vote per user per poll enforced at the database level"
3. Show the bcrypt hashing in auth actions
4. Show the access control check utility

### Contingency Plan for Demo Failure

| Problem | Mitigation |
|---------|------------|
| App won't start | Have a backup SQLite with seed data ready |
| Auth broken | Pre-create test users in seed script |
| Edge case breaks | Have prepared error messages, explain the fix you'd make |
| UI looks broken | "I prioritized correctness and business logic over visual polish, as specified in the requirements" |
| Time runs short | Skip Act 5 (filtering), jump to architecture highlight |
| Awkward silence | Pull up git log: "Let me walk you through my development process" |

---

## 12. FINAL ARCHITECTURE SUMMARY

```
┌─────────────────────────────────────────────────────────┐
│                     PollForge                           │
│              Online Polling Platform                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  FRONTEND          SERVER              DATA             │
│  ─────────         ──────              ────             │
│  Next.js 14        Server Actions      SQLite           │
│  App Router        NextAuth.js v5      Prisma ORM       │
│  React 18 RSC      bcrypt hashing      5 tables:        │
│  Tailwind CSS      Zod validation        users          │
│  TypeScript        Access Control        polls          │
│                    Service Layer         options         │
│                                          votes          │
│                                          invitations    │
│                                                         │
│  KEY FEATURES                                           │
│  ────────────                                           │
│  ✓ Email/password auth with bcrypt-12 hashing          │
│  ✓ Poll lifecycle: Draft → Open → Closed               │
│  ✓ Single-choice and Multi-choice polls                │
│  ✓ Public / Private visibility with invitations        │
│  ✓ Results-visibility: Always / After-voting           │
│  ✓ One-vote-per-user enforced at DB level              │
│  ✓ Vote change and withdrawal                          │
│  ✓ Shareable URLs with unguessable tokens              │
│  ✓ Feed filtering, sorting, pagination                 │
│  ✓ Server-side validation on ALL mutations             │
│  ✓ Access control on every endpoint                    │
│  ✓ Data persists across restarts (SQLite file)         │
│                                                         │
│  SECURITY                                               │
│  ────────                                               │
│  ✓ bcrypt password hashing (cost 12)                   │
│  ✓ HTTP-only JWT session cookies                       │
│  ✓ Middleware auth guard on all routes                 │
│  ✓ Server-side access checks on every action           │
│  ✓ DB-level unique constraints for vote integrity      │
│  ✓ Prisma parameterized queries (SQL injection safe)   │
│  ✓ CSRF protection via Server Actions                  │
│  ✓ Private poll details never leak to unauthorized     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 13. QUICK REFERENCE: ACCEPTANCE CRITERIA CHECKLIST

Use this during development to verify you've hit every requirement:

- [ ] **AC1:** Register, sign out, sign back in. Passwords hashed (bcrypt).
- [ ] **AC2:** Unauthenticated users redirected / rejected.
- [ ] **AC3:** Create Draft with all fields.
- [ ] **AC4:** Stable shareable URL with unguessable token.
- [ ] **AC5:** Edit any field of Draft poll.
- [ ] **AC6:** Delete Draft poll.
- [ ] **AC7:** Publish Draft → Open. Options/type/visibility locked.
- [ ] **AC8:** Extend end-at (not shorten). Manual close.
- [ ] **AC9:** Auto-close when end-at passed. Closed = read-only.
- [ ] **AC10:** Public poll in feed, accessible via feed + share URL.
- [ ] **AC11:** Private poll NOT in public feed.
- [ ] **AC12:** Non-invitee can't access private poll (no details leaked).
- [ ] **AC13:** Creator invites by email → invitee sees in "Shared with me".
- [ ] **AC14:** Revoke invitation → access removed (vote preserved).
- [ ] **AC15:** Can't invite to public poll. Can't invite unregistered email.
- [ ] **AC16:** Single-choice: exactly one option.
- [ ] **AC17:** Multi-choice: one or more options.
- [ ] **AC18:** Re-vote replaces prior selection.
- [ ] **AC19:** Withdraw vote → non-voter state. Counts decrement.
- [ ] **AC20:** "Always visible" → results visible to all with access.
- [ ] **AC21:** "After voting" → must vote first. Creator always sees. All see after closed.
- [ ] **AC22:** Correct counts and percentages. Single sums to 100%. Multi can exceed.
- [ ] **AC23:** Can't vote on behalf, tamper counts, or see others' selections.
- [ ] **AC24:** Feed/MyPolls/Shared show correct entries. Filters/sort/pagination work.
- [ ] **AC25:** Data persists after restart.

---

**Good luck. You've got this. Follow the phases, commit after each one, and prioritize correctness over polish. 🚀**
