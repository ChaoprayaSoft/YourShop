'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShop, Shop } from '@/lib/db/shops';
import { getShopProducts, Product } from '@/lib/db/products';
import { placeOrder } from '@/lib/db/orders';

export default function MarketplaceShopPage() {
  const { profile, groupId } = useLiff();
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Cart state: map of productId -> quantity
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    Promise.all([getShop(shopId), getShopProducts(shopId)])
      .then(([shopData, productsData]) => {
        setShop(shopData);
        setProducts(productsData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [shopId]);

  const updateCart = (productId: string, delta: number) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      const newCart = { ...prev };
      if (next === 0) delete newCart[productId];
      else newCart[productId] = next;
      return newCart;
    });
  };

  const handleCheckout = async () => {
    if (!profile || !groupId || !shop) return;
    setPlacingOrder(true);
    try {
      const items = Object.entries(cart).map(([productId, quantity]) => ({
        product: products.find(p => p.id === productId)!,
        quantity
      }));
      
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': process.env.NEXT_PUBLIC_API_SECRET_KEY || ''
        },
        body: JSON.stringify({
          shopId,
          groupId,
          buyerId: profile.userId,
          buyerName: profile.displayName,
          items
        })
      });

      if (!res.ok) {
        throw new Error('Failed to place order securely');
      }
      
      const { order } = await res.json();

      const shopOwnerEmail = (shop as any).ownerEmail;
      if (shopOwnerEmail) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-secret': process.env.NEXT_PUBLIC_API_SECRET_KEY || ''
          },
          body: JSON.stringify({
            type: 'placed',
            recipientEmail: shopOwnerEmail,
            order: order
          })
        });
      }

      alert('Order placed successfully!');
      setCart({});
      // We can also trigger an email API route here if configured
    } catch (err) {
      alert('Failed to place order.');
      console.error(err);
    }
    setPlacingOrder(false);
  };

  const cartTotalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(p => p.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>;
  if (!shop) return <div style={{ padding: '24px', textAlign: 'center' }}>Shop not found!</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '120px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.back()}
      >
        ← Back to Marketplace
      </button>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {shop.ownerPictureUrl && (
          <img src={shop.ownerPictureUrl} alt={shop.ownerName} style={{ width: '64px', height: '64px', borderRadius: '50%' }} />
        )}
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>{shop.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{shop.description}</p>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Products</h2>
      
      {products.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          This shop hasn't added any products yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {products.map(product => (
            <div key={product.id} className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px' }}>
              <div 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  backgroundImage: `url(${product.imageUrl})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  borderRadius: '8px',
                  flexShrink: 0
                }} 
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{product.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>{product.description}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>฿{product.price}</span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {(cart[product.id] || 0) > 0 && (
                      <>
                        <button 
                          onClick={() => updateCart(product.id, -1)}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#eee', fontWeight: 'bold' }}
                        >-</button>
                        <span style={{ fontWeight: 600 }}>{cart[product.id]}</span>
                      </>
                    )}
                    <button 
                      onClick={() => updateCart(product.id, 1)}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', fontWeight: 'bold' }}
                    >+</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Fixed Bottom Bar */}
      {cartTotalItems > 0 && (
        <div style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          padding: '16px', 
          background: 'rgba(255,255,255,0.9)', 
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
        }}>
          <div>
            <div style={{ fontWeight: 600 }}>Total: ฿{cartTotalPrice.toFixed(2)}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{cartTotalItems} items</div>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleCheckout}
            disabled={placingOrder}
            style={{ padding: '12px 24px', opacity: placingOrder ? 0.7 : 1 }}
          >
            {placingOrder ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      )}
    </div>
  );
}
