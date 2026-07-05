import { collection, doc, setDoc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type Shop = {
  id: string; // The user ID is the shop ID for simplicity (one shop per user)
  marketId: string;
  name: string;
  description: string;
  ownerName: string;
  ownerPictureUrl?: string;
  isOpen?: boolean;
  isBanned?: boolean;
  adMessage?: string;
  productSlots: number;
  maintenanceFeeDueDate: any; // Timestamp
  createdAt: any;
};

export async function createShop(shopData: Omit<Shop, 'createdAt' | 'isOpen' | 'isBanned' | 'productSlots' | 'maintenanceFeeDueDate'>) {
  const shopRef = doc(db, 'shops', shopData.id);
  
  // Set maintenance fee due date to 30 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  
  await setDoc(shopRef, {
    ...shopData,
    isOpen: true,
    isBanned: false,
    productSlots: 2, // Free 2 product slots
    maintenanceFeeDueDate: dueDate,
    createdAt: serverTimestamp(),
  });
  return shopData.id;
}

export async function updateShop(shopId: string, updates: Partial<Shop>) {
  const shopRef = doc(db, 'shops', shopId);
  await setDoc(shopRef, updates, { merge: true });
}

export async function getShop(shopId: string): Promise<Shop | null> {
  const shopRef = doc(db, 'shops', shopId);
  const snap = await getDoc(shopRef);
  return snap.exists() ? (snap.data() as Shop) : null;
}

export async function getShopsInMarket(marketId: string): Promise<Shop[]> {
  const shopsQuery = query(collection(db, 'shops'), where('marketId', '==', marketId));
  const snap = await getDocs(shopsQuery);
  return snap.docs.map(doc => doc.data() as Shop);
}

import { deleteDoc } from 'firebase/firestore';
export async function deleteShop(shopId: string) {
  const shopRef = doc(db, 'shops', shopId);
  await deleteDoc(shopRef);
}
