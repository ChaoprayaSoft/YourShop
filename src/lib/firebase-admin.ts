import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminDb: any = null;
let adminAuth: any = null;

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
        }),
      });
      adminDb = getFirestore();
      adminAuth = getAuth();
      console.log('Firebase Admin initialized successfully.');
    } else {
      console.warn('Firebase Admin not initialized: Missing FIREBASE_PRIVATE_KEY');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
} else {
  adminDb = getFirestore();
  adminAuth = getAuth();
}

export { adminDb, adminAuth };
