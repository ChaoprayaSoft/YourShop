'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { useLanguage } from '@/components/LanguageProvider';
import { getReports, Report } from '@/lib/db/reports';
import { getUserProfile, UserProfile } from '@/lib/db/users';
import { getShop, Shop } from '@/lib/db/shops';
import { getMarket, Market } from '@/lib/db/markets';

type PopulatedReport = Report & {
  userEmail?: string;
  userName?: string;
  shopName?: string;
  marketName?: string;
};

export default function AdminReportsPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [reports, setReports] = useState<PopulatedReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && profile.userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      const fetchReports = async () => {
        try {
          const fetchedReports = await getReports();
          
          const populated = await Promise.all(fetchedReports.map(async (report) => {
            const [user, shop, market] = await Promise.all([
              getUserProfile(report.userId).catch(() => null),
              getShop(report.shopId).catch(() => null),
              getMarket(report.marketId).catch(() => null)
            ]);
            return {
              ...report,
              userEmail: user?.email || 'No email provided',
              userName: user?.displayName || 'Unknown User',
              shopName: shop?.name || 'Unknown Shop',
              marketName: market?.name || 'Unknown Market'
            };
          }));
          
          setReports(populated);
        } catch (error) {
          console.error('Failed to fetch reports', error);
        } finally {
          setLoading(false);
        }
      };
      fetchReports();
    }
  }, [profile]);

  if (!profile || profile.userId !== process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>{t('unauthorized')}</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <button 
        style={{ color: 'var(--primary-color)', fontWeight: 600, marginBottom: '24px' }}
        onClick={() => router.push('/admin')}
      >
        ← {t('back_to_admin')}
      </button>

      <h1 className="page-title" style={{ marginBottom: '24px' }}>Reports (แจ้งปัญหา)</h1>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>{t('loading')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {reports.map((report) => (
            <div key={report.id} className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Reported by: {report.userName}</h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Email: {report.userEmail}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Market: {report.marketName}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Shop: {report.shopName}</div>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {report.createdAt ? new Date(report.createdAt.seconds ? report.createdAt.seconds * 1000 : report.createdAt).toLocaleString('th-TH') : ''}
                </div>
              </div>
              
              <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '16px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>Message:</div>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {report.message}
                </div>
              </div>

              {report.imageUrl && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>Attached Image:</div>
                  <img 
                    src={report.imageUrl} 
                    alt="Report attachment" 
                    style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', border: '1px solid #ddd' }} 
                  />
                </div>
              )}
            </div>
          ))}
          {reports.length === 0 && <div style={{ color: '#999' }}>No reports found.</div>}
        </div>
      )}
    </div>
  );
}
