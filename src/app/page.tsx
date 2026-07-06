'use client';

import { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getShop, Shop } from '@/lib/db/shops';
import { getUserProfile } from '@/lib/db/users';
import { getAllMarkets, Market } from '@/lib/db/markets';
import { createReport } from '@/lib/db/reports';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/components/LanguageProvider';

export default function Home() {
  const { isInitialized, liffError, profile } = useLiff();
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();

  const promptpayNumber = process.env.NEXT_PUBLIC_PROMPTPAY_NUMBER || '0909739266';
  const [showCoffeeModal, setShowCoffeeModal] = useState(false);
  const [coffeeAmount, setCoffeeAmount] = useState<number | null>(null);

  const coffeeOptions = [
    { label: '25 บาท โอเลี้ยงหวานน้อย', amount: 25 },
    { label: '45 บาท อูจิมัทฉะเย็นหวาน 0', amount: 45 },
    { label: '50 บาท อาเมริกาโน่เย็นหวาน 0', amount: 50 }
  ];

  const handleCoffeeClick = (amount: number) => {
    setCoffeeAmount(amount);
  };

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMarket, setReportMarket] = useState('');
  const [reportShop, setReportShop] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  const [markets, setMarkets] = useState<Market[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  useEffect(() => {
    if (showReportModal && markets.length === 0) {
      getAllMarkets().then(setMarkets).catch(console.error);
    }
  }, [showReportModal, markets.length]);

  useEffect(() => {
    if (reportMarket) {
      const q = query(collection(db, 'shops'), where('marketId', '==', reportMarket));
      getDocs(q).then(snap => {
        setShops(snap.docs.map(d => d.data() as Shop));
      }).catch(console.error);
    } else {
      setShops([]);
    }
  }, [reportMarket]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !reportMarket || !reportShop || !reportMessage) return;
    setIsSubmittingReport(true);
    
    try {
      let imageUrl = '';
      if (reportFile) {
        const { storage } = await import('@/lib/firebase');
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const imageCompression = (await import('browser-image-compression')).default;
        
        const fileExt = reportFile.name.split('.').pop();
        const fileName = `reports/${profile.userId}_${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, fileName);
        
        // Compress image
        const options = {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: 'image/jpeg'
        };
        const compressedBlob = await imageCompression(reportFile, options);
        const compressedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' });
        
        await uploadBytes(storageRef, compressedFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      await createReport({
        userId: profile.userId,
        marketId: reportMarket,
        shopId: reportShop,
        message: reportMessage,
        imageUrl
      });
      
      alert('ส่งรายงานปัญหาเรียบร้อยแล้ว ขอบคุณที่แจ้งให้ทราบ (Report submitted successfully)');
      setShowReportModal(false);
      setReportMarket('');
      setReportShop('');
      setReportMessage('');
      setReportFile(null);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งรายงาน (Error submitting report)');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const [existingShopId, setExistingShopId] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (isInitialized && profile) {
      getUserProfile(profile.userId).then(user => {
        if (!user) {
          router.push('/profile');
        } else {
          setCheckingProfile(false);
          getShop(profile.userId).then(shop => {
            if (shop) setExistingShopId(profile.userId);
          });
        }
      });
    }
  }, [isInitialized, profile, router]);

  if (liffError) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginTop: '20vh', textAlign: 'center' }}>
        <h1 className="page-title" style={{ color: 'var(--accent-color)' }}>{t('error')}</h1>
        <p>{liffError}</p>
      </div>
    );
  }

  if (!isInitialized || checkingProfile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
        <div className="pulse"></div>
        <div style={{ color: 'var(--text-secondary)' }}>{t('loading')}</div>
      </div>
    );
  }

  const isAdmin = profile?.userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID;

  return (
    <div className="animate-fade-in" style={{ padding: '24px 0' }}>
      {/* Language Toggle & Buy Me A Coffee */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
        <button
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            padding: '4px 12px',
            borderRadius: '99px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onClick={() => setShowCoffeeModal(true)}
        >
          ☕ Buy me a coffee
        </button>
        <button
          style={{
            background: 'var(--background-white)',
            border: '1px solid #ddd',
            padding: '4px 12px',
            borderRadius: '99px',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
          onClick={() => setLang(lang === 'en' ? 'th' : 'en')}
        >
          {lang === 'en' ? '🇹🇭 ไทย' : '🇬🇧 English'}
        </button>
      </div>

      {/* Coffee Modal */}
      {showCoffeeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '24px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '8px', color: 'var(--primary-color)' }}>☕ เลี้ยงกาแฟนักพัฒนา</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
              เลือกระดับความสดชื่นเพื่อเป็นกำลังใจในการพัฒนาต่อไป
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {coffeeOptions.map((opt, i) => (
                <button
                  key={i}
                  style={{
                    padding: '12px',
                    border: coffeeAmount === opt.amount ? '2px solid var(--primary-color)' : '1px solid #ddd',
                    borderRadius: '8px',
                    background: coffeeAmount === opt.amount ? 'rgba(123, 97, 255, 0.05)' : 'white',
                    fontWeight: 600,
                    color: coffeeAmount === opt.amount ? 'var(--primary-color)' : 'var(--text-primary)'
                  }}
                  onClick={() => handleCoffeeClick(opt.amount)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {coffeeAmount && (
              <div style={{ margin: '24px 0', padding: '16px', background: 'white', borderRadius: '16px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: '12px', fontWeight: 600, color: 'var(--primary-color)' }}>Scan to Pay {coffeeAmount} THB</div>
                <img
                  src={`https://promptpay.io/${promptpayNumber}/${coffeeAmount}.png`}
                  alt="PromptPay QR Code"
                  style={{ width: '200px', height: '200px' }}
                />
              </div>
            )}

            <button
              className="btn-secondary"
              style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
              onClick={() => {
                setShowCoffeeModal(false);
                setCoffeeAmount(null);
              }}
            >
              {t('close') || 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Profile Header */}
      {profile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          {profile.pictureUrl ? (
            <img
              src={profile.pictureUrl}
              alt="Profile"
              style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
          ) : (
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {profile.displayName.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{t('hi')}, {profile.displayName}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>{t('welcome_to')}</p>
          </div>
          <button
            style={{ padding: '8px 12px', background: 'var(--background-white)', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}
            onClick={() => router.push('/profile')}
          >
            {t('edit_profile')}
          </button>
        </div>
      )}

      {/* Main Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Buyer Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="glass-panel hover-card"
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
            onClick={() => router.push('/marketplace')}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(123, 97, 255, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              🛍️
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{t('explore_shops')}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{t('explore_desc')}</p>
            </div>
          </div>

          <div
            className="glass-panel hover-card"
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
            onClick={() => router.push('/my-orders')}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 218, 114, 0.1)', color: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              📦
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{t('my_orders')}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{t('my_orders_desc')}</p>
            </div>
          </div>

          <div
            className="glass-panel hover-card"
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
            onClick={() => setShowReportModal(true)}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 107, 107, 0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              ⚠️
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', color: 'var(--accent-color)' }}>แจ้งปัญหา (Report Issue)</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>พบปัญหาการใช้งานหรือข้อร้องเรียน</p>
            </div>
          </div>
        </div>

        {/* Seller Section */}
        <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => router.push(existingShopId ? `/shop/${existingShopId}` : '/shop/create')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 218, 114, 0.1)', color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              🏪
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{existingShopId ? t('manage_shop') : t('create_shop')}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{existingShopId ? t('manage_shop_desc') : t('create_shop_desc')}</p>
            </div>
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="glass-panel hover-card" style={{ padding: '24px', cursor: 'pointer', border: '1px solid var(--accent-color)' }} onClick={() => router.push('/admin')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 107, 107, 0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                👑
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', color: 'var(--accent-color)' }}>{t('admin_dashboard')}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{t('admin_desc')}</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Report Issue Modal */}
      {showReportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', background: 'white', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-color)' }}>⚠️ แจ้งปัญหา (Report Issue)</h2>
              <button style={{ fontWeight: 'bold', fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowReportModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleReportSubmit} style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>ตลาด (Market)</label>
                <select 
                  value={reportMarket} 
                  onChange={e => setReportMarket(e.target.value)} 
                  className="input-field" 
                  required
                >
                  <option value="">เลือกตลาด...</option>
                  {markets.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>ร้านค้า (Shop)</label>
                <select 
                  value={reportShop} 
                  onChange={e => setReportShop(e.target.value)} 
                  className="input-field" 
                  required
                  disabled={!reportMarket}
                >
                  <option value="">เลือกร้านค้า...</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>รายละเอียดปัญหา (Message)</label>
                <textarea
                  value={reportMessage}
                  onChange={e => setReportMessage(e.target.value)}
                  className="input-field"
                  placeholder="อธิบายปัญหาที่คุณพบ..."
                  rows={4}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>รูปภาพประกอบ (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setReportFile(e.target.files[0]);
                    }
                  }}
                  className="input-field"
                  style={{ padding: '8px' }}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: '100%', background: 'var(--accent-color)', boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)' }}
                  disabled={isSubmittingReport || !reportMarket || !reportShop || !reportMessage}
                >
                  {isSubmittingReport ? 'กำลังส่งข้อมูล...' : 'ส่งรายงาน (Submit)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
