import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';
import { checkIsAdmin, fetchUserPrivate, fetchUserProfile } from '../services/communityService';
import { refreshUserVerification } from '../services/authService';
import { UserPrivate, UserProfile } from '../types/domain';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  privateData: UserPrivate | null;
  isAdmin: boolean;
  authLoading: boolean;
  profileLoading: boolean;
  unreadNotificationsCount: number;
  refreshProfile: () => Promise<void>;
  reloadVerificationStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privateData, setPrivateData] = useState<UserPrivate | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const loadUserData = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setProfile(null);
      setPrivateData(null);
      setIsAdmin(false);
      setUnreadNotificationsCount(0);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const [userProfile, userPriv, adminStatus] = await Promise.all([
        fetchUserProfile(firebaseUser.uid),
        fetchUserPrivate(firebaseUser.uid),
        checkIsAdmin(firebaseUser.uid, firebaseUser.email, firebaseUser.emailVerified),
      ]);
      setProfile(userProfile);
      setPrivateData(userPriv);
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('Erro ao carregar dados do perfil:', err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      await loadUserData(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [loadUserData]);

  // Listener em tempo real apenas quando autenticado e verificado
  useEffect(() => {
    if (authLoading || !user || !user.emailVerified || !profile) {
      setUnreadNotificationsCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUnreadNotificationsCount(snapshot.size);
      },
      (error) => {
        // Trata erros de permissão com contexto estruturado
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    return () => unsubscribe();
  }, [authLoading, user, profile]);

  const refreshProfile = useCallback(async () => {
    await loadUserData(auth.currentUser);
  }, [loadUserData]);

  const reloadVerificationStatus = useCallback(async () => {
    if (!auth.currentUser) return false;
    const verified = await refreshUserVerification(auth.currentUser);
    // Atualiza referência do usuário após reload()
    setUser(auth.currentUser ? ({ ...auth.currentUser } as User) : null);
    if (verified) {
      await loadUserData(auth.currentUser);
    }
    return verified;
  }, [loadUserData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        privateData,
        isAdmin,
        authLoading,
        profileLoading,
        unreadNotificationsCount,
        refreshProfile,
        reloadVerificationStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }
  return ctx;
}
