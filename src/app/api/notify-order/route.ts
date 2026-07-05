import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Ideally these should come from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || 'your_email@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'your_app_password';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function POST(req: Request) {
  try {
    const { order, type, recipientEmail } = await req.json();

    if (!order || !type || !recipientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let subject = '';
    let text = '';

    if (type === 'placed') {
      subject = `New Order Placed by ${order.buyerName}`;
      const orderDate = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      let itemsList = '';
      if (order.items && Array.isArray(order.items)) {
        itemsList = order.items.map((item: any) => {
          const itemChoicesTotal = item.selectedChoices?.reduce((sum: number, c: any) => sum + c.price, 0) || 0;
          const itemPrice = (item.product.price + itemChoicesTotal) * item.quantity;
          const choicesStr = item.selectedChoices?.length > 0 ? ` (+${item.selectedChoices.map((c: any) => c.name).join(', ')})` : '';
          return `- ${item.quantity}x ${item.product.name}${choicesStr} : ฿${itemPrice}`;
        }).join('\n');
      }

      text = `You have a new order from ${order.buyerName} for ${order.totalPrice} THB.
Date/Time: ${orderDate}

Delivery Address:
${order.buyerAddress || 'Not provided'}

Items:
${itemsList}

Please check your shop dashboard to accept or reject it.`;
    } else if (type === 'accepted') {
      subject = `Your Order has been Accepted!`;
      text = `Great news! Your order of ${order.totalPrice} THB has been accepted by the shop owner.`;
    } else if (type === 'rejected') {
      subject = `Your Order has been Rejected`;
      text = `Unfortunately, your order of ${order.totalPrice} THB was rejected by the shop owner.`;
    }

    // Send email
    await transporter.sendMail({
      from: `"YourShop App" <${SMTP_USER}>`,
      to: recipientEmail,
      subject,
      text,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to send email', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
