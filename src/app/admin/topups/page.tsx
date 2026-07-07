'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { getPendingTopUpRequests, updateTopUpRequestStatus, TopUpRequest } from '@/lib/db/topups';
import { getUserProfile, updateUserProfile } from '@/lib/db/users';
import { useLanguage } from '@/components/LanguageProvider';

type EnrichedTopUpRequest = TopUpRequest & { shopName?: string; marketName?: string; };

export default function AdminTopUpsPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [requests, setRequests] = useState<EnrichedTopUpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (profile && profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const data = await getPendingTopUpRequests();
        
        // Enrich data with shop and market info
        const { getShop } = await import('@/lib/db/shops');
        const { getMarket } = await import('@/lib/db/markets');
        
        const enrichedData = await Promise.all(data.map(async (req) => {
          let shopName = '';
          let marketName = '';
          
          try {
            const shop = await getShop(req.userId);
            if (shop) {
              shopName = shop.name;
              if (shop.marketId) {
                const market = await getMarket(shop.marketId);
                if (market) marketName = market.name;
              }
            }
          } catch (e) {
            console.error('Error fetching shop for topup', e);
          }
          
          return { ...req, shopName, marketName };
        }));

        setRequests(enrichedData);
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

  const handleApprove = async (req: EnrichedTopUpRequest) => {
    if (!confirm('Approve this top-up?')) return;
    setProcessing(true);
    try {
      // Add coins to user
      const userProfile = await getUserProfile(req.userId);
      const currentCoins = userProfile?.coins || 0;
      await updateUserProfile(req.userId, { coins: currentCoins + req.coinsRequested });
      
      // Update request status
      await updateTopUpRequestStatus(req.id, 'approved');
      setRequests(prev => prev.filter(r => r.id !== req.id));
      
      // Send Email to User
      if (req.userEmail) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-secret': process.env.NEXT_PUBLIC_API_SECRET_KEY || ''
          },
          body: JSON.stringify({
            type: 'topup_approved',
            recipientEmail: req.userEmail,
            order: { buyerName: req.userName, totalPrice: req.coinsRequested } // Using order object loosely here for coins
          })
        });
      }
      
      alert('Approved successfully');
    } catch (err) {
      console.error(err);
      alert('Error approving');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (req: EnrichedTopUpRequest) => {
    if (!rejectReason) {
      alert('Please enter a reason');
      return;
    }
    setProcessing(true);
    try {
      await updateTopUpRequestStatus(req.id, 'rejected', rejectReason);
      setRequests(prev => prev.filter(r => r.id !== req.id));
      
      // Send Email to User
      if (req.userEmail) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-secret': process.env.NEXT_PUBLIC_API_SECRET_KEY || ''
          },
          body: JSON.stringify({
            type: 'topup_rejected',
            recipientEmail: req.userEmail,
            order: { buyerName: req.userName, rejectReason }
          })
        });
      }
      
      setRejectingId(null);
      setRejectReason('');
      alert('Rejected successfully');
    } catch (err) {
      console.error(err);
      alert('Error rejecting');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/admin')}
      >
        ← {t('back')}
      </button>

      <h1 className="page-title" style={{ marginBottom: '24px' }}>Top-up Requests</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {requests.map(req => (
          <div key={req.id} className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                  {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : ''}
                </div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>User: {req.userName}</div>
                {req.shopName && (
                  <div style={{ fontSize: '0.95rem', color: 'var(--primary-color)', fontWeight: 600, marginTop: '2px' }}>
                    Shop: {req.shopName}
                  </div>
                )}
                {req.marketName && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', marginTop: '2px' }}>
                    Market: {req.marketName}
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Email: {req.userEmail || 'N/A'}
                </div>
              </div>
              <div style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: '#fff3cd', color: '#856404' }}>
                PENDING
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Amount Paid:</span>
                <span style={{ fontWeight: 600 }}>{req.amountTHB} THB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Coins Requested:</span>
                <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>🪙 {req.coinsRequested} Coins</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Transfer Time:</span>
                <span style={{ fontWeight: 600 }}>{req.transferDate} {req.transferTime}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', fontWeight: 600 }}
                onClick={() => setRejectingId(req.id)}
                disabled={processing}
              >
                Reject
              </button>
              <button 
                className="btn-primary"
                style={{ flex: 1, padding: '8px', borderRadius: '8px' }}
                onClick={() => handleApprove(req)}
                disabled={processing}
              >
                Approve
              </button>
            </div>
          </div>
        ))}
        {requests.length === 0 && <div style={{ color: '#999', textAlign: 'center', padding: '24px' }}>No pending requests</div>}
      </div>

      {rejectingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>Reject Request</h2>
            <textarea 
              className="input-field"
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontWeight: 600 }}
                onClick={() => { setRejectingId(null); setRejectReason(''); }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--accent-color)' }}
                onClick={() => handleReject(requests.find(r => r.id === rejectingId)!)}
                disabled={!rejectReason || processing}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
