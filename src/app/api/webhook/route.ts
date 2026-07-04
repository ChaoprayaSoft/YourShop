import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { createMarket, getMarket } from '@/lib/db/markets';

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events;

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim();
        const groupId = event.source.groupId || event.source.roomId;
        
        if (!groupId) {
          // Command was not sent in a group or room
          continue;
        }

        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        const magicLink = `https://liff.line.me/${liffId}?marketId=${groupId}`;

        if (text.startsWith('/market create ')) {
          const marketName = text.replace('/market create ', '').trim();
          
          if (!marketName) {
            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ type: 'text', text: 'Please provide a market name. Example: /market create Weekend Deals' }]
            });
            continue;
          }

          // Create the market in Firestore
          await createMarket(groupId, marketName);

          // Reply with the magic link
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ 
              type: 'text', 
              text: `Market '${marketName}' created successfully!\n\nClick this link to enter the market and add your shop:\n${magicLink}` 
            }]
          });

        } else if (text === '/market link') {
          // Check if market exists
          const market = await getMarket(groupId);
          
          if (market) {
            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ 
                type: 'text', 
                text: `Here is the link to enter '${market.name}':\n${magicLink}` 
              }]
            });
          } else {
            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ 
                type: 'text', 
                text: `No market exists for this group yet.\nType '/market create [Name]' to create one!` 
              }]
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
