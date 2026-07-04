'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShopsInMarket, Shop } from '@/lib/db/shops';
import { getMarket, Market } from '@/lib/db/markets';
import { getUserProfile } from '@/lib/db/users';

export default function MarketplacePage() {
  const { profile } = useLiff();
  const router = useRouter();
  
  const [market, setMarket] = useState<Market | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    
    const fetchMarketData = async () => {
      try {
        const user = await getUserProfile(profile.userId);
        if (!user || !user.marketId) {
          router.push('/profile');
          return;
        }

        const currentMarket = await getMarket(user.marketId);
        if (currentMarket) {
          setMarket(currentMarket);
          const fetchedShops = await getShopsInMarket(user.marketId);
          setShops(fetchedShops);
        } else {
          setError('Your selected market could not be found.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load market data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [profile, router]);

  if (!profile) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/')}
      >
        ← Home
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading your market...</div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--accent-color)' }}>
          {error}
        </div>
      ) : market ? (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h1 className="page-title">{market.name}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {shops.length} Shop{shops.length !== 1 ? 's' : ''} available in your area
            </p>
          </div>

          {shops.length === 0 ? (
            <div className="glass-panel" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No shops found in this market yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {shops.map(shop => (
                <div 
                  key={shop.id} 
                  className="glass-panel" 
                  style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
                  onClick={() => router.push(`/shop/${shop.id}`)}
                >
                  {shop.ownerPictureUrl ? (
                    <img src={shop.ownerPictureUrl} alt={shop.ownerName} style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                      {shop.name.charAt(0)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{shop.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {shop.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
