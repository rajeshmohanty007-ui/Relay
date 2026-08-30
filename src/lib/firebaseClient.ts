import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);

declare global {
  // eslint-disable-next-line no-var
  var __firestoreEmulatorConnected: boolean | undefined;
}

// Guarded so Next.js Fast Refresh re-executing this module doesn't attempt
// to connect an already-connected Firestore instance to the emulator again.
if (process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR === 'true' && !globalThis.__firestoreEmulatorConnected) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  globalThis.__firestoreEmulatorConnected = true;
  console.log('[firebaseClient] Connected to Firestore emulator at localhost:8080');
}
