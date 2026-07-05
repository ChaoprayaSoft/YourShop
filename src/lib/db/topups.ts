import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type TopUpRequest = {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  amountTHB: number;
  coinsRequested: number;
  transferDate: string;
  transferTime: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  createdAt: any;
  updatedAt: any;
};

export async function createTopUpRequest(data: Omit<TopUpRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
  const topupsRef = collection(db, 'topups');
  const docRef = doc(topupsRef);
  const id = docRef.id;

  await setDoc(docRef, {
    ...data,
    id,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return id;
}

export async function getPendingTopUpRequests(): Promise<TopUpRequest[]> {
  const q = query(collection(db, 'topups'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  // Filter manually since we want pending and we also might want all later
  return snap.docs.map(doc => doc.data() as TopUpRequest).filter(t => t.status === 'pending');
}

export async function updateTopUpRequestStatus(id: string, status: 'approved' | 'rejected', rejectReason?: string) {
  const docRef = doc(db, 'topups', id);
  const updateData: any = {
    status,
    updatedAt: serverTimestamp()
  };
  if (rejectReason) {
    updateData.rejectReason = rejectReason;
  }
  await updateDoc(docRef, updateData);
}
