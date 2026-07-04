import { collection, doc, setDoc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type Shop = {
  id: string; // The user ID is the shop ID for simplicity (one shop per user per group)
  groupId: string;
  name: string;
  description: string;
  ownerName: string;
  ownerPictureUrl?: string;
  createdAt: any;
};

export async function createShop(shopData: Omit<Shop, 'createdAt'>) {
  const shopRef = doc(db, 'shops', shopData.id);
  await setDoc(shopRef, {
    ...shopData,
    createdAt: serverTimestamp(),
  });
  return shopData.id;
}

export async function getShop(shopId: string): Promise<Shop | null> {
  const shopRef = doc(db, 'shops', shopId);
  const snap = await getDoc(shopRef);
  return snap.exists() ? (snap.data() as Shop) : null;
}

export async function getShopsInGroup(groupId: string): Promise<Shop[]> {
  const shopsQuery = query(collection(db, 'shops'), where('groupId', '==', groupId));
  const snap = await getDocs(shopsQuery);
  return snap.docs.map(doc => doc.data() as Shop);
}
