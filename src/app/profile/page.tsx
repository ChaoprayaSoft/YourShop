'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getUserProfile, updateUserProfile } from '@/lib/db/users';
import { getAllMarkets, Market } from '@/lib/db/markets';

export default function ProfilePage() {
  const { profile } = useLiff();
  const router = useRouter();
  
  const [address, setAddress] = useState('');
  const [marketId, setMarketId] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    Promise.all([
      getUserProfile(profile.userId),
      getAllMarkets()
    ]).then(([userProfile, allMarkets]) => {
      setMarkets(allMarkets);
      if (userProfile) {
        setAddress(userProfile.address || '');
        setMarketId(userProfile.marketId || '');
      } else {
        setIsFirstTime(true);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('Failed to load profile data');
      setLoading(false);
    });
  }, [profile]);

  if (!profile) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading Profile...</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId) {
      setError('Please select a market location');
      return;
    }
    
    setSaving(true);
    setError('');

    try {
      await updateUserProfile(profile.userId, {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        address,
        marketId
      });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      {!isFirstTime && (
        <button 
          style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
          onClick={() => router.back()}
        >
          ← Back
        </button>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          {isFirstTime ? 'Welcome! Let\'s setup your profile' : 'Edit Profile'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {isFirstTime ? 'Please provide your delivery address and default market location to start shopping.' : 'Update your delivery address or default market.'}
        </p>
        
        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Delivery Address</label>
            <textarea 
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House Number, Street, Building, Floor, etc."
              rows={3}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Default Market Location</label>
            {loading ? (
              <div style={{ padding: '12px', fontSize: '0.9rem', color: '#999' }}>Loading markets...</div>
            ) : markets.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.9rem', color: 'red' }}>No markets exist.</div>
            ) : (
              <select 
                value={marketId}
                onChange={e => setMarketId(e.target.value)}
                className="input-field"
                required
              >
                <option value="" disabled>Select your market...</option>
                {markets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            <div style={{ fontSize: '0.8rem', color: '#999' }}>
              Shops from this market will be displayed when you explore.
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={saving || markets.length === 0}
            style={{ marginTop: '16px', opacity: (saving || markets.length === 0) ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : (isFirstTime ? 'Complete Setup' : 'Save Changes')}
          </button>
        </form>
      </div>
    </div>
  );
}
