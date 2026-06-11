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
  checkVerification: () => Promise<boolean>;
}

const isUserAdmin = (email?: string | null, name?: string | null): boolean => {
  const e = (email || '').toLowerCase().trim();
  const n = (name || '').toLowerCase().trim();
  
  // Standardized normalized strings (no spaces, dots, hyphens or underscores)
  const normEmail = e.replace(/[\s\._-]/g, '');
  const normName = n.replace(/[\s\._-]/g, '');
  
  const isYnn = normEmail.includes('ynndelro7') || normEmail.includes('ynndelro') || e === 'ynn.delro7@gmail.com';
  const isChristian = normEmail.includes('orensechristianjohn') || e === 'orensechristianjohn@gmail.com';
  const isMystic = normEmail.includes('thenamystic') || e === 'thenamystic@gmail.com';
  
  // Match Raphael Santos / Raph Santos name or email parts flexibly
  const isRaphaelSantos = 
    e === 'raphsantos04@gmail.com' ||
    normEmail.includes('raphsantos04') ||
    normEmail.includes('raphsantos') ||
    normName.includes('raphaelsantos') || 
    normName.includes('raphsantos') ||
    (normName.includes('raphael') && normName.includes('santos')) ||
    (normName.includes('raph') && normName.includes('santos')) ||
    (normEmail.includes('raphael') && normEmail.includes('santos'));
  
  return isYnn || isChristian || isRaphaelSantos || isMystic;
};

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
            const isAdminEmail = isUserAdmin(currentUser.email, currentUser.displayName || data.displayName);
            const isVerified = (updatedUser?.emailVerified) || isAdminEmail;
            
            // Sync verification status & admin role if local state/identity says admin but DB says donor
            const needsRoleUpgrade = isAdminEmail && data.role !== UserRole.ADMIN;
            if (data.emailVerified !== isVerified || needsRoleUpgrade) {
              const { setDoc } = await import('firebase/firestore');
              await setDoc(doc(db, 'users', currentUser.uid), { 
                emailVerified: isVerified,
                role: isAdminEmail ? UserRole.ADMIN : data.role
              }, { merge: true });
            }
            
            setProfile({ ...data, emailVerified: isVerified, role: isAdminEmail ? UserRole.ADMIN : data.role });
          } else {
            // Initialize profile if not found
            const isAdminEmail = isUserAdmin(currentUser.email, currentUser.displayName);
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
    const isAdminEmail = isUserAdmin(email, name);
    // Profile is created in onAuthStateChanged effect, but we can set displayName here
    const profile: UserProfile = {
      userId: newUser.uid,
      email: newUser.email || '',
      displayName: name,
      role: isAdminEmail ? UserRole.ADMIN : UserRole.DONOR,
      loyaltyTier: LoyaltyTier.BRONZE,
      totalContribution: 0,
      verifiedContributionsCount: 0,
      donationStreak: 0,
      emailVerified: isAdminEmail,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', newUser.uid), profile);
    if (!isAdminEmail) {
      await sendEmailVerification(newUser);
    }
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

  const checkVerification = React.useCallback(async (): Promise<boolean> => {
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        const updatedUser = auth.currentUser;
        const isAdminEmail = isUserAdmin(updatedUser.email, updatedUser.displayName || profile?.displayName);
        const isVerified = updatedUser.emailVerified || isAdminEmail;
        
        if (isVerified) {
          const { setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'users', updatedUser.uid), { emailVerified: true }, { merge: true });
          if (profile) {
            setProfile({ ...profile, emailVerified: true });
          }
          return true;
        }
      } catch (error) {
        console.error("Error checking verification state:", error);
      }
    }
    return false;
  }, [profile]);

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, login, 
      loginWithEmail, register, logout, 
      resetPassword, sendVerification,
      checkVerification
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
