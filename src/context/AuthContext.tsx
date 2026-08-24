import React, { createContext, useContext, useEffect, useState } from 'react';
import { browserSessionPersistence, setPersistence } from 'firebase/auth';
import { UserProfile, AuthState } from '../types';
import {
  auth,
  isFirebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  fbOnAuthStateChanged
} from '../config/firebase';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getFirebaseErrorMessage(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/invalid-email':
      return 'The email address is improperly formatted.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password authentication is not enabled in Firebase.';
    case 'auth/network-request-failed':
      return 'The authentication service could not be reached. Check your network connection.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured for this project.';
    default:
      return error instanceof Error && error.message ? error.message : fallback;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    const initializeAuth = async () => {
      if (!isFirebaseConfigured || !auth) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        await setPersistence(auth, browserSessionPersistence);
        if (!isMounted) return;

        unsubscribe = fbOnAuthStateChanged(auth, (firebaseUser) => {
          if (!firebaseUser) {
            setUser(null);
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL
            });
          }
          setLoading(false);
        });
      } catch (authError) {
        console.error('[ORBIT Auth Error]', authError);
        if (isMounted) {
          setError(getFirebaseErrorMessage(authError, 'Firebase Authentication could not be initialized.'));
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const clearError = () => setError(null);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase Authentication is not configured for this environment.');
      }
      await signInWithEmailAndPassword(auth, email, password);
    } catch (authError) {
      const message = getFirebaseErrorMessage(authError, 'Authentication failed. Please verify your credentials.');
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase Authentication is not configured for this environment.');
      }
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (authError) {
      const message = getFirebaseErrorMessage(authError, 'Account creation failed. Please check your details.');
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      if (auth) {
        await fbSignOut(auth);
      }
      setUser(null);
    } catch (authError) {
      const message = getFirebaseErrorMessage(authError, 'Sign out failed. Please try again.');
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, isConfigured: isFirebaseConfigured, signIn, signUp, signOut, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
