'use client';

import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getShop } from '@/lib/db/shops';

export default function Home() {
  const { isInitialized, liffError, profile, groupId, namespace, debugLog } = useLiff();
  const router = useRouter();
  
  const [existingShopId, setExistingShopId] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && profile) {
      getShop(profile.userId).then(shop => {
        if (shop) setExistingShopId(profile.userId);
      });
    }
  }, [isInitialized, profile]);

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
          Explore Shops
        </button>
        {profile.userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID && (
          <button className="btn-secondary" style={{ background: '#333', color: 'white' }} onClick={() => router.push('/admin')}>
            Admin Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
