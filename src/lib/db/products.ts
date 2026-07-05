import { collection, doc, setDoc, getDocs, getDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type ProductChoice = {
  name: string;
  price: number;
};

export type Product = {
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  choiceType?: 'single' | 'multiple';
  choices?: ProductChoice[];
  createdAt: any;
};

export async function addProduct(shopId: string, productData: Omit<Product, 'id' | 'shopId' | 'createdAt'>) {
  const productRef = doc(collection(db, 'products'));
  const newProduct: Product = {
    ...productData,
    id: productRef.id,
    shopId,
    createdAt: serverTimestamp(),
  };
  await setDoc(productRef, newProduct);
  return newProduct.id;
}

export async function updateProduct(productId: string, updates: Partial<Product>) {
  const productRef = doc(db, 'products', productId);
  await setDoc(productRef, updates, { merge: true });
}

export async function getProduct(productId: string): Promise<Product | null> {
  const productRef = doc(db, 'products', productId);
  const snap = await getDoc(productRef);
  return snap.exists() ? (snap.data() as Product) : null;
}

export async function getShopProducts(shopId: string): Promise<Product[]> {
  const productsQuery = query(collection(db, 'products'), where('shopId', '==', shopId));
  const snap = await getDocs(productsQuery);
  return snap.docs.map(doc => doc.data() as Product);
}

import { deleteDoc } from 'firebase/firestore';
export async function deleteProduct(productId: string) {
  const productRef = doc(db, 'products', productId);
  await deleteDoc(productRef);
}
