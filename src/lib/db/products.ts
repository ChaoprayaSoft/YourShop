import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type Product = {
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
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

export async function getShopProducts(shopId: string): Promise<Product[]> {
  const productsQuery = query(collection(db, 'products'), where('shopId', '==', shopId));
  const snap = await getDocs(productsQuery);
  return snap.docs.map(doc => doc.data() as Product);
}
