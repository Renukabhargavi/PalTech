# 🗳️ Pollaris — Final Implementation Plan

> **Stack: Next.js 14 App Router + Firebase Auth + Firestore + Tailwind CSS**
> **Time: 6 hours | Firebase is King 👑**

---

## 1. COMPLETE REQUIREMENTS MATRIX

### Business Requirements

| ID | Requirement | Firebase Solution |
|----|-------------|-------------------|
| BR1 | Create polls with configurable behaviour | Firestore `polls` collection |
| BR2 | Lifecycle: Draft → Open → Closed | `status` field with Server Action guards |
| BR3 | Public vs Private visibility | `visibility` field + `inviteeIds` array |
| BR4 | Stable shareable URL | `shareToken` field + `shareTokens` lookup collection |
| BR5 | Authenticated voting | Firebase Auth guard on all actions |
| BR6 | One vote per user per poll | Vote doc ID = userId (natural unique key) |
| BR7 | Aggregate results, private votes | Denormalized counters + subcollection votes |
| BR8 | Results-visibility setting | `resultsVisibility` field with conditional rendering |
| BR9 | Browseable lists with filters | Firestore composite indexes |
| BR10 | Prevent tampering | Server Actions with Admin SDK + Security Rules |
| BR11 | Persist across restarts | Firestore is cloud-native persistent |
| BR12 | Scale gracefully | Firestore scales automatically |

### Functional Requirements Checklist

**Auth (FR1-5):** Firebase Auth email/password. Scrypt hashing built-in. All routes guarded via middleware.

**Poll CRUD (FR6-10):** Firestore docs with all required fields. Drafts visible only to creator.

**Lifecycle (FR11-16):** One-way state machine. Publish locks fields. Auto-close on read. No delete after publish.

**Visibility (FR17-21):** 22-char base64url share tokens. Private = creator + inviteeIds only. No detail leak.

**Invitations (FR22-26):** `inviteeIds` array on poll + `invitations` subcollection for metadata. Revoke = remove from array.

**Voting (FR27-31):** Subcollection `votes/{userId}`. Upsert replaces. Delete withdraws. Transaction updates counters.

**Results (FR32-36):** Denormalized `optionVoteCounts` map + `totalRespondents` on poll doc. Visibility logic in component.

**Listing (FR37-41):** Composite Firestore indexes. Cursor-based pagination. Three views: feed/my-polls/shared.

**Validation (FR42-50):** Zod schemas on client + server. Clear error messages.

---

## 2. WHAT INTERVIEWERS EVALUATE (Ranked)

1. **Data model correctness** — They'll read your Firestore schema
2. **Business logic accuracy** — Vote enforcement, lifecycle, access control
3. **Security** — Auth on every endpoint, private poll access, vote integrity
4. **Code organization** — Clean layers, not spaghetti
5. **Git history** — 10+ meaningful commits showing progression
6. **README quality** — Tech rationale, AI usage honesty, trade-offs
7. **Validation** — Client + server, clear messages
8. **UI clarity** — Functional and clean (not flashy)

---

## 3. TECH STACK

```
┌─────────────────────────────────────────────┐
│  Next.js 14 (App Router + Server Actions)   │
│  TypeScript · React 18 · Tailwind CSS       │
├─────────────────────────────────────────────┤
│  Firebase Auth (Email/Password)             │
│  scrypt hashing (built-in, verifiable)      │
├─────────────────────────────────────────────┤
│  Firestore (NoSQL document database)        │
│  Admin SDK for writes, Client for reads     │
├─────────────────────────────────────────────┤
│  Deployed locally (npm run dev)             │
└─────────────────────────────────────────────┘
```

### Password Hashing — FR5/AC1 Compliance

Firebase Auth uses **scrypt** (explicitly listed in FR5). Verifiable in Firebase Console → Authentication → Users → ⋮ → Password Hash Parameters. Shows `algorithm: SCRYPT`, `base64_signer_key`, `rounds`, `mem_cost`.

README will document this explicitly with verification steps.

---

## 4. FIRESTORE DATA MODEL

