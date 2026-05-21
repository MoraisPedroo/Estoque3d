import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Provided by the user. Safe to ship to the client — Firebase config is public by design.
const firebaseConfig = {
  apiKey: 'AIzaSyD0S9BxHamH7S1UopfkIIgKyog9-i52NWs',
  authDomain: 'niver-30b9b.firebaseapp.com',
  projectId: 'niver-30b9b',
  storageBucket: 'niver-30b9b.firebasestorage.app',
  messagingSenderId: '616173276897',
  appId: '1:616173276897:web:3960ce3ad7fcb83703b1a0',
  measurementId: 'G-8Y9EWG3DPZ',
} as const;

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

/** Lazily create (or reuse) the Firebase app — SSR-safe (returns null on server). */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (appInstance) return appInstance;
  appInstance = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  return appInstance;
}

export function getDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  dbInstance = getFirestore(app);
  return dbInstance;
}

/** Initialise Analytics only in supported browser environments — fails silently otherwise. */
export async function initAnalytics(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    if (await isSupported()) {
      const app = getFirebaseApp();
      if (app) getAnalytics(app);
    }
  } catch {
    /* analytics is optional — ignore */
  }
}
