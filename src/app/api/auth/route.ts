import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

/**
 * Creates a Firebase Custom Token manually using jsonwebtoken.
 * This avoids importing firebase-admin/auth, which crashes on Vercel
 * due to its ESM-only dependency chain (jose).
 */
function createFirebaseCustomToken(uid: string): string {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY environment variables.'
    );
  }

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600, // 1 hour
    uid: uid,
  };

  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

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
      const errText = await lineRes.text();
      console.error('Failed to verify LINE access token:', errText);
      return NextResponse.json({ error: 'Invalid LINE access token' }, { status: 401 });
    }

    const profile = await lineRes.json();
    const userId = profile.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Could not resolve user ID from LINE profile' }, { status: 400 });
    }

    // Mint a Firebase Custom Token using our own JWT signing
    const customToken = createFirebaseCustomToken(userId);

    return NextResponse.json({ customToken });
  } catch (error: any) {
    console.error('Auth API Error:', error);
    const msg = error?.message || String(error) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
