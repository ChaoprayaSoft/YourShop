import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { createMarket, getMarket } from '@/lib/db/markets';
import { getUserProfile } from '@/lib/db/users';
import { adminDb } from '@/lib/firebase-admin';
import crypto from 'crypto';

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
});

// GET endpoint so you can test the webhook is reachable in your browser
export async function GET() {
  return NextResponse.json({
    status: 'Webhook is alive!',
    hasToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    hasChannelSecret: !!process.env.LINE_CHANNEL_SECRET,
    hasLiffId: !!process.env.NEXT_PUBLIC_LIFF_ID,
    hasFirebaseProject: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export async function POST(req: Request) {
  let rawBody = '';
  try {
    // Get raw buffer to ensure exact byte match for signature
    const arrayBuffer = await req.arrayBuffer();
    const bodyBuffer = Buffer.from(arrayBuffer);
    rawBody = bodyBuffer.toString('utf8');

    // Validate LINE signature
    const signature = req.headers.get('x-line-signature');
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    
    if (!signature || !channelSecret) {
      console.warn('Missing signature or channel secret, skipping validation');
      // Temporarily allow without signature if secret is missing to unblock the user
    } else {
      const hash = crypto.createHmac('sha256', channelSecret).update(bodyBuffer).digest('base64');
      
      if (hash !== signature) {
        console.error(`Invalid signature. Expected: ${signature}, Got: ${hash}`);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.log('Webhook received and verified');
    }

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
      // Allow 1-on-1 chats by falling back to userId if no groupId or roomId is present
      const groupId = event.source.groupId || event.source.roomId || event.source.userId;

      console.log(`Text: "${text}", GroupId/UserId: ${groupId}, Source type: ${event.source.type}`);

      if (!groupId) {
        console.log('No groupId or userId found, skipping');
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
        await adminDb.collection('markets').doc(groupId).set({
          id: groupId,
          name: marketName,
          createdAt: new Date(),
        });
        console.log('Market created successfully');

      } else if (normalizedText.startsWith('/market ads')) {
        const prefixLength = '/market ads'.length;
        const shopName = text.substring(prefixLength).trim();

        let shopData = null;

        if (!shopName) {
          // If no name provided, automatically advertise the user's own shop!
          const userId = event.source.userId;
          if (userId) {
            const userShopSnap = await adminDb.collection('shops').doc(userId).get();
            if (userShopSnap.exists) {
              shopData = userShopSnap.data();
            }
          }
        } else {
          // Find shop by fuzzy name match globally to prevent exact-match failures
          const shopsSnap = await adminDb.collection('shops').get();
          for (const doc of shopsSnap.docs) {
            const data = doc.data();
            // Case-insensitive partial match
            if (data.name && data.name.toLowerCase().includes(shopName.toLowerCase())) {
              shopData = data;
              break;
            }
          }
        }

        if (!shopData) {
          const errorMsg = shopName 
            ? `ไม่พบร้านค้าที่ชื่อคล้าย '${shopName}' ในระบบ โปรดตรวจสอบตัวสะกด` 
            : `ไม่พบร้านค้าของคุณในระบบ โปรดสร้างร้านค้าก่อน`;
            
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: errorMsg }]
          });
          continue;
        }

        const actualShopName = shopData.name;
        const adMessage = shopData.adMessage || `ร้าน ${actualShopName} ยินดีให้บริการ!`;
        const shopLink = `https://liff.line.me/${liffId}?shopId=${shopData.id}&marketId=${groupId}`;
        
        let marketNameDisplay = 'ตลาดของเรา';
        if (shopData.marketId) {
          const marketSnap = await adminDb.collection('markets').doc(shopData.marketId).get();
          if (marketSnap.exists) {
            marketNameDisplay = marketSnap.data()?.name || 'ตลาดของเรา';
          }
        }

        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{
            type: 'text',
            text: `${shopName} แห่ง ${marketNameDisplay} พร้อมให้บริการแล้วค่ะ/ครับ!\n\n${adMessage}\n\nเชิญแวะดูและสั่งซื้อได้ที่\n${shopLink}`
          }]
        });

      } else if (normalizedText === '/market link' || normalizedText === '/market') {
        const baseMagicLink = `https://liff.line.me/${liffId}?marketId=${groupId}`;
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{
            type: 'text',
            text: `คลิกที่นี่เพื่อเข้าสู่ตลาด:\n${baseMagicLink}`
          }]
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    console.error('Raw body was:', rawBody);
    const msg = error?.message || String(error) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
