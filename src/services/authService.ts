import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { isInstitutionalEmail, sanitizeText } from '../utils/validation';

export interface RegisterPayload {
  displayName: string;
  email: string;
  password: string;
  campus: string;
  course: string;
  year: string;
  acceptedTerms: boolean;
}

export interface OnboardingPayload {
  displayName: string;
  campus: string;
  course: string;
  year: string;
  acceptedTerms: boolean;
}

export async function createInitialUserDocs(
  user: User,
  data: {
    displayName: string;
    campus: string;
    course: string;
    year: string;
    acceptedTerms: boolean;
  }
): Promise<void> {
  const cleanName = sanitizeText(data.displayName);
  const email = (user.email || '').trim().toLowerCase();
  const batch = writeBatch(db);

  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'user_private', user.uid);

  batch.set(userRef, {
    id: user.uid,
    displayName: cleanName,
    campus: sanitizeText(data.campus),
    course: sanitizeText(data.course),
    year: sanitizeText(data.year || 'Prefiro não informar'),
    bio: '',
    avatarUrl: user.photoURL || '',
    showCampus: true,
    showCourse: true,
    showStats: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(privateRef, {
    id: user.uid,
    email,
    institutionalDomainVerified: isInstitutionalEmail(email),
    acceptedTerms: data.acceptedTerms,
    acceptedTermsAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function registerWithEmail(payload: RegisterPayload): Promise<User> {
  const cleanName = sanitizeText(payload.displayName);
  const email = payload.email.trim().toLowerCase();

  const credential = await createUserWithEmailAndPassword(auth, email, payload.password);
  await updateProfile(credential.user, { displayName: cleanName });

  await createInitialUserDocs(credential.user, {
    displayName: cleanName,
    campus: payload.campus,
    course: payload.course,
    year: payload.year,
    acceptedTerms: payload.acceptedTerms,
  });

  await sendEmailVerification(credential.user);
  return credential.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return credential.user;
}

export async function loginWithGoogle(): Promise<{ user: User; needsOnboarding: boolean }> {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;
  const userDocPath = `users/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    return {
      user,
      needsOnboarding: !snap.exists(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userDocPath);
  }
}

export async function completeGoogleOnboarding(user: User, payload: OnboardingPayload): Promise<void> {
  const cleanName = sanitizeText(payload.displayName);
  if (user.displayName !== cleanName) {
    await updateProfile(user, { displayName: cleanName });
  }
  await createInitialUserDocs(user, payload);
}

export async function resendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function refreshUserVerification(user: User): Promise<boolean> {
  await reload(user);
  return Boolean(auth.currentUser?.emailVerified);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
