'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { createShop } from '@/lib/db/shops';
import { getAllMarkets, Market } from '@/lib/db/markets';

export default function CreateShopPage() {
  const { profile } = useLiff();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [marketId, setMarketId] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingMarkets, setFetchingMarkets] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllMarkets().then(m => {
      setMarkets(m);
      if (m.length > 0) setMarketId(m[0].id);
      setFetchingMarkets(false);
    }).catch(err => {
      console.error(err);
      setFetchingMarkets(false);
    });
  }, []);

  if (!profile) return null; // Wait for LiffProvider

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId) {
      setError('Please select a market');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await createShop({
        id: profile.userId, // Scoped to user
        marketId,
        name,
        description,
        ownerName: profile.displayName,
        ownerPictureUrl: profile.pictureUrl
      });
      router.push(`/shop/${profile.userId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create shop');
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.back()}
      >
        ← Back
      </button>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Create Your Shop</h1>
        
        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Select Market</label>
            {fetchingMarkets ? (
              <div style={{ padding: '12px', fontSize: '0.9rem', color: '#999' }}>Loading markets...</div>
            ) : markets.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.9rem', color: 'red' }}>No markets exist. Admin must create one first.</div>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Shop Name</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grandma's Bakery"
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us what you sell!"
              rows={4}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || markets.length === 0}
            style={{ marginTop: '16px', opacity: (loading || markets.length === 0) ? 0.7 : 1 }}
          >
            {loading ? 'Creating...' : 'Create Shop'}
          </button>
        </form>
      </div>
    </div>
  );
}
