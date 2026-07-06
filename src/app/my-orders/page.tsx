'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLiff } from '@/components/LiffProvider';
import { getBuyerOrders, updateOrderStatus, Order } from '@/lib/db/orders';
import { getUserProfile } from '@/lib/db/users';
import { Shop } from '@/lib/db/shops';
import { useLanguage } from '@/components/LanguageProvider';

export default function MyOrdersPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    
    const fetchData = async () => {
      try {
        const [ordersData, shopsSnap] = await Promise.all([
          getBuyerOrders(profile.userId),
          getDocs(collection(db, 'shops'))
        ]);
        
        // Sort newest first
        const sorted = ordersData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setOrders(sorted);
        
        const shopsMap: Record<string, Shop> = {};
        shopsSnap.docs.forEach(doc => {
          shopsMap[doc.id] = doc.data() as Shop;
        });
        setShops(shopsMap);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading')}</div>;

  const handleCancelOrder = async (order: Order) => {
    if (!confirm(t('confirm_cancel'))) return;

    try {
      await updateOrderStatus(order.id, 'canceled');
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'canceled' } : o));
      
      // Notify Shop Owner
      const shopOwner = await getUserProfile(order.shopId);
      if (shopOwner && shopOwner.email) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-secret': process.env.NEXT_PUBLIC_API_SECRET_KEY || ''
          },
          body: JSON.stringify({
            order,
            type: 'canceled',
            recipientEmail: shopOwner.email
          })
        });
      }
      
      alert(t('cancel_success'));
    } catch (err) {
      console.error(err);
      alert(t('cancel_error'));
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <span style={{ background: '#FFC107', color: 'black', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, height: 'fit-content' }}>{t('waiting_confirm')}</span>;
      case 'accepted': return <span style={{ background: 'var(--primary-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, height: 'fit-content' }}>{t('preparing')}</span>;
      case 'completed': return <span style={{ background: '#4CAF50', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, height: 'fit-content' }}>{t('completed')}</span>;
      case 'rejected': return <span style={{ background: 'var(--accent-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, height: 'fit-content' }}>{t('rejected')}</span>;
      case 'canceled': return <span style={{ background: '#999', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, height: 'fit-content' }}>{t('order_canceled')}</span>;
      default: return null;
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

      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          {t('my_orders')}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {t('my_orders_desc')}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {t('no_orders')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => {
            const shop = shops[order.shopId];
            return (
              <div key={order.id} className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : ''}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      {shop ? shop.name : `Shop ID: ${order.shopId.substring(0,8)}...`}
                    </h3>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                
                <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '8px' }}>
                  {order.items.map((item, i) => {
                    const itemChoicesTotal = item.selectedChoices?.reduce((sum, c) => sum + c.price, 0) || 0;
                    const itemPrice = (item.product.price + itemChoicesTotal) * item.quantity;
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.quantity}x {item.product.name}</div>
                          {item.selectedChoices && item.selectedChoices.length > 0 && (
                            <div style={{ fontSize: '0.8rem', marginLeft: '16px', color: 'var(--text-tertiary)' }}>
                              + {item.selectedChoices.map(c => `${c.name} (฿${c.price})`).join(', ')}
                            </div>
                          )}
                        </div>
                        <span style={{ fontWeight: 600 }}>฿{itemPrice}</span>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: '12px', borderTop: '1px solid #ddd', paddingTop: '12px', fontSize: '1.1rem' }}>
                    <span>{t('total')}</span>
                    <span style={{ color: 'var(--primary-color)' }}>฿{order.totalPrice}</span>
                  </div>
                </div>
                
                {order.rejectReason && order.status === 'rejected' && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--accent-color)', marginBottom: '16px', padding: '8px', background: 'rgba(255,107,107,0.1)', borderRadius: '8px' }}>
                    <strong>เหตุผลที่ปฏิเสธ (Reason):</strong> {order.rejectReason}
                  </div>
                )}

                {order.status === 'pending' && (
                  <button 
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,107,107,0.1)', color: 'var(--accent-color)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', fontWeight: 600 }}
                    onClick={() => handleCancelOrder(order)}
                  >
                    {t('cancel_order')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
