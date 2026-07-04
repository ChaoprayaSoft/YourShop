'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShop, updateShop } from '@/lib/db/shops';
import { getAllMarkets, Market } from '@/lib/db/markets';

export default function EditShopPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [marketId, setMarketId] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!shopId) return;

    const loadData = async () => {
      try {
        const [shop, allMarkets] = await Promise.all([
          getShop(shopId),
          getAllMarkets()
        ]);
        
        if (shop) {
          setName(shop.name);
          setDescription(shop.description);
          setMarketId(shop.marketId);
        } else {
          setError('Shop not found');
        }
        
        setMarkets(allMarkets);
      } catch (err) {
        console.error(err);
        setError('Failed to load shop data');
      } finally {
        setFetching(false);
      }
    };
    
    loadData();
  }, [shopId]);

  if (!profile || fetching) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;

  // Only the owner can edit
  if (profile.userId !== shopId) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', marginTop: '20vh' }}>
        <h2>Unauthorized</h2>
        <button className="btn-primary" onClick={() => router.push('/')} style={{ marginTop: '16px' }}>Go Home</button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId) {
      setError('Please select a market');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await updateShop(shopId, {
        name,
        description,
        marketId
      });
      router.push(`/shop/${shopId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update shop');
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.back()}
      >
        ← Cancel
      </button>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Edit Your Shop</h1>
        
        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Shop Name</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Assigned Market</label>
            {markets.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.9rem', color: 'red' }}>No markets exist.</div>
            ) : (
              <select 
                value={marketId}
                onChange={e => setMarketId(e.target.value)}
                className="input-field"
                required
              >
                {markets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            <div style={{ fontSize: '0.8rem', color: '#999' }}>
              Changing this will move your shop to a different market in the marketplace.
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ marginTop: '16px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
