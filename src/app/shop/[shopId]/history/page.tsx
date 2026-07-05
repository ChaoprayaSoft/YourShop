'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShopOrders, Order } from '@/lib/db/orders';
import { useLanguage } from '@/components/LanguageProvider';

export default function ShopHistoryPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;
  const { t } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    getShopOrders(shopId)
      .then(ordersData => {
        setOrders(ordersData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [shopId]);

  if (!profile || profile.userId !== shopId) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>{t('unauthorized')}</div>;
  }

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading')}</div>;

  const historyOrders = orders.filter(o => o.status === 'completed' || o.status === 'rejected' || o.status === 'canceled');
  
  // Sort by created at descending if available, else just display
  historyOrders.sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    }
    return 0;
  });

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.back()}
      >
        ← {t('back_to_dashboard')}
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">{t('order_history')}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('completed_rejected_orders')}</p>
      </div>

      {historyOrders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {t('no_history')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {historyOrders.map(order => (
            <div key={order.id} className="glass-panel" style={{ padding: '16px', opacity: order.status === 'rejected' ? 0.8 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : ''}
                  </div>
                  <h3 style={{ fontSize: '1.1rem' }}>{t('order_from')} {order.buyerName}</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {order.status === 'completed' && (
                    <span style={{ background: 'var(--primary-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, height: 'fit-content' }}>{t('completed')}</span>
                  )}
                  {order.status === 'rejected' && (
                    <span style={{ background: 'var(--accent-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, height: 'fit-content' }}>{t('rejected')}</span>
                  )}
                  {order.status === 'canceled' && (
                    <span style={{ background: '#999', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, height: 'fit-content' }}>{t('order_canceled')}</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(123, 97, 255, 0.05)', borderRadius: '8px', fontSize: '0.9rem' }}>
                <strong>📍 Delivery Address:</strong> {order.buyerAddress || 'No address provided'}
              </div>
              
              <div style={{ marginBottom: order.status === 'rejected' && order.rejectReason ? '16px' : '0' }}>
                {order.items.map((item, i) => {
                  const itemChoicesTotal = item.selectedChoices?.reduce((sum, c) => sum + c.price, 0) || 0;
                  const itemPrice = (item.product.price + itemChoicesTotal) * item.quantity;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.quantity}x {item.product.name}</div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                  <span>{t('total')}</span>
                  <span style={{ color: 'var(--primary-color)' }}>฿{order.totalPrice}</span>
                </div>
              </div>

              {order.status === 'rejected' && order.rejectReason && (
                <div style={{ background: 'rgba(255, 107, 107, 0.1)', padding: '12px', borderRadius: '8px', color: 'var(--accent-color)', fontSize: '0.9rem' }}>
                  <strong>{t('reason')}:</strong> {order.rejectReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
