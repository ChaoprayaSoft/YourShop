import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
});

export async function POST(req: Request) {
  try {
    const { groupId, message } = await req.json();

    if (!groupId || !message) {
      return NextResponse.json({ error: 'Missing groupId or message' }, { status: 400 });
    }

    await client.pushMessage({
      to: groupId,
      messages: [{ type: 'text', text: message }]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to push message', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
