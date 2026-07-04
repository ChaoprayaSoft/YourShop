'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getShop, Shop } from '@/lib/db/shops';
import { getShopProducts, Product, ProductChoice } from '@/lib/db/products';
import { getShopOrders, updateOrderStatus, Order, placeOrder } from '@/lib/db/orders';
import { getMarket } from '@/lib/db/markets';

type CartItem = { product: Product; quantity: number; selectedChoices?: ProductChoice[] };

export default function ShopDashboard() {
  const { profile, namespace } = useLiff();
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [marketName, setMarketName] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!shopId) return;
    Promise.all([getShop(shopId), getShopProducts(shopId), getShopOrders(shopId)])
      .then(async ([shopData, productsData, ordersData]) => {
        setShop(shopData);
        setProducts(productsData);
        setOrders(ordersData);
        
        if (shopData?.marketId) {
          const m = await getMarket(shopData.marketId);
          if (m) setMarketName(m.name);
        }
        
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

  const isOwner = profile?.userId === shopId;

  // --- Buyer Functions ---
  const handleAddToCart = () => {
    if (!selectedProduct) return;
    setCart(prev => {
      // Very naive array comparison for matching existing cart items
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
    if (!profile || cart.length === 0) return;
    setPlacingOrder(true);
    try {
      const totalPrice = cart.reduce((sum, item) => {
        const choicesTotal = item.selectedChoices?.reduce((cSum, c) => cSum + c.price, 0) || 0;
        return sum + ((item.product.price + choicesTotal) * item.quantity);
      }, 0);

      await placeOrder({
        shopId,
        groupId: namespace || 'direct',
        buyerId: profile.userId,
        buyerName: profile.displayName,
        items: cart,
        totalPrice
      });
      setCart([]);
      setShowCartModal(false);
      alert('Order placed successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => {
    const choicesTotal = item.selectedChoices?.reduce((cSum, c) => cSum + c.price, 0) || 0;
    return sum + ((item.product.price + choicesTotal) * item.quantity);
  }, 0);

  // --- Owner Functions ---
  const handleRejectSubmit = async () => {
    if (!rejectingOrder || !rejectReason) return;
    await updateOrderStatus(rejectingOrder.id, 'rejected', rejectReason);
    setOrders(prev => prev.map(o => o.id === rejectingOrder.id ? { ...o, status: 'rejected', rejectReason } : o));
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
        ← Home
      </button>

      {/* Shop Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">{shop.name}</h1>
            {marketName && (
              <div style={{ display: 'inline-block', background: 'rgba(123, 97, 255, 0.1)', color: 'var(--secondary-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px' }}>
                📍 {marketName}
              </div>
            )}
            <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>{shop.description}</p>
            <div style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
              By {shop.ownerName}
            </div>
          </div>
          {isOwner && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                onClick={() => router.push(`/shop/${shopId}/edit`)}
              >
                Edit Shop
              </button>
              <button 
                style={{ background: 'var(--background-white)', color: 'var(--text-primary)', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '99px', fontSize: '0.9rem', fontWeight: 600 }}
                onClick={() => router.push(`/shop/${shopId}/history`)}
              >
                History
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Section */}
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
                  marginBottom: '12px'
                }} 
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '1rem' }}>{product.name}</h3>
                {isOwner && (
                  <button 
                    style={{ background: 'var(--background-white)', border: '1px solid #ddd', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/shop/${shopId}/product/${product.id}/edit`);
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
              <p style={{ fontWeight: 600, color: 'var(--primary-color)' }}>฿{product.price}</p>
            </div>
          ))}
        </div>
      )}

      {/* Owner Dashboard - Orders */}
      {isOwner && orders.some(o => o.status === 'pending' || o.status === 'accepted') && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Active Orders</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.filter(o => o.status === 'pending' || o.status === 'accepted').map(order => (
              <div key={order.id} className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>Order from {order.buyerName}</h3>
                  {order.status === 'accepted' && (
                    <span style={{ background: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Accepted</span>
                  )}
                  {order.status === 'pending' && (
                    <span style={{ background: '#FFC107', color: 'black', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Pending</span>
                  )}
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
                    <span>Total</span>
                    <span style={{ color: 'var(--primary-color)' }}>฿{order.totalPrice}</span>
                  </div>
                </div>

                {order.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', fontWeight: 600 }}
                      onClick={() => setRejectingOrder(order)}
                    >
                      Reject
                    </button>
                    <button 
                      className="btn-primary"
                      style={{ flex: 1, padding: '8px', borderRadius: '8px' }}
                      onClick={async () => {
                        await updateOrderStatus(order.id, 'accepted');
                        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'accepted' } : o));
                      }}
                    >
                      Accept
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
                    }}
                  >
                    Mark as Completed
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
              style={{ width: '100%', height: '250px', backgroundImage: `url(${selectedProduct.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} 
            />
            <div style={{ padding: '24px', maxHeight: '50vh', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{selectedProduct.name}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{selectedProduct.description}</p>
              
              {selectedProduct.choices && selectedProduct.choices.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '12px' }}>
                    {selectedProduct.choiceType === 'single' ? 'Select Option:' : 'Select Add-ons:'}
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedProduct.choices.map((c, i) => {
                      // Note: c could be just string in old data
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
                <span style={{ fontWeight: 600 }}>Quantity</span>
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

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  style={{ flex: 1, padding: '16px', border: '1px solid #ddd', borderRadius: '12px', fontWeight: 600 }}
                  onClick={() => setSelectedProduct(null)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 2, padding: '16px', borderRadius: '12px' }}
                  onClick={handleAddToCart}
                >
                  Add • ฿{getProductPriceWithChoices() * quantity}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal (Owner) */}
      {rejectingOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>Reject Order</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Please provide a reason to the buyer.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {["สินค้าหมด", "ร้านปิด", "ไม่สามารถส่งถึงที่นั่นได้"].map(reason => (
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
                placeholder="เหตุผลอื่นๆ..." 
                className="input-field" 
                value={!["สินค้าหมด", "ร้านปิด", "ไม่สามารถส่งถึงที่นั่นได้"].includes(rejectReason) ? rejectReason : ''}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontWeight: 600 }}
                onClick={() => { setRejectingOrder(null); setRejectReason(''); }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--accent-color)', boxShadow: 'none' }}
                onClick={handleRejectSubmit}
                disabled={!rejectReason}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button (Buyer) */}
      {!isOwner && cart.length > 0 && !selectedProduct && (
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
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
            </div>
            <div style={{ fontWeight: 'bold' }}>View Cart</div>
            <div style={{ fontWeight: 'bold' }}>฿{cartTotal}</div>
          </button>
        </div>
      )}

      {/* Cart Modal (Buyer) */}
      {showCartModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '24px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Your Cart</h2>
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
              <span>Total</span>
              <span style={{ color: 'var(--primary-color)' }}>฿{cartTotal}</span>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '16px', borderRadius: '12px' }}
              onClick={handlePlaceOrder}
              disabled={placingOrder}
            >
              {placingOrder ? 'Sending Order...' : 'Place Order via LINE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
