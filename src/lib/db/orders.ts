import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from './products';

export type Order = {
  id: string;
  shopId: string;
  groupId: string;
  buyerId: string;
  buyerName: string;
  items: { product: Product; quantity: number; selectedChoices?: { name: string; price: number }[] }[];
  totalPrice: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  rejectReason?: string;
  createdAt: any;
};

export async function placeOrder(orderData: Omit<Order, 'id' | 'status' | 'createdAt'>) {
  const orderRef = doc(collection(db, 'orders'));
  const newOrder: Order = {
    ...orderData,
    id: orderRef.id,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  await setDoc(orderRef, newOrder);
  return newOrder.id;
}

export async function getShopOrders(shopId: string): Promise<Order[]> {
  const ordersQuery = query(collection(db, 'orders'), where('shopId', '==', shopId));
  const snap = await getDocs(ordersQuery);
  return snap.docs.map(doc => doc.data() as Order);
}

export async function updateOrderStatus(orderId: string, status: Order['status'], rejectReason?: string) {
  const orderRef = doc(db, 'orders', orderId);
  await setDoc(orderRef, { status, ...(rejectReason ? { rejectReason } : {}) }, { merge: true });
}
