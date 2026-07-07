'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shop } from '@/lib/db/shops';
import { Order } from '@/lib/db/orders';
import { getPendingTopUpRequests } from '@/lib/db/topups';
import { getReports } from '@/lib/db/reports';
import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

export default function AdminDashboard() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingTopupsCount, setPendingTopupsCount] = useState(0);
  const [unreadReportsCount, setUnreadReportsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only allow admin
    if (profile && profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      router.push('/');
      return;
    }

    const fetchAdminData = async () => {
      try {
        const [shopsSnap, ordersSnap, pendingTopups, allReports] = await Promise.all([
          getDocs(collection(db, 'shops')),
          getDocs(collection(db, 'orders')),
          getPendingTopUpRequests().catch(() => []),
          getReports().catch(() => [])
        ]);
        
        setShops(shopsSnap.docs.map(d => d.data() as Shop));
        setOrders(ordersSnap.docs.map(d => d.data() as Order));
        setPendingTopupsCount(pendingTopups.length);
        setUnreadReportsCount(allReports.filter(r => r.status === 'unread' || !r.status).length);
      } catch (error) {
        console.error('Failed to fetch admin data', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (profile) fetchAdminData();
  }, [profile, router]);

  if (!profile || profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) return null;
  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading')}</div>;

  const totalRevenue = orders.filter(o => o.status === 'accepted' || o.status === 'completed').reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/')}
      >
        ← {t('home')}
      </button>

      <h1 className="page-title" style={{ marginBottom: '24px' }}>{t('admin_dashboard')}</h1>

      {/* Admin Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => router.push('/admin/markets')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(123, 97, 255, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              🏙️
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{t('manage_markets')}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{t('manage_markets_desc')}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => router.push('/admin/shops')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 218, 114, 0.1)', color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              🏪
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{t('all_shops')}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{t('all_shops_desc')}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => router.push('/admin/orders')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 107, 107, 0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              📦
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{t('recent_orders')}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{t('recent_orders_desc')}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer', position: 'relative' }} onClick={() => router.push('/admin/topups')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 193, 7, 0.1)', color: '#FFC107', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              🪙
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Top-up Requests
                {pendingTopupsCount > 0 && (
                  <span style={{ background: '#FFC107', color: '#000', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                    {pendingTopupsCount}
                  </span>
                )}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Approve or reject coin top-up requests</p>
            </div>
          </div>
        </div>

        <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer', position: 'relative' }} onClick={() => router.push('/admin/reports')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 107, 107, 0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              ⚠️
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Reports (แจ้งปัญหา)
                {unreadReportsCount > 0 && (
                  <span style={{ background: 'var(--accent-color)', color: 'white', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                    {unreadReportsCount}
                  </span>
                )}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>View issues reported by users</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{shops.length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{t('total_shops')}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--secondary-color)' }}>{orders.length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{t('total_orders')}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-color)' }}>฿{totalRevenue.toFixed(2)}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{t('total_revenue')}</div>
        </div>
      </div>
    </div>
  );
}
