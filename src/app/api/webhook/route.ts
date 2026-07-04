import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { createMarket, getMarket } from '@/lib/db/markets';
import { getUserProfile } from '@/lib/db/users';

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
});

// GET endpoint so you can test the webhook is reachable in your browser
export async function GET() {
  return NextResponse.json({ 
    status: 'Webhook is alive!',
    hasToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    hasLiffId: !!process.env.NEXT_PUBLIC_LIFF_ID,
    hasFirebaseProject: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export async function POST(req: Request) {
  let rawBody = '';
  try {
    rawBody = await req.text();
    console.log('Webhook received:', rawBody);
    
    const body = JSON.parse(rawBody);
    const events = body.events;

    // LINE sends empty events array for verification - respond immediately
    if (!events || events.length === 0) {
      return NextResponse.json({ success: true });
    }

    for (const event of events) {
      console.log('Processing event:', JSON.stringify(event));
      
      if (event.type !== 'message' || event.message.type !== 'text') {
        console.log('Skipping non-text event');
        continue;
      }

      const text = event.message.text.trim();
      const groupId = event.source.groupId || event.source.roomId;
      
      console.log(`Text: "${text}", GroupId: ${groupId}, Source type: ${event.source.type}`);
      
      if (!groupId) {
        console.log('No groupId found, skipping');
        continue;
      }

      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      const magicLink = `https://liff.line.me/${liffId}?marketId=${groupId}`;
      
      const normalizedText = text.toLowerCase();

      if (normalizedText.startsWith('/market create ')) {
        const prefixLength = '/market create '.length;
        const marketName = text.substring(prefixLength).trim();
        
        if (!marketName) {
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: 'กรุณาระบุชื่อตลาด เช่น /market create ตลาดสุดสัปดาห์' }]
          });
          continue;
        }

        console.log(`Creating market "${marketName}" for group ${groupId}`);
        
        // Reply FIRST before Firebase (reply token expires quickly)
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ 
            type: 'text', 
            text: `สร้างตลาด '${marketName}' สำเร็จแล้ว!\n\nคลิกที่ลิงก์นี้เพื่อเข้าสู่ตลาดและเพิ่มร้านค้าของคุณ:\n${magicLink}` 
          }]
        });

        // Then save to Firebase (can take longer)
        await createMarket(groupId, marketName);
        console.log('Market created successfully');

      } else if (normalizedText === '/market link' || normalizedText === '/market') {
        const userId = event.source.userId;
        let foundMarketId: string | null = null;
        let foundMarketName: string | null = null;
        
        // 1. Try to find market from User Profile first
        if (userId) {
          try {
            console.log(`Looking up market for user ${userId}`);
            const userProfile = await getUserProfile(userId);
            if (userProfile && userProfile.marketId) {
              const market = await getMarket(userProfile.marketId);
              if (market) {
                foundMarketId = userProfile.marketId;
                foundMarketName = market.name;
              }
            }
          } catch (err) {
            console.error('Error fetching user profile in webhook:', err);
          }
        }

        // 2. If no user market found, fallback to Group Market
        if (!foundMarketId && groupId) {
          try {
            console.log(`Fallback: Looking up market for group ${groupId}`);
            const groupMarket = await getMarket(groupId);
            if (groupMarket) {
              foundMarketId = groupId;
              foundMarketName = groupMarket.name;
            }
          } catch (err) {
            console.error('Error fetching group market in webhook:', err);
          }
        }

        // 3. Reply based on what we found
        if (foundMarketId && foundMarketName) {
          const userMagicLink = `https://liff.line.me/${liffId}?marketId=${foundMarketId}`;
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ 
              type: 'text', 
              text: `นี่คือลิงก์สำหรับเข้าสู่ตลาด '${foundMarketName}':\n${userMagicLink}` 
            }]
          });
        } else {
          // 4. No market found anywhere
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ 
              type: 'text', 
              text: `ยังไม่มีตลาดสำหรับกลุ่มนี้ หรือคุณยังไม่ได้ตั้งค่าตลาดในโปรไฟล์!\n\nพิมพ์ '/market create [ชื่อตลาด]' เพื่อสร้างตลาดใหม่สำหรับกลุ่มนี้\nหรือเข้าแอปพลิเคชันเพื่อตั้งค่าตลาดส่วนตัวของคุณ` 
            }]
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    console.error('Raw body was:', rawBody);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
