import { doc, setDoc, getDoc, serverTimestamp, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export type Market = {
  id: string;
  name: string;
  createdAt: any;
};

export async function createMarket(id: string, name: string): Promise<string> {
  const marketRef = doc(db, 'markets', id);
  await setDoc(marketRef, {
    id,
    name,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function getMarket(marketId: string): Promise<Market | null> {
  const marketRef = doc(db, 'markets', marketId);
  const snap = await getDoc(marketRef);
  return snap.exists() ? (snap.data() as Market) : null;
}

export async function getAllMarkets(): Promise<Market[]> {
  const marketsQuery = query(collection(db, 'markets'));
  const snap = await getDocs(marketsQuery);
  return snap.docs.map(doc => doc.data() as Market);
}
