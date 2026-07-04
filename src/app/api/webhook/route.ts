import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { createMarket, getMarket } from '@/lib/db/markets';

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
            messages: [{ type: 'text', text: 'Please provide a market name. Example: /market create Weekend Deals' }]
          });
          continue;
        }

        console.log(`Creating market "${marketName}" for group ${groupId}`);
        
        // Reply FIRST before Firebase (reply token expires quickly)
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ 
            type: 'text', 
            text: `Market '${marketName}' created!\n\nClick here to enter:\n${magicLink}` 
          }]
        });

        // Then save to Firebase (can take longer)
        await createMarket(groupId, marketName);
        console.log('Market created successfully');

      } else if (normalizedText === '/market link') {
        console.log(`Looking up market for group ${groupId}`);
        const market = await getMarket(groupId);
        
        if (market) {
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ 
              type: 'text', 
              text: `Here is the link to '${market.name}':\n${magicLink}` 
            }]
          });
        } else {
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ 
              type: 'text', 
              text: `No market exists yet.\nType '/market create [Name]' to create one!` 
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
