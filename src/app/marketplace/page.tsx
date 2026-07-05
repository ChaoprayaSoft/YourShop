'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShopsInMarket, Shop } from '@/lib/db/shops';
import { getMarket, Market } from '@/lib/db/markets';
import { getUserProfile } from '@/lib/db/users';
import { useLanguage } from '@/components/LanguageProvider';

export default function MarketplacePage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
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
          setError(`${t('market_not_found')} (Debug: Looked for ID: "${user.marketId}")`);
        }
      } catch (err) {
        console.error(err);
        setError(t('error'));
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [profile, router, t]);

  if (!profile) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading')}</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/')}
      >
        ← {t('home')}
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('loading_market')}</div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--accent-color)' }}>
          {error}
        </div>
      ) : market ? (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h1 className="page-title">{market.name}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {shops.length} {t('shops_available')}
            </p>
          </div>

          {shops.filter(shop => !shop.isBanned).length === 0 ? (
            <div className="glass-panel" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {t('no_shops_market')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {shops.filter(shop => !shop.isBanned).map(shop => {
                const isClosed = shop.isOpen === false;
                
                return (
                  <div 
                    key={shop.id} 
                    className="glass-panel" 
                    style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', opacity: isClosed ? 0.7 : 1 }}
                    onClick={() => router.push(`/shop/${shop.id}`)}
                  >
                    {shop.ownerPictureUrl ? (
                      <img src={shop.ownerPictureUrl} alt={shop.ownerName} style={{ width: '48px', height: '48px', borderRadius: '50%', filter: isClosed ? 'grayscale(100%)' : 'none' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isClosed ? '#999' : 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                        {shop.name.charAt(0)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: '1.2rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {shop.name}
                        {isClosed && <span style={{ fontSize: '0.75rem', background: '#999', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>CLOSED</span>}
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {shop.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
