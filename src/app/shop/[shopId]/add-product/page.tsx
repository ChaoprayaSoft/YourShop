'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { addProduct, ProductChoice } from '@/lib/db/products';
import { useLanguage } from '@/components/LanguageProvider';

export default function AddProductPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [choiceType, setChoiceType] = useState<'single' | 'multiple'>('single');
  const [choices, setChoices] = useState<ProductChoice[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!profile || profile.userId !== shopId) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>{t('unauthorized')}</div>;
  }

  const handleAddChoice = () => {
    setChoices([...choices, { name: '', price: 0 }]);
  };

  const handleUpdateChoice = (index: number, field: 'name' | 'price', value: string | number) => {
    const newChoices = [...choices];
    newChoices[index] = { ...newChoices[index], [field]: value };
    setChoices(newChoices);
  };

  const handleRemoveChoice = (index: number) => {
    setChoices(choices.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const validChoices = choices.filter(c => c.name.trim() !== '');

      await addProduct({
        shopId,
        name,
        description,
        price: parseFloat(price),
        imageUrl,
        choiceType,
        choices: validChoices.length > 0 ? validChoices : undefined
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
        onClick={() => router.back()}
      >
        ← {t('back_to_dashboard')}
      </button>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '24px' }}>
          {t('add_product_title')}
        </h1>

        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('product_name')}</label>
            <input 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('product_name_placeholder')}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('price')}</label>
            <input 
              required
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('image_url')}</label>
            <input 
              required
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={t('image_url_placeholder')}
              className="input-field"
            />
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{t('options_title')}</label>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
              {t('options_desc')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('selection_type')}</label>
              <select 
                value={choiceType} 
                onChange={(e) => setChoiceType(e.target.value as 'single' | 'multiple')}
                className="input-field"
              >
                <option value="single">{t('single_choice')}</option>
                <option value="multiple">{t('multiple_choice')}</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {choices.map((choice, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 2 }}>
                    <input 
                      value={choice.name}
                      onChange={(e) => handleUpdateChoice(index, 'name', e.target.value)}
                      placeholder={t('option_name_placeholder')}
                      className="input-field"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input 
                      type="number"
                      min="0"
                      value={choice.price || ''}
                      onChange={(e) => handleUpdateChoice(index, 'price', parseFloat(e.target.value) || 0)}
                      placeholder={t('extra_price')}
                      className="input-field"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveChoice(index)}
                    style={{ padding: '12px', color: 'var(--accent-color)', fontWeight: 'bold' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button 
              type="button"
              onClick={handleAddChoice}
              style={{ color: 'var(--primary-color)', fontWeight: 600, marginTop: '12px', fontSize: '0.9rem' }}
            >
              {t('add_option')}
            </button>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ marginTop: '24px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? t('saving_product') : t('save')}
          </button>
        </form>
      </div>
    </div>
  );
}
