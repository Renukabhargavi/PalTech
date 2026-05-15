# 📊 Pollaris (by PalTech) - Online Polling Platform

An enterprise-grade, secure, and intuitive online polling platform designed to help teams and communities gather structured input effortlessly. Ditch the noisy chat threads and back-and-forth emails. With **Pollaris**, create single or multi-choice polls, set strict visibility rules (Public vs. Private), manage invitees, and make data-driven decisions securely.

---

## 🚀 Setup & Run Instructions

Any reviewer can clone this repository and run the app locally in under 10 minutes.

### 1. Prerequisites
- Node.js (v18+ recommended)
- A Firebase project with Firestore and Authentication (Email/Password) enabled.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Renukabhargavi/PalTech.git
cd PalTech

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory. You can use the `.env.example` as a template.
You will need your Firebase client config and an Admin SDK service account key.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="your_private_key" # Support escaped newlines
```

### 4. Start the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. You will be greeted by the PalTech landing page.

---

## 🏗️ Tech Stack & Rationale

- **Framework:** Next.js 15 (App Router). Chosen for its robust Server Actions, which allow executing secure server-side logic (e.g., atomic voting transactions) without building a separate API layer. It also enables easy middleware-based route protection.
- **Database:** Firebase Firestore (NoSQL). Chosen because it natively supports complex document structures and atomic transactions. Polls, options, and vote counts require atomic increments to ensure strict data consistency during concurrent voting.
- **Authentication & Security:** Firebase Authentication. Passwords are inably stored and hashed securely out-of-the-box by Google's infrastructure using **scrypt**. The custom Next.js `middleware.ts` handles session cookie validation, ensuring robust protection of all private routes.
- **Styling:** Tailwind CSS. Chosen for rapid, maintainable UI development directly alongside components, keeping the interface clean and enterprise-ready.

---

## 🗺️ Architectural Overview

The application is structured cleanly balancing modularity and serverless design:

- **`app/page.tsx`**: Public landing page featuring PalTech corporate branding.
- **`app/(auth)/*`**: Contains `/sign-in` and `/sign-up` forms. They use URL parameters (`?redirect=...`) to seamlessly bounce users back to private poll links after authentication.
- **`app/(dashboard)/*`**: Layout and views for the core authenticated experience:
  - `/feed` (Public Polls)
  - `/my-polls` (Creator Dashboard)
  - `/shared` (Private Invites)
- **`app/p/[token]` & `app/(dashboard)/poll/[pollId]`**: The dynamic route resolution for voting and managing specific polls.
- **`components/*`**: Highly reusable UI components, isolated into logical domains (e.g., `auth`, `polls`, `layout`).
- **`lib/actions/*`**: The Next.js Server Actions. This is the "Backend" where all DB mutations (Create Poll, Vote, Invite User) run securely via the Firebase Admin SDK.
- **`middleware.ts`**: The edge gatekeeper ensuring no unauthenticated user can access the app.

---

## 🤖 How AI Tools Were Used

This project heavily utilized **GitHub Copilot** alongside **Gemini 3.1 Pro (Preview)** to rapidly accelerate development within the tight 6-hour hackathon time-box. 

- **AI-Generated:** Initial component scaffolding, robust Tailwind CSS layouts (like the PalTech landing page), and repetitive form-validation boilerplate using `zod`.
- **AI-Assisted:** The intricate Next.js server actions handling Firestore atomic transactions and batch writes. AI suggested transaction patterns that were then refined for exact business requirement matching (e.g., one-vote-per-user-per-poll constraints).
- **Hand-Written / Deeply Reviewed:** The `middleware.ts` routing, session cookie extraction, Next.js 15 `await params` asynchronous routing fixes, and edge-case UX flows (such as post-login URL redirects). The AI output was constantly audited to ensure absolute correctness of the poll lifecycle and visibility logic.

---

## 🧠 Assumptions

- No complex multi-tenant separation is needed; users act as individuals within one large global community.
- Real-time websockets (live vote updates) are out of scope as per requirements; votes refresh safely on page load.
- Users have modern browsers where standard cookie-based authentication functions normally (no strict cross-site tracking blockers breaking first-party sessions).

---

## ⚖️ Trade-offs

- **Frontend Sorting vs Composite Indexes:** Given the tight timeline, some collection views fetch broader slices of data from Firestore and handle complex multi-field sorting/filtering in-memory on the server before passing it to the client. This avoids requiring judges to run complex Firebase CLI index deployment scripts to boot the app locally.
- **Minimalistic Pagination:** Implemented as basic chunking. In an enterprise production setting, cursor-based pagination would be applied directly to the Firestore queries.
- **Visual Polish:** While the PalTech-themed landing page and forms are beautiful, highly complex D3 charting/visualizations for poll results were deprioritized in favor of robust, bulletproof voting state logic and strict visibility constraints (AC21, FR20).

---

## 🔮 Future Work

With more time, the platform could be enhanced with:
1. **Truly Anonymous Voting Architecture:** Separating user-identifying logic entirely into disjointed hashes to guarantee zero-knowledge votes while maintaining strict uniqueness.
2. **Advanced Result Analytics:** Exporting poll results to CSV format and rich graph visualizations.
3. **Draft Scheduling:** Allowing a user to create a Draft poll and schedule it to automatically transition to Open at a future timestamp.
4. **Bulk Email Importing:** Supporting CSV file uploads to rapidly invite large teams to private polls.
