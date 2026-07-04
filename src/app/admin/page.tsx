'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shop } from '@/lib/db/shops';
import { Order } from '@/lib/db/orders';
import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const { profile } = useLiff();
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only allow admin
    if (profile && profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      router.push('/');
      return;
    }

    const fetchAdminData = async () => {
      try {
        const [shopsSnap, ordersSnap] = await Promise.all([
          getDocs(collection(db, 'shops')),
          getDocs(collection(db, 'orders'))
        ]);
        
        setShops(shopsSnap.docs.map(d => d.data() as Shop));
        setOrders(ordersSnap.docs.map(d => d.data() as Order));
      } catch (error) {
        console.error('Failed to fetch admin data', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (profile) fetchAdminData();
  }, [profile, router]);

  if (!profile || profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) return null;
  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading Admin Data...</div>;

  const totalRevenue = orders.filter(o => o.status === 'accepted' || o.status === 'completed').reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/')}
      >
        ← Home
      </button>

      <h1 className="page-title" style={{ marginBottom: '24px' }}>Admin Dashboard</h1>

      {/* Admin Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => router.push('/admin/markets')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(123, 97, 255, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              🏙️
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Manage Markets</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Create, view, and delete markets</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{shops.length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total Shops</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--secondary-color)' }}>{orders.length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total Orders</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-color)' }}>฿{totalRevenue.toFixed(2)}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total Revenue</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>All Shops</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {shops.map(shop => (
          <div key={shop.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{shop.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>Owner: {shop.ownerName} | Market ID: {shop.marketId ? shop.marketId.substring(0,8) : 'N/A'}...</div>
            </div>
          </div>
        ))}
        {shops.length === 0 && <div style={{ color: '#999' }}>No shops found.</div>}
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Recent Orders</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {orders.slice(0, 20).map(order => (
          <div key={order.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>฿{order.totalPrice} by {order.buyerName}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Shop ID: {order.shopId.substring(0,8)}... | Status: {order.status}</div>
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
        {orders.length === 0 && <div style={{ color: '#999' }}>No orders found.</div>}
      </div>
    </div>
  );
}
