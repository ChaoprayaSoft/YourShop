'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/lib/db/orders';
import { Shop } from '@/lib/db/shops';
import { Market, getAllMarkets } from '@/lib/db/markets';
import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import Select from '@/components/Select';

export default function AdminOrdersPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only allow admin
    if (profile && profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [ordersSnap, shopsSnap, marketsData] = await Promise.all([
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
          getDocs(collection(db, 'shops')),
          getAllMarkets()
        ]);
        
        setOrders(ordersSnap.docs.map(d => d.data() as Order));
        
        const shopsMap: Record<string, Shop> = {};
        shopsSnap.docs.forEach(doc => {
          shopsMap[doc.id] = doc.data() as Shop;
        });
        setShops(shopsMap);
        setMarkets(marketsData);

      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (profile) fetchData();
  }, [profile, router]);

  if (!profile || profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) return null;
  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading')}</div>;

  // Filter orders by market
  const filteredOrders = orders.filter(order => {
    if (selectedMarketId === 'ALL') return true;
    const shop = shops[order.shopId];
    if (!shop) return false;
    return shop.marketId === selectedMarketId;
  });

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/admin')}
      >
        ← {t('back')}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>{t('recent_orders')}</h1>
        <Select 
          value={selectedMarketId}
          onChange={(val) => setSelectedMarketId(val)}
          options={[
            { label: 'All Markets', value: 'ALL' },
            ...markets.map(m => ({ label: m.name, value: m.id }))
          ]}
          style={{ width: '200px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredOrders.map(order => {
          const shop = shops[order.shopId];
          const market = shop ? markets.find(m => m.id === shop.marketId) : null;
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : '';
          
          return (
            <div key={order.id} className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{orderDate}</div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{shop ? shop.name : `Shop ${order.shopId.substring(0,8)}`}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    📍 {market ? market.name : 'Unknown Market'} | 👤 {t('by')} {order.buyerName}
                  </div>
                </div>
                <div style={{ 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontSize: '0.8rem', 
                  fontWeight: 600,
                  backgroundColor: order.status === 'accepted' || order.status === 'completed' ? '#d4edda' : order.status === 'rejected' || order.status === 'canceled' ? '#f8d7da' : '#fff3cd',
                  color: order.status === 'accepted' || order.status === 'completed' ? '#155724' : order.status === 'rejected' || order.status === 'canceled' ? '#721c24' : '#856404'
                }}>
                  {order.status.toUpperCase()}
                </div>
              </div>
              
              <div style={{ background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>
                {order.items.map((item, i) => {
                  const itemChoicesTotal = item.selectedChoices?.reduce((sum, c) => sum + c.price, 0) || 0;
                  const itemPrice = (item.product.price + itemChoicesTotal) * item.quantity;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.quantity}x {item.product.name}</span>
                        {item.selectedChoices && item.selectedChoices.length > 0 && (
                          <span style={{ fontSize: '0.8rem', marginLeft: '8px', color: 'var(--text-tertiary)' }}>
                            (+ {item.selectedChoices.map(c => c.name).join(', ')})
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: 600 }}>฿{itemPrice}</span>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: '8px', borderTop: '1px solid #ddd', paddingTop: '8px', color: 'var(--text-primary)' }}>
                  <span>{t('total')}</span>
                  <span style={{ color: 'var(--primary-color)' }}>฿{order.totalPrice}</span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredOrders.length === 0 && <div style={{ color: '#999', textAlign: 'center', padding: '24px' }}>{t('no_orders')}</div>}
      </div>
    </div>
  );
}
