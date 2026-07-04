'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { addProduct } from '@/lib/db/products';
import { uploadImage } from '@/lib/storage';

export default function AddProductPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (profile?.userId !== shopId) {
    return <div style={{ padding: '24px' }}>Unauthorized</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      setError('Please select an image');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // 1. Upload Image
      const imagePath = `products/${shopId}/${Date.now()}_${image.name}`;
      const imageUrl = await uploadImage(image, imagePath);

      // 2. Add Product to Firestore
      await addProduct(shopId, {
        name,
        description,
        price: parseFloat(price),
        imageUrl
      });

      router.push(`/shop/${shopId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to add product');
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.back()}
      >
        ← Back to Shop
      </button>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Add Product</h1>
        
        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Product Image</label>
            <input 
              required
              type="file" 
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                background: 'white'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Product Name</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chocolate Chip Cookie"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Price (฿)</label>
            <input 
              required
              type="number" 
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Delicious details..."
              rows={3}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ marginTop: '16px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  );
}
