import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole, LoyaltyTier, PatientPriority, PatientStatus } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = undefined;
      }

      if (currentUser) {
        // Real-time profile listener
        const { onSnapshot } = await import('firebase/firestore');
        unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            const updatedUser = auth.currentUser;
            const isAdminEmail = currentUser.email === 'ynn.delro7@gmail.com';
            const isVerified = (updatedUser?.emailVerified) || isAdminEmail;
            
            // Sync verification status if local state differs
            if (data.emailVerified !== isVerified) {
              const { setDoc } = await import('firebase/firestore');
              await setDoc(doc(db, 'users', currentUser.uid), { emailVerified: isVerified }, { merge: true });
            }
            
            setProfile({ ...data, emailVerified: isVerified });
          } else {
            // Initialize profile if not found
            const isAdminEmail = currentUser.email === 'ynn.delro7@gmail.com';
            const newProfile: UserProfile = {
              userId: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Donor',
              photoURL: currentUser.photoURL || undefined,
              role: isAdminEmail ? UserRole.ADMIN : UserRole.DONOR,
              loyaltyTier: LoyaltyTier.BRONZE,
              totalContribution: 0,
              verifiedContributionsCount: 0,
              donationStreak: 0,
              emailVerified: currentUser.emailVerified || isAdminEmail,
              createdAt: new Date().toISOString(),
            };
            const { setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'users', currentUser.uid), newProfile);
            setProfile(newProfile);
          }
        });

        // --- Seeding Logic (Keep it simplified) ---
        if (currentUser.email === 'ynn.delro7@gmail.com') {
          const pCol = await getDocs(collection(db, 'patients'));
          if (pCol.empty) {
            console.log("Seeding initial data...");
            await addDoc(collection(db, 'patients'), {
              publicIdentifier: "CH-1082",
              fullName: "Secret Patient A",
              age: 6,
              diagnosis: "Acute Lymphoblastic Leukemia",
              treatmentPlan: "Chemotherapy Phase 2",
              priority: PatientPriority.CRITICAL,
              fundingGoal: 250000,
              fundingRaised: 42000,
              status: PatientStatus.ACTIVE,
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            });
            // ... (other seeding items)
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string, name: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, pass);
    // Profile is created in onAuthStateChanged effect, but we can set displayName here
    const profile: UserProfile = {
      userId: newUser.uid,
      email: newUser.email || '',
      displayName: name,
      role: UserRole.DONOR,
      loyaltyTier: LoyaltyTier.BRONZE,
      totalContribution: 0,
      verifiedContributionsCount: 0,
      donationStreak: 0,
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', newUser.uid), profile);
    await sendEmailVerification(newUser);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const sendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, login, 
      loginWithEmail, register, logout, 
      resetPassword, sendVerification 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
