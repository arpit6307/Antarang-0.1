import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDkozoBiRqpvEsrCNek_eO6HtU_uObu37o",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "antarang-b82b2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "antarang-b82b2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "antarang-b82b2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "870709645820",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:870709645820:web:cb9dbaf4b27215b356e279"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const storage = getStorage(app);
