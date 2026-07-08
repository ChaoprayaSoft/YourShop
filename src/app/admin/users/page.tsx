'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { useLanguage } from '@/components/LanguageProvider';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/db/users';
import { Shop } from '@/lib/db/shops';
import { Market } from '@/lib/db/markets';

type EnrichedUser = UserProfile & { shopName?: string; marketName?: string };

export default function AdminUsersPage() {
  const { profile } = useLiff();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && profile.userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      const fetchUsers = async () => {
        try {
          const [usersSnap, shopsSnap, marketsSnap] = await Promise.all([
            getDocs(query(collection(db, 'users'))),
            getDocs(query(collection(db, 'shops'))),
            getDocs(query(collection(db, 'markets')))
          ]);
          
          const shops = shopsSnap.docs.map(doc => doc.data() as Shop);
          const markets = marketsSnap.docs.map(doc => doc.data() as Market);
          
          const usersData = usersSnap.docs.map(doc => {
            const u = doc.data() as UserProfile;
            const shop = shops.find(s => s.id === u.id);
            const activeMarketId = shop?.marketId || u.marketId;
            const market = markets.find(m => m.id === activeMarketId);
            
            return {
              ...u,
              shopName: shop?.name,
              marketName: market?.name
            };
          });
          
          // Sort by last active (updatedAt) descending
          usersData.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
            const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
            return timeB - timeA;
          });
          
          setUsers(usersData);
        } catch (error) {
          console.error('Failed to fetch users', error);
        } finally {
          setLoading(false);
        }
      };
      fetchUsers();
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

      <h1 className="page-title" style={{ marginBottom: '24px' }}>Total Users ({users.length})</h1>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>{t('loading')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {users.map((user) => (
            <div key={user.id} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {user.pictureUrl ? (
                  <img 
                    src={user.pictureUrl} 
                    alt={user.displayName} 
                    style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', flexShrink: 0 }}>
                    {user.displayName.charAt(0)}
                  </div>
                )}
                
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.05rem', wordBreak: 'break-word', margin: 0, lineHeight: 1.2 }}>{user.displayName}</h3>
                    <div style={{ padding: '2px 8px', borderRadius: '8px', background: 'rgba(255, 193, 7, 0.1)', color: '#FFC107', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      🪙 {user.coins}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    {user.email || 'No email'}
                  </div>
                  
                  {(user.shopName || user.marketName) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {user.marketName && (
                        <div style={{ padding: '2px 6px', background: 'rgba(123, 97, 255, 0.1)', color: 'var(--primary-color)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          🏙️ {user.marketName}
                        </div>
                      )}
                      {user.shopName && (
                        <div style={{ padding: '2px 6px', background: 'rgba(56, 218, 114, 0.1)', color: 'var(--secondary-color)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          🏪 {user.shopName}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                <div style={{ background: '#f9f9f9', padding: '6px 8px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>Last Active</div>
                  <div style={{ wordBreak: 'break-word' }}>{user.updatedAt ? new Date(user.updatedAt.seconds ? user.updatedAt.seconds * 1000 : user.updatedAt).toLocaleString('th-TH') : 'N/A'}</div>
                </div>
                <div style={{ background: '#f9f9f9', padding: '6px 8px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>Joined</div>
                  <div style={{ wordBreak: 'break-word' }}>{user.createdAt ? new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleString('th-TH') : 'N/A'}</div>
                </div>
              </div>
            </div>
          ))}
          {users.length === 0 && <div style={{ color: '#999' }}>No users found.</div>}
        </div>
      )}
    </div>
  );
}
