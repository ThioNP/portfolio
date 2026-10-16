import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';

export interface FirebaseConfigData {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const FIREBASE_CONFIG_STORAGE_KEY = 'portfolio_cms_firebase_config_v1';

export function getEnvFirebaseConfig(): FirebaseConfigData | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: appId || ''
    };
  }
  return null;
}

export function getSavedFirebaseConfig(): FirebaseConfigData | null {
  const envConfig = getEnvFirebaseConfig();
  if (envConfig) return envConfig;

  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirebaseConfigData;
    if (parsed.apiKey && parsed.projectId) {
      return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function saveRuntimeFirebaseConfig(config: FirebaseConfigData): void {
  localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function clearRuntimeFirebaseConfig(): void {
  localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

export function getFirebaseInstances(): {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
} | null {
  const config = getSavedFirebaseConfig();
  if (!config) return null;

  try {
    if (!cachedApp) {
      cachedApp = getApps().length > 0 ? getApp() : initializeApp(config);
      cachedDb = getFirestore(cachedApp);
      cachedAuth = getAuth(cachedApp);
    }
    return {
      app: cachedApp!,
      db: cachedDb!,
      auth: cachedAuth!
    };
  } catch (err) {
    console.warn('Failed to initialize Firebase:', err);
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return getSavedFirebaseConfig() !== null;
}

export async function signInWithGoogle(): Promise<User> {
  const instances = getFirebaseInstances();
  if (!instances) throw new Error('Firebase is not configured yet.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(instances.auth, provider);
  return result.user;
}

export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const instances = getFirebaseInstances();
  if (!instances) throw new Error('Firebase is not configured yet.');
  const result = await signInWithEmailAndPassword(instances.auth, email, pass);
  return result.user;
}

export async function signOutAdmin(): Promise<void> {
  const instances = getFirebaseInstances();
  if (!instances) return;
  await firebaseSignOut(instances.auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  const instances = getFirebaseInstances();
  if (!instances) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(instances.auth, callback);
}
