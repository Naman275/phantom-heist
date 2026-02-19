// ============================================================
// Firebase Configuration
// ============================================================
// INSTRUCTIONS: Replace these values with YOUR Firebase project config.
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (free Spark plan works)
// 3. Add a Web app
// 4. Copy the config object here
// 5. Enable Authentication (Anonymous sign-in)
// 6. Enable Cloud Firestore

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB6OH4tFe3ypZCiROmmaUorpfi8RTsmvJg',
  authDomain: 'phantom-heist.firebaseapp.com',
  projectId: 'phantom-heist',
  storageBucket: 'phantom-heist.firebasestorage.app',
  messagingSenderId: '108186357382',
  appId: '1:108186357382:web:7066d7ef1fa7d625928b07',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return !firebaseConfig.apiKey.startsWith('YOUR_');
}

export function initFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  if (!isFirebaseConfigured()) {
    console.log('Firebase not configured — running in offline mode.');
    return null;
  }

  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
    }
    return { app: app!, auth: auth!, db: db! };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export function getFirebaseDB(): Firestore | null {
  return db;
}
