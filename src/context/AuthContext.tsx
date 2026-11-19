import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_SCHOOL_NAME_LENGTH,
  UserProfile,
} from '../types/schoolStats';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileSettings: (updates: {
    schoolName: string;
    academicYear: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const ensureUserProfile = useCallback(async (firebaseUser: User) => {
    const profilePath = `users/${firebaseUser.uid}/private/profile`;
    const profileRef = doc(db, 'users', firebaseUser.uid, 'private', 'profile');

    let snapshot;
    try {
      snapshot = await getDoc(profileRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, profilePath);
    }

    const cleanDisplayName = (firebaseUser.displayName || 'School Administrator')
      .trim()
      .slice(0, MAX_DISPLAY_NAME_LENGTH) || 'School Administrator';
    const cleanEmail = (firebaseUser.email || '').trim().slice(0, 254);

    if (snapshot.exists()) {
      const data = snapshot.data();
      setProfile({
        uid: firebaseUser.uid,
        email: typeof data.email === 'string' ? data.email : cleanEmail,
        displayName:
          typeof data.displayName === 'string'
            ? data.displayName
            : cleanDisplayName,
        schoolName: typeof data.schoolName === 'string' ? data.schoolName : '',
        academicYear:
          typeof data.academicYear === 'string' &&
          /^[0-9]{4}-[0-9]{4}$/.test(data.academicYear)
            ? data.academicYear
            : '2025-2026',
      });
    } else if (cleanEmail) {
      const initialProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: cleanEmail,
        displayName: cleanDisplayName,
        schoolName: '',
        academicYear: '2025-2026',
      };
      try {
        await setDoc(profileRef, {
          ...initialProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setProfile(initialProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, profilePath);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthError(null);
      if (firebaseUser) {
        try {
          await ensureUserProfile(firebaseUser);
        } catch (err) {
          setAuthError(
            err instanceof Error
              ? err.message
              : 'មិនអាចផ្ទុកព័ត៌មានគណនីបានទេ។'
          );
        }
      } else {
        setProfile(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [ensureUserProfile]);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'ការចូលប្រើប្រាស់ត្រូវបានបោះបង់ ឬមានបញ្ហា។';
      setAuthError(msg);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
    setProfile(null);
  }, []);

  const updateProfileSettings = useCallback(
    async (updates: { schoolName: string; academicYear: string }) => {
      if (!user) return;
      const profilePath = `users/${user.uid}/private/profile`;
      const profileRef = doc(db, 'users', user.uid, 'private', 'profile');
      const cleanSchoolName = updates.schoolName
        .trim()
        .slice(0, MAX_SCHOOL_NAME_LENGTH);
      const cleanYear = /^[0-9]{4}-[0-9]{4}$/.test(updates.academicYear)
        ? updates.academicYear
        : '2025-2026';

      try {
        await updateDoc(profileRef, {
          schoolName: cleanSchoolName,
          academicYear: cleanYear,
          updatedAt: serverTimestamp(),
        });
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                schoolName: cleanSchoolName,
                academicYear: cleanYear,
              }
            : null
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, profilePath);
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authReady,
        signingIn,
        authError,
        signInWithGoogle,
        logout,
        updateProfileSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
