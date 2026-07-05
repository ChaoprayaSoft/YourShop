'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { createShop } from '@/lib/db/shops';
import { getUserProfile } from '@/lib/db/users';
import { useLanguage } from '@/components/LanguageProvider';

export default function CreateShopPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!profile) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading')}</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await getUserProfile(profile.userId);
      if (!user || !user.marketId) {
        setError(t('select_market_error'));
        setLoading(false);
        return;
      }

      const shopId = await createShop({
        id: profile.userId,
        name,
        description,
        ownerName: profile.displayName,
        ownerPictureUrl: profile.pictureUrl,
        marketId: user.marketId
      });

      router.push(`/shop/${shopId}`);
    } catch (err: any) {
      setError(err.message || t('error'));
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/')}
      >
        ← {t('home')}
      </button>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          {t('create_shop_title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {t('create_shop_subtitle')}
        </p>

        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('shop_name')}</label>
            <input 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('shop_name_placeholder')}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('description')}</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('description_placeholder')}
              rows={3}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ marginTop: '16px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? t('saving') : t('create_shop')}
          </button>
        </form>
      </div>
    </div>
  );
}
