'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShopOrders, Order } from '@/lib/db/orders';

export default function ShopHistoryPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;

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
    return <div style={{ padding: '24px', textAlign: 'center' }}>Unauthorized</div>;
  }

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading History...</div>;

  const historyOrders = orders.filter(o => o.status === 'completed' || o.status === 'rejected');
  
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
        ← Back to Dashboard
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Order History</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Completed and rejected orders</p>
      </div>

      {historyOrders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No order history yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {historyOrders.map(order => (
            <div key={order.id} className="glass-panel" style={{ padding: '16px', opacity: order.status === 'rejected' ? 0.8 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Order from {order.buyerName}</h3>
                {order.status === 'completed' && (
                  <span style={{ background: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Completed</span>
                )}
                {order.status === 'rejected' && (
                  <span style={{ background: 'var(--accent-color)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Rejected</span>
                )}
              </div>
              
              <div style={{ marginBottom: order.status === 'rejected' && order.rejectReason ? '16px' : '0' }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>
                      {item.quantity}x {item.product.name}
                      {item.choice && <span style={{ color: 'var(--secondary-color)', marginLeft: '4px' }}>({item.choice})</span>}
                    </span>
                    <span>฿{item.product.price * item.quantity}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--primary-color)' }}>฿{order.totalPrice}</span>
                </div>
              </div>

              {order.status === 'rejected' && order.rejectReason && (
                <div style={{ background: 'rgba(255, 107, 107, 0.1)', padding: '12px', borderRadius: '8px', color: 'var(--accent-color)', fontSize: '0.9rem' }}>
                  <strong>Reason:</strong> {order.rejectReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
