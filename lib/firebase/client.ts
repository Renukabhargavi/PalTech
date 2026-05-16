import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

// Initialize Firebase for Client
// Use dummy strings if environment variables are missing during CI build phase
const sanitizedConfig = {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey || "mock-key",
  projectId: firebaseConfig.projectId || "mock-project",
};

const app = getApps().length > 0 ? getApp() : initializeApp(sanitizedConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };