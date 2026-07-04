'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getAllMarkets, Market, createMarket, deleteMarket } from '@/lib/db/markets';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shop } from '@/lib/db/shops';
import { useLanguage } from '@/components/LanguageProvider';

type MarketWithCount = Market & { shopCount: number };

export default function AdminMarketsPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [markets, setMarkets] = useState<MarketWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [marketId, setMarketId] = useState('');
  const [marketName, setMarketName] = useState('');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchMarketsData = async () => {
    try {
      const [marketsData, shopsSnap] = await Promise.all([
        getAllMarkets(),
        getDocs(collection(db, 'shops'))
      ]);
      
      const shops = shopsSnap.docs.map(d => d.data() as Shop);
      
      const combined = marketsData.map(m => {
        const count = shops.filter(s => s.marketId === m.id).length;
        return { ...m, shopCount: count };
      });
      
      setMarkets(combined);
    } catch (error) {
      console.error('Failed to fetch markets', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && profile.userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      fetchMarketsData();
    }
  }, [profile]);

  if (!profile || profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('unauthorized')}</div>;

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId || !marketName) return;
    setCreating(true);
    setMsg('');
    try {
      await createMarket(marketId, marketName);
      setMsg('Market created successfully!');
      setMarketId('');
      setMarketName('');
      await fetchMarketsData();
    } catch (err: any) {
      setMsg('Error: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, count: number) => {
    if (count > 0) {
      alert('Cannot delete market: It still has shops attached to it.');
      return;
    }
    if (confirm('Are you sure you want to delete this market?')) {
      try {
        await deleteMarket(id);
        setMarkets(prev => prev.filter(m => m.id !== id));
      } catch (err) {
        alert('Failed to delete market');
        console.error(err);
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/admin')}
      >
        ← {t('back_to_admin')}
      </button>

      <h1 className="page-title" style={{ marginBottom: '24px' }}>{t('manage_markets')}</h1>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>{t('create_new_market')}</h2>
        <form onSubmit={handleCreateMarket} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('market_id')}</label>
            <input
              type="text"
              value={marketId}
              onChange={e => setMarketId(e.target.value)}
              className="input-field"
              placeholder="e.g. central-plaza"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('market_name')}</label>
            <input
              type="text"
              value={marketName}
              onChange={e => setMarketName(e.target.value)}
              className="input-field"
              placeholder="e.g. Central Plaza Food Court"
              required
            />
          </div>
          {msg && <div style={{ color: msg.startsWith('Error') ? 'red' : 'green', fontSize: '0.9rem' }}>{msg}</div>}
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? t('creating') : t('create_market')}
          </button>
        </form>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>{t('existing_markets')}</h2>
      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>{t('loading')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {markets.map(market => (
            <div key={market.id} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{market.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: {market.id}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600, marginTop: '4px' }}>
                  {market.shopCount} {t('shops')}
                </div>
              </div>
              <button 
                style={{ padding: '8px 16px', background: 'rgba(255, 107, 107, 0.1)', color: 'var(--accent-color)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', fontWeight: 600 }}
                onClick={() => handleDelete(market.id, market.shopCount)}
              >
                {t('delete')}
              </button>
            </div>
          ))}
          {markets.length === 0 && <div style={{ color: '#999' }}>No markets found.</div>}
        </div>
      )}
    </div>
  );
}
