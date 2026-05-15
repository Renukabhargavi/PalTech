# Pollaris - Online Polling Platform

## Setup & Run Instructions

1. Clone the repository
2. Run `npm install`
3. Create a `.env.local` file matching `.env.example` with your Firebase configuration. You will need a Firebase project with Firestore and Firebase Authentication (Email/Password) enabled. Also provide the Firebase Admin SDK service account credentials.
4. Run `npm run dev`
5. Open `http://localhost:3000`

## Tech Stack & Rationale

- **Framework**: Next.js 15 (App Router). Chosen for rapid prototyping, built-in API routes, and Server Actions which streamline data mutations and form processing.
- **Styling**: Tailwind CSS & Lucide React. Chosen for utility-first styling and easy-to-grab icons without extensive custom CSS.
- **Database & Storage**: Firebase Firestore (NoSQL). Chosen for real-time capabilities and flexible document storage.
- **Authentication**: Firebase Authentication. Provides secure, out-of-the-box email/password registration and login. We use Firebase Admin SDK to handle server-side session cookies securely.

## Architectural Overview

- `app/(dashboard)`: Contains the authenticated views (Feed, My Polls, Shared With Me).
- `app/poll/[pollId]`: The public/private viewer for a single poll.
- `app/api/auth`: Next.js Route handlers for session cookie creation and deletion.
- `lib/actions`: Server Actions containing the core business logic (poll creation, voting transactions, invitations).
- `lib/firebase`: Firebase client and admin initialization.

## How AI Tools Were Used

GitHub Copilot and Gemini 3.1 Pro were used heavily to accelerate scaffolding. The AI generated the bulk of the initial UI components, Server Actions, and Firestore schema definitions. Most code was AI-generated but reviewed and tweaked to ensure proper handling of Next.js 15 async API updates and Firestore transaction safety.

## Assumptions

- Read/Write performance on Firebase is acceptable for the Hackathon scope without extensive caching.
- Sorting on the frontend (in memory) is acceptable instead of forcing the user to create complex Firestore composite indexes during local setup.

## Trade-offs

- Complex composite indexing in Firestore was skipped to avoid complex local setup overhead. Instead, we pull a subset of recent records and sort them in JavaScript (e.g. `Array.sort()`).
- Pagination was implemented minimally. For production, cursor-based pagination via Firestore would be robust.

## Future Work

- Fully implement Firestore cursor-based pagination for large datasets.
- Implement more robust caching using Next.js `unstable_cache`.
