'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shop } from '@/lib/db/shops';
import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { getUserProfile } from '@/lib/db/users';

export default function AdminShopsPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShops = async () => {
    try {
      const shopsSnap = await getDocs(collection(db, 'shops'));
      setShops(shopsSnap.docs.map(d => d.data() as Shop));
    } catch (error) {
      console.error('Failed to fetch shops', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only allow admin
    if (profile && profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      router.push('/');
      return;
    }
    if (profile) fetchShops();
  }, [profile, router]);

  const handleBanShop = async (shop: Shop) => {
    const isBanned = shop.isBanned || false;
    const action = isBanned ? 'Unban' : 'Ban';
    if (!confirm(`Are you sure you want to ${action} this shop?`)) return;

    try {
      const shopRef = doc(db, 'shops', shop.id);
      await setDoc(shopRef, { isBanned: !isBanned }, { merge: true });
      
      // Update local state
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, isBanned: !isBanned } : s));

      // Send Email Notification if Banning
      if (!isBanned) {
        const owner = await getUserProfile(shop.id);
        if (owner && owner.email) {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'banned',
              recipientEmail: owner.email,
              shopName: shop.name
            })
          });
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update shop status');
    }
  };

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

      <h1 className="page-title" style={{ marginBottom: '24px' }}>{t('all_shops')}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {shops.map(shop => (
          <div key={shop.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: shop.isBanned ? 0.6 : 1 }}>
            <div>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {shop.name}
                {shop.isBanned && <span style={{ fontSize: '0.75rem', background: 'var(--accent-color)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>BANNED</span>}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>
                {t('owner')}: {shop.ownerName} | Market ID: {shop.marketId ? shop.marketId.substring(0,8) : 'N/A'}...
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-secondary"
                onClick={() => router.push(`/shop/${shop.id}`)}
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              >
                ดูร้านค้า
              </button>
              <button 
                onClick={() => handleBanShop(shop)}
                style={{ 
                  padding: '4px 12px', 
                  fontSize: '0.8rem', 
                  background: shop.isBanned ? '#eee' : 'rgba(255,107,107,0.1)', 
                  color: shop.isBanned ? '#666' : 'var(--accent-color)', 
                  border: `1px solid ${shop.isBanned ? '#ccc' : 'rgba(255,107,107,0.3)'}`, 
                  borderRadius: '8px', 
                  fontWeight: 600 
                }}
              >
                {shop.isBanned ? 'Unban' : 'Ban'}
              </button>
            </div>
          </div>
        ))}
        {shops.length === 0 && <div style={{ color: '#999' }}>{t('shop_not_found')}</div>}
      </div>
    </div>
  );
}
