'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/lib/db/orders';
import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

export default function AdminOrdersPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only allow admin
    if (profile && profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      router.push('/');
      return;
    }

    const fetchOrders = async () => {
      try {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const ordersSnap = await getDocs(q);
        setOrders(ordersSnap.docs.map(d => d.data() as Order));
      } catch (error) {
        console.error('Failed to fetch orders', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (profile) fetchOrders();
  }, [profile, router]);

  if (!profile || profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) return null;
  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading')}</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/admin')}
      >
        ← {t('back')}
      </button>

      <h1 className="page-title" style={{ marginBottom: '24px' }}>{t('recent_orders')}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {orders.map(order => (
          <div key={order.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>฿{order.totalPrice} {t('by')} {order.buyerName}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Shop ID: {order.shopId.substring(0,8)}... | {t('status')}: {order.status}</div>
            </div>
            <div style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '0.8rem', 
              fontWeight: 600,
              backgroundColor: order.status === 'accepted' || order.status === 'completed' ? '#d4edda' : order.status === 'rejected' ? '#f8d7da' : '#fff3cd',
              color: order.status === 'accepted' || order.status === 'completed' ? '#155724' : order.status === 'rejected' ? '#721c24' : '#856404'
            }}>
              {order.status.toUpperCase()}
            </div>
          </div>
        ))}
        {orders.length === 0 && <div style={{ color: '#999' }}>{t('no_orders')}</div>}
      </div>
    </div>
  );
}
