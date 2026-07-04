'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getProduct, updateProduct, ProductChoice } from '@/lib/db/products';
import { uploadImage } from '@/lib/storage';

export default function EditProductPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;
  const productId = params.productId as string;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  
  const [choiceType, setChoiceType] = useState<'single' | 'multiple'>('single');
  const [choices, setChoices] = useState<ProductChoice[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProduct(productId).then(product => {
      if (product && product.shopId === shopId) {
        setName(product.name);
        setDescription(product.description);
        setPrice(product.price.toString());
        setExistingImageUrl(product.imageUrl);
        setChoiceType(product.choiceType || 'single');
        setChoices(product.choices || []);
      } else {
        setError('Product not found');
      }
      setLoadingData(false);
    }).catch(err => {
      console.error(err);
      setError('Failed to load product');
      setLoadingData(false);
    });
  }, [productId, shopId]);

  if (loadingData) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading Product...</div>;
  if (!profile || profile.userId !== shopId) return <div style={{ padding: '24px', textAlign: 'center' }}>Unauthorized</div>;
  if (error) return <div style={{ padding: '24px', textAlign: 'center' }}>{error}</div>;

  const addChoice = () => {
    setChoices([...choices, { name: '', price: 0 }]);
  };

  const updateChoice = (index: number, field: keyof ProductChoice, value: any) => {
    const newChoices = [...choices];
    newChoices[index] = { ...newChoices[index], [field]: value };
    setChoices(newChoices);
  };

  const removeChoice = (index: number) => {
    const newChoices = [...choices];
    newChoices.splice(index, 1);
    setChoices(newChoices);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) {
      setError('Please fill in all required fields');
      return;
    }

    // Filter out empty choices
    const validChoices = choices.filter(c => c.name.trim().length > 0);

    setLoading(true);
    setError('');

    try {
      let finalImageUrl = existingImageUrl;
      
      if (image) {
        const imagePath = `products/${shopId}/${Date.now()}_${image.name}`;
        finalImageUrl = await uploadImage(image, imagePath);
      }

      await updateProduct(productId, {
        name,
        description,
        price: parseFloat(price),
        imageUrl: finalImageUrl,
        choiceType,
        choices: validChoices
      });

      router.push(`/shop/${shopId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.back()}
      >
        ← Back to Shop
      </button>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Edit Product</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Update the details of this item.</p>
        
        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Product Image</label>
            {existingImageUrl && !image && (
              <img src={existingImageUrl} alt="Current" style={{ width: '100px', height: '100px', borderRadius: '8px', objectFit: 'cover', marginBottom: '8px' }} />
            )}
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="input-field"
            />
            <div style={{ fontSize: '0.8rem', color: '#999' }}>Leave empty to keep current image</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Product Name</label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chocolate Chip Cookie"
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Base Price (฿)</label>
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
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Delicious details..."
              rows={3}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Options Section */}
          <div style={{ marginTop: '16px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px', background: 'var(--background-white)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Options (Optional)</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Selection Type</label>
              <select 
                value={choiceType}
                onChange={(e) => setChoiceType(e.target.value as 'single' | 'multiple')}
                className="input-field"
              >
                <option value="single">Single Choice (Radio Buttons)</option>
                <option value="multiple">Multiple Choice (Checkboxes)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {choices.map((choice, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text"
                    placeholder="Option Name"
                    value={choice.name}
                    onChange={(e) => updateChoice(index, 'name', e.target.value)}
                    className="input-field"
                    style={{ flex: 1 }}
                  />
                  <input 
                    type="number"
                    placeholder="+฿ Price"
                    min="0"
                    step="0.01"
                    value={choice.price === 0 ? '' : choice.price}
                    onChange={(e) => updateChoice(index, 'price', e.target.value ? parseFloat(e.target.value) : 0)}
                    className="input-field"
                    style={{ width: '90px' }}
                  />
                  <button type="button" onClick={() => removeChoice(index)} style={{ color: 'red', fontWeight: 'bold', padding: '8px' }}>X</button>
                </div>
              ))}
            </div>
            
            <button 
              type="button" 
              onClick={addChoice}
              style={{ marginTop: '12px', padding: '8px 16px', border: '1px dashed var(--primary-color)', color: 'var(--primary-color)', borderRadius: '8px', width: '100%' }}
            >
              + Add Option
            </button>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ marginTop: '16px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
