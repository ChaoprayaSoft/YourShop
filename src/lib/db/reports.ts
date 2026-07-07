import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';

export type Report = {
  id?: string;
  userId: string; // The person who reported
  marketId: string;
  shopId: string;
  message: string;
  imageUrl?: string;
  status?: 'unread' | 'read';
  createdAt: any;
};

// Create a new report
export async function createReport(data: Omit<Report, 'id' | 'createdAt' | 'status'>) {
  const reportsRef = collection(db, 'reports');
  const docRef = await addDoc(reportsRef, {
    ...data,
    status: 'unread',
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

// Get all reports for the admin dashboard
export async function getReports(): Promise<Report[]> {
  const reportsRef = collection(db, 'reports');
  const q = query(reportsRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Report));
}

// Update report status
import { doc, updateDoc } from 'firebase/firestore';
export async function updateReportStatus(id: string, status: 'unread' | 'read') {
  const docRef = doc(db, 'reports', id);
  await updateDoc(docRef, { status });
}
