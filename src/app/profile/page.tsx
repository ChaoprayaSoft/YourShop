'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getUserProfile, updateUserProfile } from '@/lib/db/users';
import { getAllMarkets, Market } from '@/lib/db/markets';
import { useLanguage } from '@/components/LanguageProvider';

export default function ProfilePage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [address, setAddress] = useState('');
  const [marketId, setMarketId] = useState('');
  const [email, setEmail] = useState('');
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
        setEmail(userProfile.email || '');
      } else {
        setIsFirstTime(true);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(t('profile_error'));
      setLoading(false);
    });
  }, [profile, t]);

  if (!profile) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading')}</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId) {
      setError(t('select_market_error'));
      return;
    }
    
    setSaving(true);
    setError('');

    try {
      await updateUserProfile(profile.userId, {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        address,
        marketId,
        email
      });
      router.push('/');
    } catch (err: any) {
      setError(err.message || t('error'));
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
          ← {t('back')}
        </button>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          {isFirstTime ? t('setup_welcome') : t('edit_profile')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {isFirstTime ? t('setup_desc') : t('edit_profile_desc')}
        </p>
        
        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('email_label')}</label>
            <input 
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email_placeholder')}
              className="input-field"
            />
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600 }}>
              {t('email_notice')}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('address_label')}</label>
            <textarea 
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('address_placeholder')}
              rows={3}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('market_label')}</label>
            {loading ? (
              <div style={{ padding: '12px', fontSize: '0.9rem', color: '#999' }}>{t('market_loading')}</div>
            ) : markets.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.9rem', color: 'red' }}>{t('market_empty')}</div>
            ) : (
              <select 
                value={marketId}
                onChange={e => setMarketId(e.target.value)}
                className="input-field"
                required
              >
                <option value="" disabled>{t('market_select')}</option>
                {markets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            <div style={{ fontSize: '0.8rem', color: '#999' }}>
              {t('market_hint')}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={saving || markets.length === 0}
            style={{ marginTop: '16px', opacity: (saving || markets.length === 0) ? 0.7 : 1 }}
          >
            {saving ? t('saving') : (isFirstTime ? t('complete_setup') : t('save_changes'))}
          </button>
        </form>
      </div>
    </div>
  );
}