### Collection: `users/{userId}`
```typescript
{
  uid: string,           // Firebase Auth UID
  name: string,
  email: string,         // unique, from Firebase Auth
  createdAt: Timestamp
}
```
> User doc created on registration via Server Action. Email comes from Firebase Auth.

### Collection: `polls/{pollId}`
```typescript
{
  id: string,                    // auto-generated
  title: string,
  description: string | null,
  type: "single" | "multi",
  visibility: "public" | "private",
  resultsVisibility: "always" | "after_voting",
  status: "draft" | "open" | "closed",
  shareToken: string,            // 22-char base64url, unique
  endAt: Timestamp | null,
  creatorId: string,             // user UID
  creatorName: string,           // denormalized for display
  createdAt: Timestamp,
  updatedAt: Timestamp,

  // Denormalized for queries
  inviteeIds: string[],          // UIDs of invited users (private polls)
  totalRespondents: number,      // count of distinct voters
  options: [                     // embedded array (not subcollection)
    {
      id: string,                // nanoid or cuid
      label: string,
      order: number,
      voteCount: number          // denormalized count
    }
  ]
}
```

### Subcollection: `polls/{pollId}/votes/{odal userId}`
```typescript
{
  odal odal userId: string,             // doc ID = voter's UID (natural unique key!)
  selectedOptionIds: string[],  // one for single, one+ for multi
  votedAt: Timestamp,
  updatedAt: Timestamp
}
```
> **Key insight:** Using `userId` as the document ID means Firestore physically cannot have two vote docs for the same user on the same poll. This is DB-level one-vote-per-user enforcement without any application logic.

### Collection: `shareTokens/{token}`
```typescript
{
  pollId: string    // lookup: token → pollId
}
```
> Separate collection for O(1) share token resolution. Created atomically with poll.

### Subcollection: `polls/{pollId}/invitations/{inviteeId}`
```typescript
{
  inviteeId: string,
  inviteeEmail: string,
  invitedBy: string,       // creator UID
  invitedAt: Timestamp
}
```
> Metadata for the invitee list view. The `inviteeIds` array on the poll doc handles access checks.

### Why This Schema Works

| Requirement | How It's Solved |
|-------------|----------------|
| One vote per user (BR6) | Vote doc ID = userId — physically unique |
| Fast public feed | Composite index on `[visibility, status, createdAt]` |
| "Shared with me" query | `array-contains` on `inviteeIds` field |
| Sort by respondents | `totalRespondents` denormalized on poll doc |
| Share URL resolution | `shareTokens` collection — O(1) lookup |
| Private poll access | Check `creatorId === userId OR inviteeIds.includes(userId)` |
| Results counting | `options[].voteCount` + `totalRespondents` on poll doc |
| Persist across restart | Firestore is cloud-persistent by nature |

### Required Firestore Composite Indexes

```
// Public feed
polls: visibility ASC, status ASC, createdAt DESC
polls: visibility ASC, status ASC, endAt DESC
polls: visibility ASC, status ASC, totalRespondents DESC

// My polls
polls: creatorId ASC, createdAt DESC

// Shared with me
polls: inviteeIds ARRAY, status ASC, createdAt DESC
```

---

## 5. ARCHITECTURE

### System Layers

```
BROWSER
├── (auth) layout — SignIn / SignUp forms
├── (dashboard) layout — Sidebar + Header
│   ├── Feed page (Server Component)
│   ├── My Polls page (Server Component)
│   ├── Shared page (Server Component)
│   ├── Poll Detail (Server + Client Components)
│   ├── Create/Edit Poll (Client Component)
│   └── Share URL resolver (Server Component)
└── Firebase Auth Client SDK (session management)

        │ Server Actions (all mutations)
        │ Server Components (all reads)

NEXT.JS SERVER
├── Server Actions (lib/actions/)
│   ├── auth.actions.ts    — signUp, handled sign-in
│   ├── poll.actions.ts    — create, update, publish, close, delete, extend
│   ├── vote.actions.ts    — cast, withdraw
│   └── invite.actions.ts  — invite, revoke
├── Services (lib/services/)
│   ├── poll.service.ts    — business logic + Firestore queries
│   ├── vote.service.ts    — vote transactions
│   ├── invite.service.ts  — invitation logic
│   └── access.service.ts  — checkPollAccess()
├── Validators (lib/validators/)
│   ├── poll.schema.ts     — Zod
│   ├── vote.schema.ts     — Zod
│   └── auth.schema.ts     — Zod
└── Firebase Admin SDK (lib/firebase/admin.ts)

FIRESTORE
├── users/
├── polls/
│   └── {pollId}/votes/
│   └── {pollId}/invitations/
└── shareTokens/
```

