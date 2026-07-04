'use client';

import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getShop } from '@/lib/db/shops';

export default function Home() {
  const { isInitialized, liffError, profile, groupId, debugLog } = useLiff();
  const router = useRouter();
  
  const [existingShopId, setExistingShopId] = useState<string | null>(null);

  // Use groupId if available, otherwise fall back to a "personal" namespace using the user's ID
  const namespace = groupId || `personal-${profile?.userId}`;

  useEffect(() => {
    if (isInitialized && profile && namespace) {
      const compositeShopId = `${namespace}_${profile.userId}`;
      getShop(compositeShopId).then(shop => {
        if (shop) setExistingShopId(compositeShopId);
      });
    }
  }, [isInitialized, profile, namespace]);

  if (liffError) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginTop: '20vh', textAlign: 'center' }}>
        <h1 className="page-title" style={{ color: 'var(--accent-color)' }}>Error</h1>
        <p>{liffError}</p>
      </div>
    );
  }

  if (!isInitialized || !profile) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginTop: '20vh', textAlign: 'center' }}>
        <h1 className="page-title">Loading...</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Initializing LINE Mini App</p>
        <pre style={{ marginTop: '24px', textAlign: 'left', fontSize: '0.8rem', background: '#f5f5f5', padding: '12px', borderRadius: '8px', color: '#333', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
          {debugLog}
        </pre>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0' }}>
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
        {profile.pictureUrl && (
          <img 
            src={profile.pictureUrl} 
            alt="Profile" 
            style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '16px' }}
          />
        )}
        <h1 className="page-title">Welcome to the Marketplace</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {`Hello, ${profile.displayName}!`}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {existingShopId ? (
          <button className="btn-primary" onClick={() => router.push(`/shop/${existingShopId}`)}>
            Manage Your Shop
          </button>
        ) : (
          <button className="btn-primary" onClick={() => router.push('/shop/create')}>
            Create Your Shop
          </button>
        )}
        <button className="btn-secondary" onClick={() => router.push('/marketplace')}>
          Explore Group Shops
        </button>
      </div>
    </div>
  );
}
