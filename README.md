# 📊 Pollaris (by PalTech) - Online Polling Platform

An enterprise-grade, secure, and intuitive online polling platform designed to help teams and communities gather structured input effortlessly. Ditch the noisy chat threads and back-and-forth emails. With **Pollaris**, create single or multi-choice polls, set strict visibility rules (Public vs. Private), manage invitees, and make data-driven decisions securely.

---

## 🚀 Setup & Run Instructions

Any beginner or reviewer can clone this repository and run the app locally in just a few minutes. We fully support native Node.js running as well as **Docker containerization**.

### 1. Prerequisites
- Node.js (v18+ recommended) OR **Docker** & **Docker Compose** installed.
- A Firebase project with Firestore and Authentication (Email/Password) enabled.

### 2. Environment Variables (Required)
You **must** create a `.env.local` file in the root directory before running the app. 
Inside your Firebase Console, grab your client web config and an Admin SDK service account key.

Create `.env.local` exactly like this:
```env
# Client Config
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_auth_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

# Admin SDK Config
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_CLIENT_EMAIL="your_client_email"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----"
```
*(Make sure the private key is properly formatted with `\n` or enclosed in quotes).*

### 3. Start the Application

**Option A: Using Docker (Recommended for Beginners)**
Throw away dependency worries. Just run:
```bash
# Clone the repository
git clone https://github.com/Renukabhargavi/PalTech.git
cd PalTech

# Ensure .env.local is created as shown above, then start docker:
docker compose --env-file .env.local up --build
```

**Option B: Using Node.js natively**
```bash
git clone https://github.com/Renukabhargavi/PalTech.git
cd PalTech
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You will be greeted by the PalTech landing page.

---

## 🏗️ Tech Stack & Rationale

- **Framework:** Next.js 15 (App Router). Chosen for its robust Server Actions, which allow executing secure server-side logic (e.g., atomic voting transactions) without building a separate API layer. It also enables easy middleware-based route protection.
- **Database:** Firebase Firestore (NoSQL). Chosen because it natively supports complex document structures and atomic transactions. Polls, options, and vote counts require atomic increments to ensure strict data consistency during concurrent voting.
- **Authentication & Security:** Firebase Authentication. Passwords are inably stored and hashed securely out-of-the-box by Google's infrastructure using **scrypt**. The custom Next.js `proxy.ts` (middleware) handles session cookie validation, ensuring robust protection of all private routes.
- **Styling:** Tailwind CSS. Chosen for rapid, maintainable UI development directly alongside components, keeping the interface clean and enterprise-ready.

---

## 🗺️ Architectural Overview

The application is structured cleanly balancing modularity and serverless design:

- **`app/page.tsx`**: Public landing page featuring PalTech corporate branding.
- **`app/(auth)/*`**: Contains `/sign-in` and `/sign-up` forms. They use URL parameters (`?redirect=...`) to seamlessly bounce users back to private poll links after authentication. All wrapped in React Suspense boundaries.
- **`app/(dashboard)/*`**: Layout and views for the core authenticated experience:
  - `/feed` (Public Polls)
  - `/my-polls` (Creator Dashboard)
  - `/shared` (Private Invites & Notifications)
- **`app/p/[token]` & `app/(dashboard)/poll/[pollId]`**: The dynamic route resolution for voting and managing specific polls.
- **`components/*`**: Highly reusable UI components, isolated into logical domains (e.g., `auth`, `polls`, `layout`).
- **`lib/actions/*`**: The Next.js Server Actions. This is the "Backend" where all DB mutations (Create Poll, Vote, Invite User) run securely via the Firebase Admin SDK.
- **`proxy.ts`**: The edge gatekeeper ensuring no unauthenticated user can access the app.

---

## 🤖 How AI Tools Were Used

This project heavily utilized **GitHub Copilot** alongside **Gemini 3.1 Pro (Preview)** to rapidly accelerate development within the tight 6-hour hackathon time-box. 

- **AI-Generated:** Initial component scaffolding, robust Tailwind CSS layouts (like the PalTech landing page), boilerplate using `zod`, and the entire `Dockerfile` for seamless deployment.
- **AI-Assisted:** Intricate Next.js server actions handling Firestore atomic transactions and async state logic. AI implemented the specific hackathon constraints like the "one-vote-per-user-per-poll" algorithms exactly according to spec.
- **Hand-Written / Deeply Reviewed:** The custom `proxy.ts` routing to tackle breaking API changes in Next.js 15 middleware, and deep verification of security flaws (like forbidding un-creators to edit drafts).

---

## 🧠 Assumptions

- No complex multi-tenant separation is needed; users act as individuals within one large global community.
- Real-time websockets (live vote updates) are specified as out-of-scope; votes refresh cleanly on page load.
- Modern browsers are expected where standard cookie-based authentication functions normally.

---

## ⚖️ Trade-offs

- **Extremely advanced D3 Visualizations:** For rapid delivery, we built custom, responsive HTML/CSS bar charts that inline natively, rather than importing massive visualization libraries.
- **Complex Background Scheduling:** Auto-closing is handled intelligently "on read/write" to avoid needing expensive CRON job billing just for a hackathon demo.

---

## 🔮 Bonus Features Accomplished

We meticulously completed the "Optional" Hackathon requirements:
1. **Containerization:** Deployed a lean, multi-stage `Dockerfile` and `docker-compose.yml`.
2. **CSV Exporting:** Implemented a secure client-side CSV generator for results access.
3. **Bulk Email Inviting:** Enabled pasting comma-separated emails to fire batch invites securely.
4. **Notifications Placeholder:** Utilizing the 'Shared With Me' grid dynamically respects recent invites.
5. **Dark Mode Safe-Lock:** Forced strict light-mode rendering ensuring OS-level dark theme doesn't magically break contrast ratios for the judges.
