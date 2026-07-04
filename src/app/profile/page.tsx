'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getUserProfile, updateUserProfile } from '@/lib/db/users';
import { getAllMarkets, Market } from '@/lib/db/markets';

export default function ProfilePage() {
  const { profile } = useLiff();
  const router = useRouter();
  
  const [address, setAddress] = useState('');
  const [marketId, setMarketId] = useState('');
  const [email, setEmail] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    Promise.all([
      getUserProfile(profile.userId),
      getAllMarkets()
    ]).then(([userProfile, allMarkets]) => {
      setMarkets(allMarkets);
      if (userProfile) {
        setAddress(userProfile.address || '');
        setMarketId(userProfile.marketId || '');
        setEmail(userProfile.email || '');
      } else {
        setIsFirstTime(true);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์');
      setLoading(false);
    });
  }, [profile]);

  if (!profile) return <div style={{ padding: '24px', textAlign: 'center' }}>กำลังโหลดข้อมูลโปรไฟล์...</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId) {
      setError('กรุณาเลือกตลาดของคุณ');
      return;
    }
    
    setSaving(true);
    setError('');

    try {
      await updateUserProfile(profile.userId, {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        address,
        marketId,
        email
      });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '16px 0', paddingBottom: '80px' }}>
      {!isFirstTime && (
        <button 
          style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
          onClick={() => router.back()}
        >
          ← ย้อนกลับ
        </button>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          {isFirstTime ? 'ยินดีต้อนรับ! มาตั้งค่าโปรไฟล์กันเถอะ' : 'แก้ไขโปรไฟล์'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {isFirstTime ? 'กรุณากรอกที่อยู่จัดส่ง อีเมล และเลือกตลาดของคุณเพื่อเริ่มใช้งาน' : 'อัปเดตที่อยู่จัดส่ง อีเมล หรือตลาดเริ่มต้นของคุณ'}
        </p>
        
        {error && <div style={{ color: 'var(--accent-color)', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>อีเมล (Email)</label>
            <input 
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="input-field"
            />
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600 }}>
              * จำเป็นต้องระบุเพื่อรับการแจ้งเตือนเมื่อมีออเดอร์ใหม่หรือสถานะออเดอร์อัปเดต
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>ที่อยู่สำหรับจัดส่ง</label>
            <textarea 
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="บ้านเลขที่, ถนน, อาคาร, ชั้น ฯลฯ"
              rows={3}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>ตลาดของคุณ</label>
            {loading ? (
              <div style={{ padding: '12px', fontSize: '0.9rem', color: '#999' }}>กำลังโหลดข้อมูลตลาด...</div>
            ) : markets.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.9rem', color: 'red' }}>ยังไม่มีตลาดในระบบ</div>
            ) : (
              <select 
                value={marketId}
                onChange={e => setMarketId(e.target.value)}
                className="input-field"
                required
              >
                <option value="" disabled>เลือกตลาดของคุณ...</option>
                {markets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            <div style={{ fontSize: '0.8rem', color: '#999' }}>
              ร้านค้าจากตลาดนี้จะแสดงเมื่อคุณค้นหาสินค้า
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={saving || markets.length === 0}
            style={{ marginTop: '16px', opacity: (saving || markets.length === 0) ? 0.7 : 1 }}
          >
            {saving ? 'กำลังบันทึก...' : (isFirstTime ? 'เสร็จสิ้นการตั้งค่า' : 'บันทึกการเปลี่ยนแปลง')}
          </button>
        </form>
      </div>
    </div>
  );
}
