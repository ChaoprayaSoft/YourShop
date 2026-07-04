import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Only initialize Resend if API key is present
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
  try {
    const { order, type, recipientEmail } = await req.json();

    if (!order || !type || !recipientEmail) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน (Missing required fields)' }, { status: 400 });
    }

    if (!resend) {
      console.warn('RESEND_API_KEY is not set. Email notification skipped.');
      // Return success anyway so the app doesn't break if they haven't added the key yet
      return NextResponse.json({ success: true, warning: 'RESEND_API_KEY not set' });
    }

    let subject = '';
    let text = '';

    if (type === 'placed') {
      subject = `[YourShop] มีออเดอร์ใหม่จากคุณ ${order.buyerName}`;
      text = `มีออเดอร์ใหม่จากคุณ ${order.buyerName} ยอดรวมทั้งหมด ฿${order.totalPrice}\n\nกรุณาเข้าสู่ระบบเพื่อตรวจสอบและรับออเดอร์`;
    } else if (type === 'accepted') {
      subject = `[YourShop] ออเดอร์ของคุณได้รับการยืนยันแล้ว!`;
      text = `ข่าวดี! ร้านค้าได้รับออเดอร์ยอด ฿${order.totalPrice} ของคุณแล้ว และกำลังดำเนินการเตรียมสินค้า`;
    } else if (type === 'rejected') {
      subject = `[YourShop] ออเดอร์ของคุณถูกปฏิเสธ`;
      text = `ขออภัย ออเดอร์ยอด ฿${order.totalPrice} ของคุณถูกปฏิเสธจากร้านค้า\nเหตุผล: ${order.rejectReason || 'ไม่มีระบุเหตุผล'}`;
    } else if (type === 'completed') {
      subject = `[YourShop] ออเดอร์ของคุณเสร็จสมบูรณ์แล้ว!`;
      text = `ออเดอร์ยอด ฿${order.totalPrice} ของคุณเสร็จสมบูรณ์แล้ว ขอบคุณที่ใช้บริการ!`;
    }

    // Send email
    await resend.emails.send({
      from: 'YourShop <onboarding@resend.dev>', // Resend's default test email sender
      to: recipientEmail,
      subject,
      text,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
