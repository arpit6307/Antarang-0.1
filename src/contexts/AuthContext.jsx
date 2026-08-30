import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to ensure user doc exists in Firestore on registration/sign-in
  const ensureUserDocument = async (firebaseUser, additionalData = {}) => {
    if (!firebaseUser) return null;
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const initialUserData = {
          uid: firebaseUser.uid,
          displayName: additionalData.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || null,
          theme: 'dark',
          onboardingCompleted: false,
          createdAt: serverTimestamp(),
          ...additionalData,
        };
        await setDoc(userRef, initialUserData, { merge: true });
        return initialUserData;
      }

      return userSnap.data();
    } catch (err) {
      console.warn('Firestore user document setup warning:', err);
      return null;
    }
  };

  const signUp = async (email, password, displayName = '') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    if (displayName) {
      try {
        await updateProfile(firebaseUser, { displayName });
      } catch (err) {
        console.warn('Profile update warning:', err);
      }
    }

    try {
      await ensureUserDocument(firebaseUser, {
        displayName: displayName || firebaseUser.displayName || email.split('@')[0],
      });
    } catch (err) {
      console.warn('Firestore initial doc warning:', err);
    }

    return userCredential;
  };

  const signIn = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    return await firebaseSignOut(auth);
  };

  const resetPassword = async (email) => {
    return await sendPasswordResetEmail(auth, email);
  };

  const verifyEmail = async () => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user found to send verification email.');
    }
    return await sendEmailVerification(auth.currentUser);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    verifyEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
