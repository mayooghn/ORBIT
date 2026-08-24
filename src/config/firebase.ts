import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';

/**
 * Utility to extract and sanitize runtime Vite environment variables.
 * Strips accidental wrapping quotes or leading/trailing whitespace,
 * and ensures no empty string or placeholder values are passed to the Firebase SDK.
 */
function sanitizeEnvValue(value: string | undefined): string | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  const sanitized = value.trim().replace(/^["']|["']$/g, '');
  if (!sanitized || sanitized === 'undefined' || sanitized === 'null' || sanitized.startsWith('MY_')) {
    return undefined;
  }
  return sanitized;
}

// Read and map each VITE_ variable to the correct Firebase field.
const rawApiKey = sanitizeEnvValue(import.meta.env.VITE_FIREBASE_API_KEY);
const rawAuthDomain = sanitizeEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
const rawProjectId = sanitizeEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID);
const rawStorageBucket = sanitizeEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
const rawMessagingSenderId = sanitizeEnvValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
const rawAppId = sanitizeEnvValue(import.meta.env.VITE_FIREBASE_APP_ID);

// Normalize authDomain to ensure it is valid (e.g. if user passes project id or full domain)
let normalizedAuthDomain = rawAuthDomain;
if (!normalizedAuthDomain && rawProjectId) {
  normalizedAuthDomain = `${rawProjectId}.firebaseapp.com`;
} else if (normalizedAuthDomain && !normalizedAuthDomain.includes('.')) {
  normalizedAuthDomain = `${normalizedAuthDomain}.firebaseapp.com`;
}

// Normalize storageBucket if omitted but projectId is provided
let normalizedStorageBucket = rawStorageBucket;
if (!normalizedStorageBucket && rawProjectId) {
  normalizedStorageBucket = `${rawProjectId}.firebasestorage.app`;
}

// These are the Firebase web configuration values required by Email/Password Auth.
const requiredFields = [
  { key: 'VITE_FIREBASE_API_KEY', value: rawApiKey },
  { key: 'VITE_FIREBASE_AUTH_DOMAIN', value: normalizedAuthDomain },
  { key: 'VITE_FIREBASE_PROJECT_ID', value: rawProjectId },
  { key: 'VITE_FIREBASE_APP_ID', value: rawAppId }
];

const missingRequiredVars = requiredFields
  .filter((field) => !field.value)
  .map((field) => field.key);

export const isFirebaseConfigured = missingRequiredVars.length === 0;
export const firebaseMissingConfigKeys = missingRequiredVars;

// Construct Firebase configuration with ONLY defined, non-empty values
const firebaseConfig: FirebaseOptions = {};
if (rawApiKey) firebaseConfig.apiKey = rawApiKey;
if (normalizedAuthDomain) firebaseConfig.authDomain = normalizedAuthDomain;
if (rawProjectId) firebaseConfig.projectId = rawProjectId;
if (normalizedStorageBucket) firebaseConfig.storageBucket = normalizedStorageBucket;
if (rawMessagingSenderId) firebaseConfig.messagingSenderId = rawMessagingSenderId;
if (rawAppId) firebaseConfig.appId = rawAppId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    const existingApps = getApps();
    app = existingApps.length > 0 ? getApp() : initializeApp(firebaseConfig);

    auth = getAuth(app);
  } catch (error) {
    console.error('[ORBIT Firebase] Error initializing Firebase App or Auth:', error);
  }
} else {
  console.warn(
    `[ORBIT Firebase Configuration Error] Missing required Firebase environment variables: ${missingRequiredVars.join(
      ', '
    )}. Please ensure these variables are defined in your environment settings.`
  );
}

export { 
  app, 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  fbSignOut, 
  fbOnAuthStateChanged
};
export type { FirebaseUser };
