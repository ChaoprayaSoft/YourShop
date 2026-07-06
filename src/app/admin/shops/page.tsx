'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shop, deleteShop } from '@/lib/db/shops';
import { Market, getAllMarkets } from '@/lib/db/markets';
import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { getUserProfile } from '@/lib/db/users';
import Select from '@/components/Select';

export default function AdminShopsPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [shopsSnap, marketsData] = await Promise.all([
        getDocs(collection(db, 'shops')),
        getAllMarkets()
      ]);
      setShops(shopsSnap.docs.map(d => d.data() as Shop));
      setMarkets(marketsData);
    } catch (error) {
      console.error('Failed to fetch data', error);
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
    if (profile) fetchData();
  }, [profile, router]);

  const handleBanShop = async (e: React.MouseEvent, shop: Shop) => {
    e.stopPropagation(); // Prevent row click
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
            headers: { 
              'Content-Type': 'application/json',
              'x-api-secret': process.env.NEXT_PUBLIC_API_SECRET_KEY || ''
            },
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

  const handleRemoveShop = async (e: React.MouseEvent, shop: Shop) => {
    e.stopPropagation(); // Prevent row click
    if (!confirm(`Are you sure you want to completely DELETE this shop? This cannot be undone.`)) return;

    try {
      await deleteShop(shop.id);
      setShops(prev => prev.filter(s => s.id !== shop.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete shop');
    }
  };

  if (!profile || profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) return null;
  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading')}</div>;

  const filteredShops = selectedMarketId === 'ALL' 
    ? shops 
    : shops.filter(shop => shop.marketId === selectedMarketId);

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/admin')}
      >
        ← {t('back')}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>{t('all_shops')}</h1>
        <Select 
          value={selectedMarketId}
          onChange={(value) => setSelectedMarketId(value)}
          options={[
            { label: 'All Markets', value: 'ALL' },
            ...markets.map(m => ({ label: m.name, value: m.id }))
          ]}
          style={{ width: '200px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {filteredShops.map(shop => {
          const marketName = markets.find(m => m.id === shop.marketId)?.name || 'Unknown Market';
          return (
            <div 
              key={shop.id} 
              className="glass-panel" 
              style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: shop.isBanned ? 0.6 : 1, cursor: 'pointer' }}
              onClick={() => router.push(`/shop/${shop.id}`)}
            >
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {shop.name}
                  {shop.isBanned && <span style={{ fontSize: '0.75rem', background: 'var(--accent-color)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>BANNED</span>}
                  {shop.isOpen === false && <span style={{ fontSize: '0.75rem', background: '#999', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>CLOSED</span>}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>
                  {t('owner')}: {shop.ownerName} | 📍 {marketName}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  onClick={(e) => handleBanShop(e, shop)}
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
                <button 
                  onClick={(e) => handleRemoveShop(e, shop)}
                  style={{ 
                    padding: '4px 12px', 
                    fontSize: '0.8rem', 
                    background: 'var(--accent-color)', 
                    color: 'white', 
                    border: 'none',
                    borderRadius: '8px', 
                    fontWeight: 600 
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
        {filteredShops.length === 0 && <div style={{ color: '#999' }}>{t('shop_not_found')}</div>}
      </div>
    </div>
  );
}
