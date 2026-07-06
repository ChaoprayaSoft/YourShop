import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    // Verify the access token with LINE API to get the user profile
    const lineRes = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!lineRes.ok) {
      console.error('Failed to verify LINE access token:', await lineRes.text());
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
    }

    const profile = await lineRes.json();
    const userId = profile.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Could not resolve user ID' }, { status: 400 });
    }

    // Check if firebase-admin is properly initialized
    const { adminAuth } = await import('@/lib/firebase-admin');
    
    if (!adminAuth) {
      throw new Error('Firebase Admin Auth is not initialized on the server. Check your environment variables.');
    }

    // Mint a Firebase Custom Token
    const customToken = await adminAuth.createCustomToken(userId);

    return NextResponse.json({ customToken });
  } catch (error: any) {
    console.error('Auth API Error:', error);
    const msg = error?.message || String(error) || 'Unknown error';
    // Use status 400 so Vercel doesn't intercept it with a generic 500 HTML page if that was happening
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
