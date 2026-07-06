import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const apiSecret = req.headers.get('x-api-secret');
    if (process.env.API_SECRET_KEY && apiSecret !== process.env.API_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shopId, groupId, buyerId, buyerName, buyerAddress, items } = await req.json();

    if (!shopId || !buyerId || !items || !items.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let calculatedTotalPrice = 0;
    const validatedItems = [];

    // Fetch products and validate prices
    for (const item of items) {
      const productSnap = await adminDb.collection('products').doc(item.product.id).get();
      if (!productSnap.exists) {
        return NextResponse.json({ error: `Product ${item.product.id} not found` }, { status: 404 });
      }
      
      const productData = productSnap.data();
      let itemTotal = productData?.price || 0;

      // Add choice prices
      if (item.selectedChoices && item.selectedChoices.length > 0) {
        for (const choice of item.selectedChoices) {
          itemTotal += choice.price || 0;
        }
      }

      calculatedTotalPrice += (itemTotal * item.quantity);

      validatedItems.push({
        product: {
          id: productSnap.id,
          name: productData?.name,
          price: productData?.price,
          imageUrl: productData?.imageUrl || null,
        },
        quantity: item.quantity,
        selectedChoices: item.selectedChoices || []
      });
    }

    const orderRef = adminDb.collection('orders').doc();
    
    const newOrder = {
      id: orderRef.id,
      shopId,
      groupId,
      buyerId,
      buyerName,
      buyerAddress: buyerAddress || null,
      items: validatedItems,
      totalPrice: calculatedTotalPrice,
      status: 'pending',
      createdAt: new Date(),
    };

    await orderRef.set(newOrder);

    return NextResponse.json({ success: true, orderId: orderRef.id, order: newOrder });
  } catch (error: any) {
    console.error('Failed to create order', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