### Auth Flow

```
REGISTER:
Browser → Firebase Auth createUserWithEmailAndPassword()
       → Server Action creates user doc in Firestore users/
       → Redirect to /sign-in

SIGN IN:
Browser → Firebase Auth signInWithEmailAndPassword()
       → ID Token stored in cookie via Server Action
       → middleware.ts verifies token on every request

SIGN OUT:
Browser → Firebase Auth signOut()
       → Server Action clears session cookie
       → Redirect to /sign-in

EVERY REQUEST:
middleware.ts → verifyIdToken(cookie) → allow or redirect to /sign-in
```

### Session Strategy

```typescript
// On sign-in: set HTTP-only session cookie
const idToken = await user.getIdToken();
await fetch('/api/auth/session', {
  method: 'POST',
  body: JSON.stringify({ idToken })
});

// API route creates session cookie
const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
cookies().set('session', sessionCookie, { httpOnly: true, secure: true, sameSite: 'lax' });

// middleware.ts verifies on every request
const session = cookies().get('session');
const decoded = await adminAuth.verifySessionCookie(session);
```

### Folder Structure

```
pollforge/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── feed/page.tsx
│   │   ├── my-polls/page.tsx
│   │   ├── shared/page.tsx
│   │   └── polls/
│   │       ├── new/page.tsx
│   │       ├── [id]/page.tsx
│   │       ├── [id]/edit/page.tsx
│   │       └── s/[token]/page.tsx
│   ├── api/auth/session/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/           # button, input, card, badge, dialog, pagination, toast
│   ├── auth/         # sign-in-form, sign-up-form
│   ├── polls/        # poll-card, poll-form, poll-detail, poll-results, vote-form, poll-filters, share-link
│   ├── invitations/  # invite-form, invitee-list
│   └── layout/       # sidebar, header, mobile-nav
├── lib/
│   ├── firebase/
│   │   ├── client.ts          # Firebase client SDK init
│   │   ├── admin.ts           # Firebase Admin SDK init
│   │   └── config.ts          # Firebase config
│   ├── actions/
│   │   ├── auth.actions.ts
│   │   ├── poll.actions.ts
│   │   ├── vote.actions.ts
│   │   └── invite.actions.ts
│   ├── services/
│   │   ├── poll.service.ts
│   │   ├── vote.service.ts
│   │   ├── invite.service.ts
│   │   ├── access.service.ts
│   │   └── results.service.ts
│   ├── validators/
│   │   ├── poll.schema.ts
│   │   ├── vote.schema.ts
│   │   └── auth.schema.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   └── use-poll.ts
│   ├── types.ts
│   └── utils.ts
├── middleware.ts
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── firestore.indexes.json
├── firestore.rules
└── README.md
```

---

