'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShopsInGroup, Shop } from '@/lib/db/shops';

export default function MarketplacePage() {
  const { groupId } = useLiff();
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    getShopsInGroup(groupId)
      .then(data => {
        setShops(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [groupId]);

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading Shops...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/')}
      >
        ← Home
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Group Shops</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Explore shops created by members of this group.</p>
      </div>

      {shops.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No shops found in this group yet.
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
