'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShop, updateShop, Shop } from '@/lib/db/shops';
import { getShopProducts, Product, ProductChoice } from '@/lib/db/products';
import { getShopOrders, subscribeToShopOrders, updateOrderStatus, Order, placeOrder } from '@/lib/db/orders';
import { getMarket } from '@/lib/db/markets';
import { getUserProfile, UserProfile } from '@/lib/db/users';
import { useLanguage } from '@/components/LanguageProvider';

type CartItem = { product: Product; quantity: number; selectedChoices?: ProductChoice[] };

export default function ShopDashboard() {
  const { profile, namespace } = useLiff();
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;
  const { t } = useLanguage();

  const [shop, setShop] = useState<Shop | null>(null);
  const [marketName, setMarketName] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);

  // Buyer States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<ProductChoice[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showCartModal, setShowCartModal] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Owner States
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showAdsModal, setShowAdsModal] = useState(false);
  const [adMessage, setAdMessage] = useState('');
  const [savingAd, setSavingAd] = useState(false);
  
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpPackage, setTopUpPackage] = useState<number | null>(null);
  const [transferDate, setTransferDate] = useState('');
  const [transferTime, setTransferTime] = useState('');
  const [submittingTopUp, setSubmittingTopUp] = useState(false);
  
  const promptpayNumber = process.env.NEXT_PUBLIC_PROMPTPAY_NUMBER || '0909739266';

  useEffect(() => {
    if (!shopId) return;
    
    let unsubscribeOrders: () => void;
    
    Promise.all([getShop(shopId), getShopProducts(shopId), getUserProfile(shopId)])
      .then(async ([shopData, productsData, ownerData]) => {
        setShop(shopData);
        if (shopData?.adMessage) {
          setAdMessage(shopData.adMessage);
        }
        setProducts(productsData);
        setOwnerProfile(ownerData);
        
        if (shopData?.marketId) {
          const m = await getMarket(shopData.marketId);
          if (m) setMarketName(m.name);
        }
        
        unsubscribeOrders = subscribeToShopOrders(shopId, (newOrders) => {
          setOrders(newOrders);
        });
        
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
      
    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [shopId]);

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>{t('loading')}</div>;

  if (!shop) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', marginTop: '20vh' }}>
        <h2>{t('shop_not_found')}</h2>
        <button className="btn-primary" onClick={() => router.push('/')} style={{ marginTop: '16px' }}>{t('go_home')}</button>
      </div>
    );
  }

  const isOwner = profile?.userId === shopId;
  const isClosed = shop.isOpen === false;
  
  const completedOrdersCount = orders.filter(o => o.status === 'completed').length;
  const maintenanceFee = completedOrdersCount >= 5 ? 2 : 5;
  const dueDateMillis = shop.maintenanceFeeDueDate?.toMillis ? shop.maintenanceFeeDueDate.toMillis() : Date.now();
  const daysUntilDue = Math.ceil((dueDateMillis - Date.now()) / (1000 * 60 * 60 * 24));
  const isPastDue = daysUntilDue <= 0;

  // --- Functions ---
  const handleToggleShopStatus = async () => {
    const newStatus = !isClosed;
    if (newStatus && isPastDue) {
      alert(`ไม่สามารถเปิดร้านได้ กรุณาชำระค่าธรรมเนียมบำรุงรักษาก่อน (Cannot open shop, please pay maintenance fee)`);
      return;
    }
    if (!confirm(newStatus ? 'Are you sure you want to OPEN the shop?' : 'Are you sure you want to CLOSE the shop?')) return;
    try {
      await updateShop(shopId, { isOpen: newStatus });
      setShop({ ...shop, isOpen: newStatus });
    } catch (err) {
      console.error(err);
      alert(t('error'));
    }
  };

  const handlePayMaintenanceFee = async () => {
    if (!ownerProfile) return;
    if (ownerProfile.coins < maintenanceFee) {
      alert('เหรียญไม่พอ กรุณาเติมเหรียญ (Not enough coins, please top up)');
      return;
    }
    
    const confirmMsg = `ชำระค่าบำรุงรักษา ${maintenanceFee} เหรียญ สำหรับ 30 วัน? (Pay ${maintenanceFee} coins for 30 days?)`;
    if (!confirm(confirmMsg)) return;

    try {
      // 1. Deduct coins
      const { updateUserProfile } = await import('@/lib/db/users');
      await updateUserProfile(shopId, { coins: ownerProfile.coins - maintenanceFee });
      
      // 2. Extend due date
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + 30);
      await updateShop(shopId, { maintenanceFeeDueDate: newDueDate, isOpen: true });
      
      // Update local state
      setOwnerProfile({ ...ownerProfile, coins: ownerProfile.coins - maintenanceFee });
      setShop({ ...shop, maintenanceFeeDueDate: { toMillis: () => newDueDate.getTime() }, isOpen: true });
      alert('ชำระค่าบำรุงรักษาและเปิดร้านเรียบร้อยแล้ว (Maintenance fee paid and shop is now open)');
    } catch (err) {
      console.error(err);
      alert(t('error'));
    }
  };

  useEffect(() => {
    // Auto-close if past due
    if (isOwner && shop && shop.isOpen && isPastDue) {
      updateShop(shopId, { isOpen: false }).then(() => {
        setShop(prev => prev ? { ...prev, isOpen: false } : prev);
        alert('ร้านค้าถูกปิดอัตโนมัติเนื่องจากเกินกำหนดชำระค่าบำรุงรักษา (Shop was automatically closed due to past due maintenance fee)');
      }).catch(console.error);
    }
  }, [isOwner, shop, isPastDue, shopId]);

  const sendNotification = async (order: Order, type: 'placed' | 'accepted' | 'rejected' | 'completed') => {
    try {
      const targetUserId = type === 'placed' ? order.shopId : order.buyerId;
      const targetUser = await getUserProfile(targetUserId);
      if (targetUser && targetUser.email) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order,
            type,
            recipientEmail: targetUser.email
          })
        });
      }
    } catch (err) {
      console.error('Failed to send notification', err);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct || isClosed) return;
    setCart(prev => {
      const existing = prev.find(item => {
        if (item.product.id !== selectedProduct.id) return false;
        const c1 = item.selectedChoices?.map(c => c.name).sort().join(',') || '';
        const c2 = selectedChoices.map(c => c.name).sort().join(',');
        return c1 === c2;
      });

      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { product: selectedProduct, quantity, selectedChoices: [...selectedChoices] }];
    });
    setSelectedProduct(null);
  };

  const handlePlaceOrder = async () => {
    if (!profile || cart.length === 0 || isClosed) return;
    setPlacingOrder(true);
    try {
      const user = await getUserProfile(profile.userId);
      const buyerAddress = user?.address || 'No delivery address provided';

      const totalPrice = cart.reduce((sum, item) => {
        const choicesTotal = item.selectedChoices?.reduce((cSum, c) => cSum + c.price, 0) || 0;
        return sum + ((item.product.price + choicesTotal) * item.quantity);
      }, 0);

      const orderData = {
        shopId,
        groupId: namespace || 'direct',
        buyerId: profile.userId,
        buyerName: profile.displayName,
        buyerAddress,
        items: cart,
        totalPrice
      };
      
      const orderId = await placeOrder(orderData);
      
      // Notify Shop Owner
      await sendNotification({ ...orderData, id: orderId, status: 'pending', createdAt: new Date() }, 'placed');

      setCart([]);
      setShowCartModal(false);
      alert(t('order_success'));
    } catch (err) {
      console.error(err);
      alert(t('order_error'));
    } finally {
      setPlacingOrder(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => {
    const choicesTotal = item.selectedChoices?.reduce((cSum, c) => cSum + c.price, 0) || 0;
    return sum + ((item.product.price + choicesTotal) * item.quantity);
  }, 0);

  const handleRejectSubmit = async () => {
    if (!rejectingOrder || !rejectReason) return;
    await updateOrderStatus(rejectingOrder.id, 'rejected', rejectReason);
    setOrders(prev => prev.map(o => o.id === rejectingOrder.id ? { ...o, status: 'rejected', rejectReason } : o));
    
    // Notify Buyer
    await sendNotification({ ...rejectingOrder, status: 'rejected', rejectReason }, 'rejected');
    
    setRejectingOrder(null);
    setRejectReason('');
  };

  const getProductPriceWithChoices = () => {
    if (!selectedProduct) return 0;
    const choicesTotal = selectedChoices.reduce((sum, c) => sum + c.price, 0);
    return selectedProduct.price + choicesTotal;
  };

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '100px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/')}
      >
        ← {t('home')}
      </button>

      {/* Shop Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', opacity: isClosed ? 0.7 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {shop.name}
              {isClosed && <span style={{ fontSize: '0.8rem', background: '#999', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>CLOSED</span>}
            </h1>
            {marketName && (
              <div style={{ display: 'inline-block', background: 'rgba(123, 97, 255, 0.1)', color: 'var(--secondary-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px' }}>
                📍 {marketName}
              </div>
            )}
            <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>{shop.description}</p>
            <div style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
              {t('by')} {shop.ownerName}
            </div>
          </div>
          {isOwner && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>🪙 {ownerProfile?.coins || 0} Coins</span>
                <button 
                  style={{ background: 'var(--primary-color)', color: 'white', padding: '4px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, border: 'none' }}
                  onClick={() => setShowTopUpModal(true)}
                >
                  Top Up
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: isPastDue ? '#c62828' : 'var(--text-secondary)', marginBottom: '8px' }}>
                Shop fees {maintenanceFee} coins in {Math.max(0, daysUntilDue)} days
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {isPastDue ? (
                  <button 
                    style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '99px', fontSize: '0.9rem', fontWeight: 600 }}
                    onClick={handlePayMaintenanceFee}
                  >
                    Pay Maintenance Fee
                  </button>
                ) : (
                  <button 
                    onClick={handleToggleShopStatus}
                    style={{ 
                      background: isClosed ? 'var(--primary-color)' : 'rgba(255, 107, 107, 0.1)', 
                      color: isClosed ? 'white' : 'var(--accent-color)', 
                      border: isClosed ? 'none' : '1px solid rgba(255,107,107,0.3)', 
                      padding: '6px 12px', 
                      borderRadius: '99px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600 
                    }}
                  >
                    {isClosed ? 'Open Shop' : 'Close Shop'}
                  </button>
                )}
              </div>
              <button 
                style={{ background: 'var(--secondary-color)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '99px', fontSize: '0.9rem', fontWeight: 600 }}
                onClick={() => setShowAdsModal(true)}
              >
                สร้าง Ads
              </button>
              <button 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                onClick={() => router.push(`/shop/${shopId}/edit`)}
              >
                {t('edit_shop')}
              </button>
              <button 
                style={{ background: 'var(--background-white)', color: 'var(--text-primary)', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '99px', fontSize: '0.9rem', fontWeight: 600 }}
                onClick={() => router.push(`/shop/${shopId}/history`)}
              >
                {t('history')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem' }}>{t('all_products')} ({products.length}/{shop.productSlots || 2})</h2>
        {isOwner && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-secondary" 
              style={{ padding: '8px 16px', fontSize: '0.9rem', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}
              onClick={async () => {
                if ((ownerProfile?.coins || 0) < 5) {
                  alert('เหรียญไม่พอ กรุณาเติมเหรียญ (Not enough coins)');
                  return;
                }
                if (confirm('เพิ่มช่องสินค้า 1 ช่อง ใช้ 5 เหรียญ? (Buy 1 product slot for 5 coins?)')) {
                  try {
                    const { updateUserProfile } = await import('@/lib/db/users');
                    await updateUserProfile(shopId, { coins: (ownerProfile?.coins || 0) - 5 });
                    await updateShop(shopId, { productSlots: (shop.productSlots || 2) + 1 });
                    setOwnerProfile(prev => prev ? { ...prev, coins: prev.coins - 5 } : prev);
                    setShop({ ...shop, productSlots: (shop.productSlots || 2) + 1 });
                  } catch (err) {
                    console.error(err);
                    alert('Error');
                  }
                }
              }}
            >
              Buy Slot
            </button>
            <button 
              className="btn-primary" 
              style={{ padding: '8px 16px', fontSize: '0.9rem', opacity: products.length >= (shop.productSlots || 2) ? 0.5 : 1 }}
              onClick={() => {
                if (products.length >= (shop.productSlots || 2)) {
                  alert('ช่องสินค้าเต็ม กรุณาซื้อช่องสินค้าเพิ่ม (Product slots full, please buy more slots)');
                  return;
                }
                router.push(`/shop/${shopId}/add-product`);
              }}
            >
              {t('add_product')}
            </button>
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {t('no_products')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {products.map(product => (
            <div 
              key={product.id} 
              className="glass-panel" 
              style={{ padding: '12px', overflow: 'hidden', cursor: isOwner ? 'default' : 'pointer' }}
              onClick={() => {
                if (!isOwner) {
                  setSelectedProduct(product);
                  if (product.choiceType === 'single' && product.choices && product.choices.length > 0) {
                    setSelectedChoices([product.choices[0]]);
                  } else {
                    setSelectedChoices([]);
                  }
                  setQuantity(1);
                }
              }}
            >
              <div 
                style={{ 
                  width: '100%', 
                  paddingTop: '100%', 
                  backgroundImage: `url(${product.imageUrl})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  filter: isClosed ? 'grayscale(100%)' : 'none'
                }} 
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '1rem', color: isClosed ? '#999' : 'inherit' }}>{product.name}</h3>
                {isOwner && (
                  <button 
                    style={{ background: 'var(--background-white)', border: '1px solid #ddd', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/shop/${shopId}/product/${product.id}/edit`);
                    }}
                  >
                    {t('edit')}
                  </button>
                )}
              </div>
              <p style={{ fontWeight: 600, color: isClosed ? '#999' : 'var(--primary-color)' }}>฿{product.price}</p>
            </div>
          ))}
        </div>
      )}

      {/* Owner Dashboard - Orders */}
      {isOwner && orders.some(o => o.status === 'pending' || o.status === 'accepted') && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>{t('pending_orders')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.filter(o => o.status === 'pending' || o.status === 'accepted').map(order => (
              <div key={order.id} className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : ''}
                    </div>
                    <h3 style={{ fontSize: '1.1rem' }}>{t('order_from')} {order.buyerName}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {order.status === 'accepted' && (
                      <span style={{ background: 'var(--primary-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, height: 'fit-content' }}>{t('preparing')}</span>
                    )}
                    {order.status === 'pending' && (
                      <span style={{ background: '#FFC107', color: 'black', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, height: 'fit-content' }}>{t('waiting_confirm')}</span>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(123, 97, 255, 0.05)', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <strong>📍 Delivery Address:</strong> {order.buyerAddress || 'No address provided'}
                </div>
                
                <div style={{ marginBottom: '16px' }}>
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

                {order.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', fontWeight: 600 }}
                      onClick={() => setRejectingOrder(order)}
                    >
                      {t('reject')}
                    </button>
                    <button 
                      className="btn-primary"
                      style={{ flex: 1, padding: '8px', borderRadius: '8px' }}
                      onClick={async () => {
                        await updateOrderStatus(order.id, 'accepted');
                        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'accepted' } : o));
                        await sendNotification({ ...order, status: 'accepted' }, 'accepted');
                      }}
                    >
                      {t('accept_order')}
                    </button>
                  </div>
                )}
                
                {order.status === 'accepted' && (
                  <button 
                    className="btn-primary"
                    style={{ width: '100%', padding: '8px', borderRadius: '8px' }}
                    onClick={async () => {
                      await updateOrderStatus(order.id, 'completed');
                      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed' } : o));
                      await sendNotification({ ...order, status: 'completed' }, 'completed');
                    }}
                  >
                    {t('mark_completed')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Modals --- */}
      
      {/* Product Details Modal (Buyer) */}
      {selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '400px', background: 'white', overflow: 'hidden', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <div 
              style={{ width: '100%', height: '250px', backgroundImage: `url(${selectedProduct.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: isClosed ? 'grayscale(100%)' : 'none' }} 
            />
            <div style={{ padding: '24px', maxHeight: '50vh', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{selectedProduct.name}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{selectedProduct.description}</p>
              
              {isClosed ? (
                <div style={{ padding: '16px', background: '#ffebee', color: '#c62828', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', marginBottom: '24px' }}>
                  This shop is currently closed. You cannot place orders.
                </div>
              ) : (
                <>
                  {selectedProduct.choices && selectedProduct.choices.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '12px' }}>
                        {selectedProduct.choiceType === 'single' ? t('select_choice') : t('select_add_on')}
                      </label>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedProduct.choices.map((c, i) => {
                          const choiceName = typeof c === 'string' ? c : c.name;
                          const choicePrice = typeof c === 'string' ? 0 : (c.price || 0);
                          const isChecked = selectedChoices.some(sc => sc.name === choiceName);
                          
                          return (
                            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer', background: isChecked ? 'rgba(123, 97, 255, 0.05)' : 'white' }}>
                              <input 
                                type={selectedProduct.choiceType === 'single' ? "radio" : "checkbox"} 
                                name="product_choice"
                                checked={isChecked}
                                onChange={(e) => {
                                  const choiceObj = { name: choiceName, price: choicePrice };
                                  if (selectedProduct.choiceType === 'single') {
                                    setSelectedChoices([choiceObj]);
                                  } else {
                                    if (e.target.checked) {
                                      setSelectedChoices([...selectedChoices, choiceObj]);
                                    } else {
                                      setSelectedChoices(selectedChoices.filter(sc => sc.name !== choiceName));
                                    }
                                  }
                                }}
                                style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }}
                              />
                              <div style={{ flex: 1 }}>{choiceName}</div>
                              {choicePrice > 0 && <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>+฿{choicePrice}</div>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <span style={{ fontWeight: 600 }}>{t('quantity')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <button 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eee', fontWeight: 'bold' }}
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      >-</button>
                      <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{quantity}</span>
                      <button 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eee', fontWeight: 'bold' }}
                        onClick={() => setQuantity(q => q + 1)}
                      >+</button>
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  style={{ flex: 1, padding: '16px', border: '1px solid #ddd', borderRadius: '12px', fontWeight: 600 }}
                  onClick={() => setSelectedProduct(null)}
                >
                  {t('cancel')}
                </button>
                {!isClosed && (
                  <button 
                    className="btn-primary" 
                    style={{ flex: 2, padding: '16px', borderRadius: '12px' }}
                    onClick={handleAddToCart}
                  >
                    {t('add_to_cart')} • ฿{getProductPriceWithChoices() * quantity}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Up Modal (Owner) */}
      {showTopUpModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '16px' }}>เติมเหรียญ (Top Up Coins)</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>เลือกแพ็กเกจที่ต้องการและสแกน QR Code เพื่อชำระเงิน (Choose a package and scan QR to pay)</p>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <button 
                style={{ flex: 1, padding: '12px', border: topUpPackage === 10 ? '2px solid var(--primary-color)' : '1px solid #ddd', borderRadius: '8px', background: topUpPackage === 10 ? 'rgba(123, 97, 255, 0.05)' : 'white' }}
                onClick={() => setTopUpPackage(10)}
              >
                <div style={{ fontWeight: 'bold' }}>10 THB</div>
                <div style={{ color: 'var(--primary-color)' }}>🪙 20 Coins</div>
              </button>
              <button 
                style={{ flex: 1, padding: '12px', border: topUpPackage === 20 ? '2px solid var(--primary-color)' : '1px solid #ddd', borderRadius: '8px', background: topUpPackage === 20 ? 'rgba(123, 97, 255, 0.05)' : 'white' }}
                onClick={() => setTopUpPackage(20)}
              >
                <div style={{ fontWeight: 'bold' }}>20 THB</div>
                <div style={{ color: 'var(--primary-color)' }}>🪙 50 Coins</div>
              </button>
            </div>

            {topUpPackage && (
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '12px', display: 'inline-block' }}>
                  <img src={`https://promptpay.io/${promptpayNumber}/${topUpPackage}.png`} alt="PromptPay QR" style={{ width: '200px', height: '200px' }} />
                </div>
                <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Scan to pay {topUpPackage} THB</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <label>
                <span style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>วันที่โอน (Transfer Date)</span>
                <input type="date" className="input-field" value={transferDate} onChange={e => setTransferDate(e.target.value)} />
              </label>
              <label>
                <span style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>เวลาโอน (Transfer Time)</span>
                <input type="time" className="input-field" value={transferTime} onChange={e => setTransferTime(e.target.value)} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontWeight: 600 }}
                onClick={() => setShowTopUpModal(false)}
                disabled={submittingTopUp}
              >
                {t('cancel')}
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', borderRadius: '8px', opacity: (!topUpPackage || !transferDate || !transferTime || submittingTopUp) ? 0.5 : 1 }}
                disabled={!topUpPackage || !transferDate || !transferTime || submittingTopUp}
                onClick={async () => {
                  setSubmittingTopUp(true);
                  try {
                    const { createTopUpRequest } = await import('@/lib/db/topups');
                    await createTopUpRequest({
                      userId: shopId,
                      userName: ownerProfile?.displayName || shop.ownerName,
                      userEmail: ownerProfile?.email,
                      amountTHB: topUpPackage!,
                      coinsRequested: topUpPackage === 10 ? 20 : 50,
                      transferDate,
                      transferTime
                    });
                    
                    // Send Email to Admin
                    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@yourshop.com';
                    await fetch('/api/notify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'topup_request',
                        recipientEmail: adminEmail,
                        order: { buyerName: ownerProfile?.displayName, totalPrice: topUpPackage }
                      })
                    });
                    
                    alert('ส่งคำขอเติมเหรียญเรียบร้อยแล้ว กรุณารอแอดมินอนุมัติ (Top up request sent, please wait for admin approval)');
                    setShowTopUpModal(false);
                    setTopUpPackage(null);
                    setTransferDate('');
                    setTransferTime('');
                  } catch (err) {
                    console.error(err);
                    alert(t('error'));
                  } finally {
                    setSubmittingTopUp(false);
                  }
                }}
              >
                {submittingTopUp ? 'กำลังส่ง...' : 'แจ้งโอนเงิน (Submit)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ads Modal (Owner) */}
      {showAdsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'white', padding: '24px' }}>
            <h2 style={{ marginBottom: '8px', color: 'var(--primary-color)' }}>สร้าง Ads (Create Ads)</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem' }}>
              พิมพ์ข้อความโฆษณาร้านของคุณด้านล่าง แล้วกดบันทึก เมื่อลูกค้าหรือคุณพิมพ์ <strong style={{ color: 'var(--primary-color)' }}>/market ads {shop.name}</strong> ในแชท บอทจะส่งข้อความนี้พร้อมลิงก์ร้านค้าของคุณให้
            </p>
            
            <textarea
              className="input-field"
              rows={6}
              placeholder="พิมพ์ข้อความโฆษณาที่นี่ เช่น โปรโมชั่นพิเศษวันนี้ ลดราคา 50% ทุกเมนู!"
              value={adMessage}
              onChange={(e) => setAdMessage(e.target.value)}
              style={{ resize: 'vertical', marginBottom: '16px' }}
            />

            <div style={{ padding: '12px', background: 'rgba(123, 97, 255, 0.05)', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <strong>ตัวอย่างที่บอทจะส่ง:</strong>
              <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{adMessage || '(ข้อความโฆษณาของคุณ)'}</div>
              <div style={{ marginTop: '8px', color: 'var(--primary-color)' }}>เชิญแวะดูและสั่งซื้อได้ที่<br/>https://liff.line.me/...</div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-secondary"
                style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                onClick={() => setShowAdsModal(false)}
                disabled={savingAd}
              >
                {t('cancel')}
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', borderRadius: '8px', opacity: savingAd ? 0.7 : 1 }}
                disabled={savingAd}
                onClick={async () => {
                  setSavingAd(true);
                  try {
                    await updateShop(shopId, { adMessage });
                    setShop(prev => prev ? { ...prev, adMessage } : prev);
                    alert('บันทึกโฆษณาเรียบร้อยแล้ว! (Ads saved successfully)');
                    setShowAdsModal(false);
                  } catch (err) {
                    console.error(err);
                    alert(t('error'));
                  } finally {
                    setSavingAd(false);
                  }
                }}
              >
                {savingAd ? 'กำลังบันทึก...' : 'บันทึก (Save)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal (Owner) */}
      {rejectingOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>{t('reject_order_title')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{t('reject_reason_desc')}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {[t('out_of_stock'), t('shop_closed'), t('cannot_deliver')].map(reason => (
                <button 
                  key={reason}
                  style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'left', background: rejectReason === reason ? 'var(--primary-color)' : 'white', color: rejectReason === reason ? 'white' : 'black' }}
                  onClick={() => setRejectReason(reason)}
                >
                  {reason}
                </button>
              ))}
              <input 
                type="text" 
                placeholder={t('other_reason')} 
                className="input-field" 
                value={![t('out_of_stock'), t('shop_closed'), t('cannot_deliver')].includes(rejectReason) ? rejectReason : ''}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontWeight: 600 }}
                onClick={() => { setRejectingOrder(null); setRejectReason(''); }}
              >
                {t('cancel')}
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--accent-color)', boxShadow: 'none' }}
                onClick={handleRejectSubmit}
                disabled={!rejectReason}
              >
                {t('confirm_reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button (Buyer) */}
      {!isOwner && cart.length > 0 && !selectedProduct && !isClosed && (
        <div 
          className="animate-slide-up"
          style={{ position: 'fixed', bottom: '24px', left: '16px', right: '16px', zIndex: 90 }}
        >
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(123, 97, 255, 0.4)' }}
            onClick={() => setShowCartModal(true)}
          >
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '99px' }}>
              {cart.reduce((sum, item) => sum + item.quantity, 0)} {t('items')}
            </div>
            <div style={{ fontWeight: 'bold' }}>{t('view_cart')}</div>
            <div style={{ fontWeight: 'bold' }}>฿{cartTotal}</div>
          </button>
        </div>
      )}

      {/* Cart Modal (Buyer) */}
      {showCartModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '24px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem' }}>{t('your_cart')}</h2>
              <button style={{ fontWeight: 'bold', fontSize: '1.2rem' }} onClick={() => setShowCartModal(false)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              {cart.map((item, i) => {
                const itemChoicesTotal = item.selectedChoices?.reduce((sum, c) => sum + c.price, 0) || 0;
                const itemPrice = (item.product.price + itemChoicesTotal) * item.quantity;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{item.product.name}</h3>
                      {item.selectedChoices && item.selectedChoices.length > 0 && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
                          + {item.selectedChoices.map(c => c.name).join(', ')}
                        </p>
                      )}
                      <p style={{ fontWeight: 600, color: 'var(--primary-color)' }}>฿{itemPrice}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f5f5f5', padding: '4px', borderRadius: '8px' }}>
                      <button 
                        style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'white', fontWeight: 'bold' }}
                        onClick={() => {
                          setCart(prev => {
                            const newCart = [...prev];
                            if (newCart[i].quantity > 1) {
                              newCart[i].quantity--;
                            } else {
                              newCart.splice(i, 1);
                            }
                            return newCart;
                          });
                        }}
                      >-</button>
                      <span style={{ fontWeight: 600 }}>{item.quantity}</span>
                      <button 
                        style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'white', fontWeight: 'bold' }}
                        onClick={() => {
                          setCart(prev => {
                            const newCart = [...prev];
                            newCart[i].quantity++;
                            return newCart;
                          });
                        }}
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>
              <span>{t('total')}</span>
              <span style={{ color: 'var(--primary-color)' }}>฿{cartTotal}</span>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '16px', borderRadius: '12px' }}
              onClick={handlePlaceOrder}
              disabled={placingOrder}
            >
              {placingOrder ? t('placing_order') : t('place_order')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
