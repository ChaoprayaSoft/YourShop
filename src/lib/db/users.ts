import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type UserProfile = {
  id: string; // LINE userId
  displayName: string;
  pictureUrl?: string;
  email?: string; // Required for notifications
  address: string;
  marketId: string; // Their default market location
  createdAt: any;
  updatedAt: any;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', userId);
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserProfile(userId: string, data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = doc(db, 'users', userId);
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } else {
    await setDoc(docRef, {
      ...data,
      id: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}
