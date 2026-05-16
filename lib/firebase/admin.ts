import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // During build time (e.g. Docker), env vars might be undefined. 
    // This allows build to pass without crashing on export.
    if (process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // formatted private key replacing literal \n with newlines
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      admin.initializeApp({ projectId: 'demo-project' });
    }
  } catch (error: any) {
    console.log('Firebase Admin Initialization Error', error.stack);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();