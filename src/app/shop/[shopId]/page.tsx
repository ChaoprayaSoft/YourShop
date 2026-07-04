'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShop, Shop } from '@/lib/db/shops';
import { getShopProducts, Product } from '@/lib/db/products';
import { getShopOrders, updateOrderStatus, Order } from '@/lib/db/orders';

export default function ShopDashboard() {
  const { profile } = useLiff();
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    Promise.all([getShop(shopId), getShopProducts(shopId), getShopOrders(shopId)])
      .then(([shopData, productsData, ordersData]) => {
        setShop(shopData);
        setProducts(productsData);
        setOrders(ordersData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [shopId]);

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading Shop...</div>;

  if (!shop) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', marginTop: '20vh' }}>
        <h2>Shop not found!</h2>
        <button className="btn-primary" onClick={() => router.push('/')} style={{ marginTop: '16px' }}>Go Home</button>
      </div>
    );
  }

  const isOwner = profile?.userId && shopId.endsWith(profile.userId);

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/')}
      >
        ← Home
      </button>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h1 className="page-title">{shop.name}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{shop.description}</p>
        <div style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
          By {shop.ownerName}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Products ({products.length})</h2>
        {isOwner && (
          <button 
            className="btn-primary" 
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
            onClick={() => router.push(`/shop/${shopId}/add-product`)}
          >
            + Add Product
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No products added yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {products.map(product => (
            <div key={product.id} className="glass-panel" style={{ padding: '12px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: '100%', 
                  paddingTop: '100%', 
                  backgroundImage: `url(${product.imageUrl})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }} 
              />
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{product.name}</h3>
              <p style={{ fontWeight: 600, color: 'var(--primary-color)' }}>฿{product.price}</p>
            </div>
          ))}
        </div>
      )}

      {isOwner && orders.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Pending Orders</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} className="glass-panel" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Order from {order.buyerName}</h3>
                <div style={{ marginBottom: '12px' }}>
                  {order.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span>{item.quantity}x {item.product.name}</span>
                      <span>฿{item.product.price * item.quantity}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--primary-color)' }}>฿{order.totalPrice}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', fontWeight: 600 }}
                    onClick={async () => {
                      await updateOrderStatus(order.id, 'rejected');
                      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'rejected' } : o));
                    }}
                  >
                    Reject
                  </button>
                  <button 
                    className="btn-primary"
                    style={{ flex: 1, padding: '8px', borderRadius: '8px' }}
                    onClick={async () => {
                      await updateOrderStatus(order.id, 'accepted');
                      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'accepted' } : o));
                      // We can send an email via API here
                    }}
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
            {orders.filter(o => o.status === 'pending').length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No pending orders.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
