'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shop } from '@/lib/db/shops';
import { Order } from '@/lib/db/orders';

export default function AdminDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    
    fetchAdminData();
  }, []);

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading Admin Data...</div>;

  const totalRevenue = orders.filter(o => o.status === 'accepted').reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-title" style={{ marginBottom: '24px' }}>Admin Dashboard</h1>

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
          <div style={{ color: 'var(--text-secondary)' }}>Total Revenue (Accepted)</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>All Shops</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {shops.map(shop => (
          <div key={shop.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{shop.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>Owner: {shop.ownerName} | Market ID: {shop.marketId.substring(0,8)}...</div>
            </div>
          </div>
        ))}
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
              backgroundColor: order.status === 'accepted' ? '#d4edda' : order.status === 'rejected' ? '#f8d7da' : '#fff3cd',
              color: order.status === 'accepted' ? '#155724' : order.status === 'rejected' ? '#721c24' : '#856404'
            }}>
              {order.status.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
