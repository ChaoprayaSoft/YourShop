import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminDb: any = null;

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
        }),
      });
      adminDb = getFirestore();
      console.log('Firebase Admin initialized successfully.');
    } else {
      console.warn('Firebase Admin not initialized: Missing FIREBASE_PRIVATE_KEY');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
} else {
  adminDb = getFirestore();
}

export { adminDb };
