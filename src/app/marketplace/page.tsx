'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShopsInMarket, Shop } from '@/lib/db/shops';
import { getAllMarkets, Market } from '@/lib/db/markets';

export default function MarketplacePage() {
  const { profile } = useLiff();
  const router = useRouter();
  
  const [markets, setMarkets] = useState<Market[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState(false);

  useEffect(() => {
    getAllMarkets().then(m => {
      setMarkets(m);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleSelectMarket = async (market: Market) => {
    setSelectedMarket(market);
    setLoadingShops(true);
    try {
      const fetchedShops = await getShopsInMarket(market.id);
      setShops(fetchedShops);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingShops(false);
    }
  };

  const filteredMarkets = useMemo(() => {
    if (!searchQuery) return markets;
    return markets.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [markets, searchQuery]);

  if (!profile) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => {
          if (selectedMarket) {
            setSelectedMarket(null);
            setSearchQuery('');
          } else {
            router.push('/');
          }
        }}
      >
        {selectedMarket ? '← Back to Markets' : '← Home'}
      </button>

      {!selectedMarket ? (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h1 className="page-title">Market Directory</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Find a market near you to start shopping</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <input 
              type="text" 
              placeholder="Search for a market..." 
              className="input-field"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading markets...</div>
          ) : filteredMarkets.length === 0 ? (
            <div className="glass-panel" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No markets found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredMarkets.map(market => (
                <div 
                  key={market.id} 
                  className="glass-panel" 
                  style={{ padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onClick={() => handleSelectMarket(market)}
                >
                  <h2 style={{ fontSize: '1.25rem' }}>{market.name}</h2>
                  <span style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}>→</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h1 className="page-title">{selectedMarket.name}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Shops available in this market</p>
          </div>

          {loadingShops ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading shops...</div>
          ) : shops.length === 0 ? (
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
      )}
    </div>
  );
}