## 6. SECURITY

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: only read own profile, create on register
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
    }

    // Polls: complex access control
    match /polls/{pollId} {
      // Anyone authenticated can read public non-draft polls
      // Private polls: only creator or invitees
      allow read: if request.auth != null && (
        resource.data.visibility == 'public' && resource.data.status != 'draft' ||
        resource.data.creatorId == request.auth.uid ||
        request.auth.uid in resource.data.inviteeIds
      );
      // Only creator can write (but Server Actions handle all writes via Admin SDK)
      allow write: if false; // All writes go through Admin SDK

      // Votes subcollection
      match /votes/{odal odal odal odal userId} {
        allow read: if request.auth != null && request.auth.uid == odal odal odal odal userId;
        allow write: if false; // Admin SDK only
      }

      // Invitations subcollection
      match /invitations/{inviteeId} {
        allow read: if request.auth != null &&
          get(/databases/$(database)/documents/polls/$(pollId)).data.creatorId == request.auth.uid;
        allow write: if false; // Admin SDK only
      }
    }

    // Share tokens: readable by any authenticated user
    match /shareTokens/{token} {
      allow read: if request.auth != null;
      allow write: if false; // Admin SDK only
    }
  }
}
```

> All write operations go through Server Actions using Firebase Admin SDK — this bypasses security rules and gives full control. Security rules are a second layer of defense for any direct Firestore access.

### Server-Side Access Check

```typescript
// lib/services/access.service.ts
export async function checkPollAccess(userId: string, poll: PollData): Promise<boolean> {
  // Creator always has access
  if (poll.creatorId === userId) return true;
  // Draft polls: creator only
  if (poll.status === 'draft') return false;
  // Public polls: any authenticated user
  if (poll.visibility === 'public') return true;
  // Private polls: check invitee list
  if (poll.visibility === 'private') {
    return poll.inviteeIds.includes(userId);
  }
  return false;
}
```

### Security Summary

| Concern | Implementation |
|---------|---------------|
| Password hashing | Firebase Auth scrypt (verifiable in Console) |
| Session | HTTP-only session cookie via `createSessionCookie` |
| Auth guard | `middleware.ts` verifies session cookie on every route |
| Write protection | All mutations via Admin SDK in Server Actions |
| Private poll access | `checkPollAccess()` called before every read/write |
| Vote integrity | Firestore transactions + doc ID = userId |
| Input validation | Zod schemas on client + server |
| CSRF | Built-in with Server Actions |
| Token security | `crypto.randomBytes(16).toString('base64url')` |

---

## 7. STATE MANAGEMENT

| Concern | Approach |
|---------|----------|
| Auth state | Firebase Auth `onAuthStateChanged` + session cookie |
| Poll lists | Server Components fetch via Admin SDK |
| Poll detail | Server Component fetch + client hydration for interactivity |
| Vote form | Local `useState` (radio/checkbox) |
| Create/Edit form | React Hook Form + Zod |
| Optimistic UI | `useTransition` + `revalidatePath` |
| Toasts | Sonner library |
| URL state | `searchParams` for filters/sort/page |
# Pollaris — Implementation Plan Part 2: Execution

## 8. 6-HOUR ROADMAP

| Phase | Time | Minutes | Deliverable |
|-------|------|---------|-------------|
| 0: Setup | 0:00–0:25 | 25 | Scaffold, Firebase, Tailwind |
| 1: Auth | 0:25–1:05 | 40 | Register, Login, Logout, Guards |
| 2: Poll CRUD | 1:05–2:05 | 60 | Create, Edit, Delete Drafts |
| 3: Lifecycle | 2:05–2:35 | 30 | Publish, Close, Auto-close |
| 4: Voting | 2:35–3:20 | 45 | Cast, Replace, Withdraw |
| 5: Results | 3:20–3:50 | 30 | Display + visibility rules |
| 6: Access | 3:50–4:20 | 30 | Private polls, Invitations |
| 7: Feeds | 4:20–5:05 | 45 | Feed, My Polls, Shared, Filters, Pagination |
| 8: Share URLs | 5:05–5:20 | 15 | Token resolution, copy link |
| 9: Polish | 5:20–6:00 | 40 | Dark mode, README, final commits |

---

### Phase 0: Setup (25 min) — `chore: project scaffold`

```bash
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
npm install firebase firebase-admin zod react-hook-form @hookform/resolvers sonner nanoid
```

Do immediately:
1. Create `lib/firebase/config.ts` with Firebase config
2. Create `lib/firebase/client.ts` — `initializeApp`, `getAuth`, `getFirestore`
3. Create `lib/firebase/admin.ts` — Admin SDK init with service account
4. Create `middleware.ts` — verify session cookie, redirect unauthenticated
5. Create `app/api/auth/session/route.ts` — POST to create session cookie
6. Set up `.env.local` with Firebase keys
7. **GIT COMMIT**

### Phase 1: Auth (40 min) — `feat: authentication`

Build order:
1. `lib/validators/auth.schema.ts` — Zod schemas
2. `lib/actions/auth.actions.ts` — signUp (creates Firebase user + Firestore user doc)
3. `app/(auth)/layout.tsx` — centered card layout
4. `components/auth/sign-up-form.tsx` — registration form
5. `app/(auth)/sign-up/page.tsx`
6. `components/auth/sign-in-form.tsx` — login form  
7. `app/(auth)/sign-in/page.tsx`
8. Test: register → login → verify session → logout → blocked from dashboard
9. **GIT COMMIT**

Key pattern:
```typescript
// Sign up flow
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
// Create Firestore user doc
await adminDb.collection('users').doc(userCredential.user.uid).set({
  uid: userCredential.user.uid, name, email, createdAt: FieldValue.serverTimestamp()
});
```

### Phase 2: Poll CRUD (60 min) — `feat: poll creation and drafts`

Build order:
1. `lib/validators/poll.schema.ts` — Zod schema
2. `lib/actions/poll.actions.ts` — createPoll, updatePoll, deletePoll
3. `app/(dashboard)/layout.tsx` — sidebar + header
4. `components/polls/poll-form.tsx` — dynamic options add/remove
5. `app/(dashboard)/polls/new/page.tsx`
6. `components/polls/poll-card.tsx`
7. `app/(dashboard)/my-polls/page.tsx`
8. `app/(dashboard)/polls/[id]/edit/page.tsx`
9. Test: create → edit → delete draft
10. **GIT COMMIT**

Key pattern (share token):
```typescript
import crypto from 'crypto';
const shareToken = crypto.randomBytes(16).toString('base64url');
// Create poll + shareToken lookup atomically
const batch = adminDb.batch();
const pollRef = adminDb.collection('polls').doc();
batch.set(pollRef, { ...pollData, shareToken });
batch.set(adminDb.collection('shareTokens').doc(shareToken), { pollId: pollRef.id });
await batch.commit();
```

### Phase 3: Lifecycle (30 min) — `feat: poll lifecycle`

1. `publishPoll` — validate 2+ options, set status "open", lock fields
2. `closePoll` — set status "closed"
3. `extendPollEndAt` — validate newDate > now
4. Auto-close utility:
```typescript
async function getPollWithAutoClose(pollId: string) {
  const doc = await adminDb.collection('polls').doc(pollId).get();
  const poll = doc.data();
  if (poll?.status === 'open' && poll.endAt && poll.endAt.toDate() < new Date()) {
    await doc.ref.update({ status: 'closed', updatedAt: FieldValue.serverTimestamp() });
    return { ...poll, status: 'closed' };
  }
  return poll;
}
```
5. Status badges (Draft=amber, Open=green, Closed=red)
6. **GIT COMMIT**

### Phase 4: Voting (45 min) — `feat: voting system`

1. `lib/validators/vote.schema.ts`
2. `lib/actions/vote.actions.ts` — castVote, withdrawVote
3. `components/polls/vote-form.tsx` — radio (single) / checkboxes (multi)

Key pattern (atomic vote with transaction):
```typescript
export async function castVote(pollId: string, optionIds: string[]) {
  const userId = await getAuthUserId();
  await adminDb.runTransaction(async (tx) => {
    const pollRef = adminDb.collection('polls').doc(pollId);
    const pollDoc = await tx.get(pollRef);
    const poll = pollDoc.data();
    
    // Validate: poll is open, user has access, correct option count
    if (poll.status !== 'open') throw new Error('Poll is not open');
    if (poll.type === 'single' && optionIds.length !== 1) throw new Error('Select exactly one');
    if (poll.type === 'multi' && optionIds.length < 1) throw new Error('Select at least one');
    
    const voteRef = pollRef.collection('votes').doc(userId);
    const existingVote = await tx.get(voteRef);
    
    // Build updated option vote counts
    const options = [...poll.options];
    if (existingVote.exists) {
      // Decrement old selections
      existingVote.data().selectedOptionIds.forEach(oldId => {
        const opt = options.find(o => o.id === oldId);
        if (opt) opt.voteCount = Math.max(0, opt.voteCount - 1);
      });
    }
    // Increment new selections
    optionIds.forEach(newId => {
      const opt = options.find(o => o.id === newId);
      if (opt) opt.voteCount += 1;
    });
    
    const totalRespondents = existingVote.exists 
      ? poll.totalRespondents  // replacing vote, same respondent count
      : poll.totalRespondents + 1;
    
    tx.set(voteRef, { userId, selectedOptionIds: optionIds, votedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    tx.update(pollRef, { options, totalRespondents, updatedAt: FieldValue.serverTimestamp() });
  });
}
```

4. Withdraw vote (similar transaction, decrement counts, delete vote doc, totalRespondents - 1)
5. Show "Your vote" indicator
6. **GIT COMMIT**

### Phase 5: Results (30 min) — `feat: results display`

1. `components/polls/poll-results.tsx` — horizontal bars with percentages
2. Results-visibility logic:
```typescript
function canSeeResults(poll, userId, hasVoted) {
  if (poll.status === 'closed') return true;
  if (poll.creatorId === userId) return true;
  if (poll.resultsVisibility === 'always') return true;
  if (poll.resultsVisibility === 'after_voting' && hasVoted) return true;
  return false;
}
```
3. "Vote to see results" prompt
4. Percentage calculation (single: sum to 100%, multi: per-respondent)
5. **GIT COMMIT**

### Phase 6: Access Control & Invitations (30 min) — `feat: private polls and invitations`

1. `lib/services/access.service.ts` — checkPollAccess
2. `lib/actions/invite.actions.ts` — inviteUser, revokeInvitation
3. Invite by email:
```typescript
export async function inviteUser(pollId: string, email: string) {
  const userId = await getAuthUserId();
  const poll = await getPoll(pollId);
  if (poll.visibility !== 'private') throw new Error('Can only invite to private polls');
  if (poll.creatorId !== userId) throw new Error('Only creator can invite');
  
  // Find user by email
  const userSnap = await adminDb.collection('users').where('email', '==', email).limit(1).get();
  if (userSnap.empty) throw new Error('No registered user with that email');
  const invitee = userSnap.docs[0];
  
  const batch = adminDb.batch();
  batch.update(adminDb.collection('polls').doc(pollId), {
    inviteeIds: FieldValue.arrayUnion(invitee.id)
  });
  batch.set(adminDb.collection('polls').doc(pollId).collection('invitations').doc(invitee.id), {
    inviteeId: invitee.id, inviteeEmail: email, invitedBy: userId, invitedAt: FieldValue.serverTimestamp()
  });
  await batch.commit();
}
```
4. `components/invitations/invite-form.tsx` + `invitee-list.tsx`
5. "No access" page (doesn't reveal poll details)
6. **GIT COMMIT**

### Phase 7: Feeds & Filtering (45 min) — `feat: feeds, filters, pagination`

1. `app/(dashboard)/feed/page.tsx` — public feed
```typescript
// Server Component
async function getPublicFeed(status?, sortBy = 'createdAt', sortOrder = 'desc', cursor?, pageSize = 20) {
  let query = adminDb.collection('polls')
    .where('visibility', '==', 'public')
    .where('status', 'in', status ? [status] : ['open', 'closed'])
    .orderBy(sortBy, sortOrder)
    .limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  return query.get();
}
```
2. `components/polls/poll-filters.tsx` — status filter, sort dropdown
3. `components/ui/pagination.tsx` — cursor-based (Next/Prev)
4. `app/(dashboard)/my-polls/page.tsx` — `where('creatorId', '==', userId)`
5. `app/(dashboard)/shared/page.tsx` — `where('inviteeIds', 'array-contains', userId)`
6. **GIT COMMIT**

### Phase 8: Share URLs (15 min) — `feat: shareable URLs`

1. `app/(dashboard)/polls/s/[token]/page.tsx`:
```typescript
const tokenDoc = await adminDb.collection('shareTokens').doc(token).get();
if (!tokenDoc.exists) return notFound();
redirect(`/polls/${tokenDoc.data().pollId}`);
```
2. `components/polls/share-link.tsx` — copy button with toast
3. **GIT COMMIT**

### Phase 9: Polish + README (40 min)

**UI Polish (15 min):** `style: UI polish and dark mode`
- Dark/light mode toggle (CSS variables + localStorage)
- Loading states, empty states, error boundaries
- Mobile responsive sidebar (hamburger menu)

**README (25 min):** `docs: comprehensive README`
- Use template from Section 11 below

---

## 9. UI/UX DIRECTION

### Color Palette
```css
--background: #0a0a0f;
--card: #12121a;
--border: #2a2a3a;
--primary: #6366f1;      /* Indigo */
--primary-hover: #818cf8;
--status-draft: #f59e0b;  /* Amber */
--status-open: #22c55e;   /* Green */
--status-closed: #ef4444; /* Red */
--foreground: #f1f5f9;
--muted: #94a3b8;
```

### Typography
- **Font:** Inter (Google Fonts) — 400/600/700 weights
- Import in `layout.tsx` via `next/font/google`

### Dashboard Layout
```
┌──────────────────────────────────────┐
│ Logo          Search     User Menu   │
├──────┬───────────────────────────────┤
│ Feed │  Filter bar + Sort            │
│ Mine │  ┌──────┐ ┌──────┐ ┌──────┐  │
│ Shrd │  │ Card │ │ Card │ │ Card │  │
│      │  └──────┘ └──────┘ └──────┘  │
│ +New │  Pagination                   │
└──────┴───────────────────────────────┘
```

### Mobile: Sidebar collapses to hamburger. Cards stack single-column.

---

## 10. GIT COMMIT STRATEGY

```
chore: project scaffold with Next.js and Firebase
feat: user registration and authentication
feat: poll creation and draft management
feat: poll lifecycle (publish, close, auto-close)
feat: voting system with single and multi choice
feat: results display with visibility rules
feat: private polls and invitation system
feat: public feed, my polls, shared with me, filters and pagination
feat: shareable poll URLs
style: UI polish and dark mode
docs: comprehensive README
```

**Rules:** Commit after EVERY phase. Min 10 commits. Each commit = working state.

---

## 11. README TEMPLATE

```markdown
# Pollaris — Online Polling Platform

## Setup & Run Instructions

### Prerequisites
- Node.js 18+, npm
- A Firebase project with Auth + Firestore enabled

### Quick Start
git clone <repo>
cd pollforge
npm install
cp .env.example .env.local
# Fill in Firebase config values in .env.local
npm run dev
# Open http://localhost:3000

### Environment Variables
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=   # base64 encoded service account JSON
NEXTAUTH_SECRET=                # any random string for session encryption

## Tech Stack & Rationale

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 App Router | Server Actions, RSC, zero API boilerplate |
| Auth | Firebase Auth | Managed auth with scrypt hashing (see below) |
| Database | Firestore | Real-time capable, auto-scaling, transactions |
| Styling | Tailwind CSS | Rapid development, consistent design |
| Validation | Zod | Runtime type validation, client + server |

### Password Hashing (FR5, AC1)
Firebase Auth hashes all passwords using a hardened version of **scrypt** with
project-specific salts. scrypt is explicitly listed in FR5 as acceptable alongside
bcrypt and argon2. Passwords are never stored in plaintext or reversibly encrypted.

**Verification:** Firebase Console → Authentication → Users → ⋮ → Password Hash
Parameters → Shows `algorithm: SCRYPT`, `base64_signer_key`, `rounds`, `mem_cost`.

### Why Firestore?
- Transactions enforce atomic vote operations (one-vote-per-user)
- Document ID = userId for votes = physical uniqueness constraint
- array-contains queries power "Shared with me" view efficiently
- Auto-scales without configuration
- Data persists without any infrastructure management (AC25)

## Architectural Overview
Three-layer architecture:
1. **Presentation** — React Server/Client Components in app/ directory
2. **Business Logic** — Server Actions (lib/actions/) + Services (lib/services/)
3. **Data** — Firestore via Admin SDK, with Zod validation at boundaries

All write operations use Firebase Admin SDK through Server Actions (never client-side writes).
Read operations use Server Components with Admin SDK for access-controlled data.

## How AI Tools Were Used
- **Tool:** [Your AI tool]
- **AI-Generated:** Component boilerplate, Zod schemas, Tailwind styling
- **AI-Assisted:** Firestore transaction logic, access control service
- **Hand-Written:** Core vote transaction logic, results-visibility algorithm
- **Reviewed/Edited:** All AI output reviewed for correctness and edge cases

## Assumptions
- Firebase project is pre-configured (Auth + Firestore enabled)
- All users same timezone for end-at display
- Share tokens use crypto.randomBytes (22-char base64url)
- Cursor-based pagination (not offset) for Firestore compatibility

## Trade-offs
- **Denormalized vote counts** on poll doc — trades storage for query speed
- **No real-time listeners** — page reload refreshes data (per spec)
- **Embedded options array** vs subcollection — simpler reads, max ~100 options
- **Client-side auth state + server session cookie** — dual verification for security

## Future Work
- Real-time result updates via Firestore listeners
- Email notifications for invitations
- Chart visualizations (Chart.js/Recharts)
- Rate limiting via Cloud Functions
- E2E tests with Playwright
- Docker containerization
```

---

## 12. DEMO SCRIPT (5 min)

**Elevator Pitch (30s):**
> "Pollaris is a polling platform where authenticated users create single or multi-choice polls with full lifecycle management. It enforces strict access control — private polls are invisible even with the URL — and guarantees one-vote-per-user at the database level. Built with Next.js and Firebase in 6 hours."

**Act 1 — Auth (1 min):** Register Alice + Bob. Show Firebase Console → Password Hash Parameters → scrypt verified.

**Act 2 — Create & Publish (1 min):** Alice creates public single-choice poll. Edit draft. Publish. Show fields locked.

**Act 3 — Voting (1.5 min):** Alice votes. Bob votes from feed. Bob changes vote → counts correct. Bob withdraws → counts decrement.

**Act 4 — Private Poll (1.5 min):** Alice creates private poll. Bob can't access (even with URL). Alice invites Bob. Bob sees in "Shared with me". Alice revokes → Bob blocked.

**Act 5 — Architecture (30s):** Show Firestore data, vote doc ID = userId, git log.

**Contingency:** If anything breaks, show git log + Firestore Console + explain the fix.

---

## 13. WHAT NOT TO WASTE TIME ON

| Skip | Why |
|------|-----|
| Websockets/real-time | Explicitly not required |
| Email notifications | Not required |
| Complex animations | Secondary to correctness |
| Unit test suite | Nice but not evaluated |
| CI/CD | Local-run only |
| Deployment | Not required |
| Perfect pixel UI | Correctness > polish |

## 14. MAXIMUM IMPACT MOVES

| Do This | Why |
|---------|-----|
| Show bcrypt/scrypt verification in Console | Proves FR5 awareness |
| Show vote doc ID = userId | Proves DB-level uniqueness |
| Meaningful git history | Shows engineering process |
| Great README | Shows communication |
| Dark mode | 15 min for huge visual impact |
| Status badges with colors | Instant polish |
| Clear error messages | Shows UX maturity |

## 15. AC CHECKLIST

- [ ] AC1: Register/login/logout. Password hashed (scrypt).
- [ ] AC2: Unauthenticated blocked.
- [ ] AC3: Create Draft with all fields.
- [ ] AC4: Stable share URL with unguessable token.
- [ ] AC5: Edit Draft fields.
- [ ] AC6: Delete Draft.
- [ ] AC7: Publish locks options/type/visibility.
- [ ] AC8: Extend end-at (not shorten). Manual close.
- [ ] AC9: Auto-close on expiry. Closed = read-only.
- [ ] AC10: Public poll in feed + accessible via URL.
- [ ] AC11: Private poll NOT in feed.
- [ ] AC12: Non-invitee blocked (no detail leak).
- [ ] AC13: Invite by email → "Shared with me".
- [ ] AC14: Revoke → access removed (vote kept).
- [ ] AC15: Can't invite to public. Can't invite unregistered.
- [ ] AC16: Single-choice = exactly one.
- [ ] AC17: Multi-choice = one or more.
- [ ] AC18: Re-vote replaces.
- [ ] AC19: Withdraw → non-voter. Counts decrement.
- [ ] AC20: "Always visible" → results shown.
- [ ] AC21: "After voting" → vote first. Creator always sees. All see after close.
- [ ] AC22: Correct counts/percentages.
- [ ] AC23: No vote tampering or viewing others' votes.
- [ ] AC24: Feeds show correct entries. Filters/sort/pagination work.
- [ ] AC25: Data persists after restart.
