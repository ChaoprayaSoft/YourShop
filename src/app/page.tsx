'use client';

import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getShop } from '@/lib/db/shops';
import { getUserProfile } from '@/lib/db/users';

export default function Home() {
  const { isInitialized, liffError, profile } = useLiff();
  const router = useRouter();
  
  const [existingShopId, setExistingShopId] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (isInitialized && profile) {
      getUserProfile(profile.userId).then(user => {
        if (!user) {
          router.push('/profile');
        } else {
          setCheckingProfile(false);
          getShop(profile.userId).then(shop => {
            if (shop) setExistingShopId(profile.userId);
          });
        }
      });
    }
  }, [isInitialized, profile, router]);

  if (liffError) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginTop: '20vh', textAlign: 'center' }}>
        <h1 className="page-title" style={{ color: 'var(--accent-color)' }}>Error</h1>
        <p>{liffError}</p>
      </div>
    );
  }

  if (!isInitialized || checkingProfile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
        <div className="pulse"></div>
        <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  const isAdmin = profile?.userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID;

  return (
    <div className="animate-fade-in" style={{ padding: '24px 0' }}>
      
      {/* Profile Header */}
      {profile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          {profile.pictureUrl ? (
            <img 
              src={profile.pictureUrl} 
              alt="Profile" 
              style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
            />
          ) : (
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {profile.displayName.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Hi, {profile.displayName}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Welcome to YourShop</p>
          </div>
          <button 
            style={{ padding: '8px 12px', background: 'var(--background-white)', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}
            onClick={() => router.push('/profile')}
          >
            Edit Profile
          </button>
        </div>
      )}

      {/* Main Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Buyer Section */}
        <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => router.push('/marketplace')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(123, 97, 255, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              🛍️
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Explore Shops</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Discover amazing shops in your market area</p>
            </div>
          </div>
        </div>

        {/* Seller Section */}
        <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => router.push(existingShopId ? `/shop/${existingShopId}` : '/shop/create')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 218, 114, 0.1)', color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              🏪
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{existingShopId ? 'Manage My Shop' : 'Create a Shop'}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{existingShopId ? 'View orders and update products' : 'Start selling in just a few clicks'}</p>
            </div>
          </div>
        </div>
        
        {/* Admin Section */}
        {isAdmin && (
          <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer', border: '1px solid var(--accent-color)' }} onClick={() => router.push('/admin')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 107, 107, 0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                👑
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', color: 'var(--accent-color)' }}>Admin Dashboard</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Manage markets and app settings</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
