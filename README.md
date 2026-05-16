<div align="center">
  
  <h1>📊 Pollaris</h1>
  <p><strong>A secure, robust, and highly structured online polling platform.</strong></p>

  [![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

<br />

## 🎯 The Vision

Teams frequently need quick, structured input—but group chats get messy, and opinions get lost, double-counted, or quietly ignored. **Pollaris** solves this by providing a secure polling environment. It perfectly enforces vote integrity (one-vote-per-user), offers granular access controls (Public vs. Invite-Only), and precisely manages poll lifecycles.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🚦 Lifecycle Management** | Strict state machines: **Draft** (editable) ➔ **Open** (locked options, voting active) ➔ **Closed** (read-only). |
| **🛡️ Granular Access Control** | **Public** polls appear in the feed. **Private** polls are exclusively accessible to explicit invitees—guessing the URL won't work. |
| **⚖️ Transactional Voting** | Vote integrity is guaranteed using database-level ACID transactions. Users seamlessly replace or withdraw votes without inflating counts or causing race conditions. |
| **🙈 Bias Prevention** | Creators can set results to be **"Visible only after voting"** to prevent the bandwagon effect and anchor bias. |
| **📈 Dynamic Visualizations** | Results are rendered via Recharts, correctly calculating complex Multi-Choice respondent percentages. |

---

## 🚀 Quick Start & Deployment

You can get this project up and running locally in under a few minutes.

### 📋 Prerequisites
- **Node.js** 20.9+
- A **Firebase project** (Auth & Firestore enabled)
- A **Firebase Admin** service account

### 🔐 Environment Variables
Create a `.env.local` file in the root of the project:

```env
# Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_auth_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

# Admin SDK Credentials
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_CLIENT_EMAIL="your_service_account_email"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### 💻 Run Locally
```bash
git clone https://github.com/Renukabhargavi/PalTech.git
cd PalTech
npm install
npm run dev
```
Open your browser to `http://localhost:3000` 🎉

### 🐳 Docker (Production Ready)
This repository includes a highly optimized, multi-stage Docker build perfectly tailored for Next.js standalone output.
```bash
docker compose --env-file .env.local up --build
```

---

## 🛠️ Tech Stack & Engineering Rationale

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
  - *Why:* Unmatched for building secure, authenticated product flows. Combining Server Components with Server Actions keeps sensitive logic and database credentials completely out of the client bundle.
- **Auth & Security:** [Firebase Authentication](https://firebase.google.com/docs/auth)
  - *Why:* Defends against credential stuffing and ensures compliance. **Passwords are never stored in plaintext**—they are managed via Google’s industry-standard salted hashing infrastructure (e.g., scrypt).
- **Storage Layer:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
  - *Why:* A robust NoSQL document database that natively supports atomic *transactions*. This is critical to building a fault-tolerant polling system where users can replace votes concurrently without data corruption.
- **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/) & [Recharts](https://recharts.org/)
  - *Why:* Delivers an exceptionally clean, responsive, and data-rich user experience rapidly.

---

## 🏗️ Architectural Overview

The codebase is strictly modular, adhering to clean architecture principles:

```text
📦 app
 ┣ 📂 (auth)          # Authentication flows (Sign In / Sign Up)
 ┣ 📂 (dashboard)     # Protected product areas (/feed, /my-polls, /shared)
 ┗ 📂 p/[token]       # Dynamic secure routing for shareable poll links
📦 components
 ┣ 📂 auth            # Credential forms
 ┣ 📂 polls           # Reusable UI (Export CSV, Poll Form, Share Links)
 ┗ 📂 ui              # Foundational design system elements
📦 lib
 ┣ 📂 actions         # Next.js Server Actions (Core business logic & DB mutations)
 ┣ 📂 firebase        # Client and Admin SDK singleton initialization
 ┗ 📂 validators      # Zod schemas for strict runtime payload validation
📄 proxy.ts           # Edge-level middleware protecting authenticated routes
```

---

## 🤖 AI Assisted Development

This project was built utilizing AI pair programmers (GitHub Copilot / ChatGPT/Claude models).

- **Leveraged for:** Rapid scaffolding of Tailwind UI components, boilerplate Zod validation setup, and drafting the initial transactional data models.
- **Hand-Written & Strictly Audited:** Total rewrite of the **access-control layer** to ensure Private polls are perfectly enforced on the server edge. Deeply verified the **lifecycle state-machine** (Draft → Open → Closed) to guarantee strict compliance with the business requirements.
- **Rejected:** AI-suggested "soft" read-restrictions were rejected in favor of hard server-action validations, proving that no user can bypass private poll security via direct API calls.

---

## 💭 Assumptions & Business Rules

1. **Authenticated Sandbox:** All voters must be fully authenticated. Anonymous voting is intentionally disabled to preserve identity attribution under the hood.
2. **Deterministic Discoverability:** A "Public" link dictates visibility on the team feed, but does not override authentication. A "Private" link is completely useless out of the hands of an invited user.
3. **Graceful Auto-Closure:** When a poll's end date passes, the poll safely auto-closes upon the next read/write request—avoiding the overhead of a dedicated chron job while remaining 100% accurate.
4. **Revocation Rules:** If a creator revokes an invite, the user immediately loses read/write access. However, to preserve data integrity, their previously cast historical vote remains anonymously counted.

---

## ⚖️ Trade-offs

Given the aggressive time-box constraints, the following deliberate architectural trade-offs were made:
- **In-Memory Filtering:** For the scope of this challenge, dataset list pages (like the Feed) handle final sorting and filtering in memory after a streamlined query. At enterprise scale, this would be shifted to explicit composite Firestore indexes.
- **Client-Side Refresh:** To minimize architectural complexity, poll results update upon page reload or user interaction, deliberately eschewing live WebSockets.

---

## 🔮 Future Roadmap

If provided additional runway, the following enterprise-grade enhancements would be implemented:
1. **Composite Database Indexing:** Transitioning array filtration entirely into Firestore to support lists containing millions of polls seamlessly.
2. **Automated E2E Testing:** Integrating Cypress or Playwright to rigorously simulate all state-machine transitions and edge-case access control violations.
3. **Bulk Onboarding:** Empowering poll creators to upload CSVs to invite hundreds of users instantly.
4. **Event-Driven Notifications:** Triggering emails or in-app toasts when a user is invited to a Private Poll.

<br />
<div align="center">
  <i>Built with extreme attention to data integrity and requirement constraints.</i>
</div>