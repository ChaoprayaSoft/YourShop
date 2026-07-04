'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShopsInMarket, Shop } from '@/lib/db/shops';
import { getAllMarkets, Market } from '@/lib/db/markets';

export default function MarketplacePage() {
  const { profile } = useLiff();
  const router = useRouter();
  
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load of markets
  useEffect(() => {
    getAllMarkets().then(m => {
      setMarkets(m);
      if (m.length > 0) {
        setSelectedMarketId(m[0].id);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  // Fetch shops when selected market changes
  useEffect(() => {
    if (!selectedMarketId) return;

    const fetchShops = async () => {
      setLoading(true);
      try {
        const fetchedShops = await getShopsInMarket(selectedMarketId);
        setShops(fetchedShops);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchShops();
  }, [selectedMarketId]);

  if (!profile) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/')}
      >
        ← Home
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h1 className="page-title">Marketplace</h1>
        <button 
          onClick={() => router.push('/shop/create')}
          style={{ padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600 }}
        >
          + New Shop
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>Select Market</label>
        {markets.length === 0 ? (
          <div style={{ color: 'red', fontSize: '0.9rem' }}>No markets available.</div>
        ) : (
          <select 
            value={selectedMarketId}
            onChange={e => setSelectedMarketId(e.target.value)}
            className="input-field"
            style={{ marginBottom: 0 }}
          >
            {markets.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center' }}>Loading Shops...</div>
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
              style={{ padding: '16px', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', gap: '16px' }}
              onClick={() => router.push(`/marketplace/${shop.id}`)}
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
    </div>
  );
}
