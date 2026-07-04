'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shop } from '@/lib/db/shops';
import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

export default function AdminShopsPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only allow admin
    if (profile && profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      router.push('/');
      return;
    }

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
    
    if (profile) fetchShops();
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

      <h1 className="page-title" style={{ marginBottom: '24px' }}>{t('all_shops')}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {shops.map(shop => (
          <div key={shop.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{shop.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>
                {t('owner')}: {shop.ownerName} | Market ID: {shop.marketId ? shop.marketId.substring(0,8) : 'N/A'}...
              </div>
            </div>
            <button 
              className="btn-secondary"
              onClick={() => router.push(`/shop/${shop.id}`)}
              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            >
              ดูร้านค้า
            </button>
          </div>
        ))}
        {shops.length === 0 && <div style={{ color: '#999' }}>{t('shop_not_found')}</div>}
      </div>
    </div>
  );
}
