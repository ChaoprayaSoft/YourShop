import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Only initialize Resend if API key is present
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, recipientEmail, order } = body;

    if (!type || !recipientEmail) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน (Missing required fields)' }, { status: 400 });
    }

    if (!resend) {
      console.warn('RESEND_API_KEY is not set. Email notification skipped.');
      return NextResponse.json({ success: true, warning: 'RESEND_API_KEY not set' });
    }

    let subject = '';
    let text = '';

    if (type === 'placed' && order) {
      subject = `[YourShop] มีออเดอร์ใหม่จากคุณ ${order.buyerName}`;
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
      
      text = `มีออเดอร์ใหม่จากคุณ ${order.buyerName}
ยอดรวมทั้งหมด ฿${order.totalPrice}
วันที่/เวลา: ${orderDate}

ที่อยู่จัดส่ง:
${order.buyerAddress || 'ไม่ระบุ'}

รายการสินค้า:
${itemsList}

กรุณาเข้าสู่ระบบเพื่อตรวจสอบและรับออเดอร์`;
    } else if (type === 'accepted' && order) {
      subject = `[YourShop] ออเดอร์ของคุณได้รับการยืนยันแล้ว!`;
      text = `ข่าวดี! ร้านค้าได้รับออเดอร์ยอด ฿${order.totalPrice} ของคุณแล้ว และกำลังดำเนินการเตรียมสินค้า`;
    } else if (type === 'rejected' && order) {
      subject = `[YourShop] ออเดอร์ของคุณถูกปฏิเสธ`;
      text = `ขออภัย ออเดอร์ยอด ฿${order.totalPrice} ของคุณถูกปฏิเสธจากร้านค้า\nเหตุผล: ${order.rejectReason || 'ไม่มีระบุเหตุผล'}`;
    } else if (type === 'completed' && order) {
      subject = `[YourShop] ออเดอร์ของคุณเสร็จสมบูรณ์แล้ว!`;
      text = `ออเดอร์ยอด ฿${order.totalPrice} ของคุณเสร็จสมบูรณ์แล้ว ขอบคุณที่ใช้บริการ!`;
    } else if (type === 'canceled' && order) {
      subject = `🚫 [YourShop] ออเดอร์ถูกยกเลิก (Order Canceled)`;
      text = `ลูกค้า ${order.buyerName} ได้ยกเลิกออเดอร์ยอด ฿${order.totalPrice} แล้ว (Customer canceled this order).`;
    } else if (type === 'banned') {
      subject = `⚠️ Your shop has been suspended / ร้านค้าของคุณถูกระงับ`;
      const shopName = body.shopName || 'Your Shop';
      text = `Dear Shop Owner,\nWe regret to inform you that your shop "${shopName}" has been suspended by the administrator.\nYou will no longer be visible to buyers in the marketplace.\n\nเรียน เจ้าของร้าน\nเราขออภัยที่ต้องแจ้งให้ทราบว่า ร้านค้า "${shopName}" ของคุณถูกระงับการใช้งานโดยผู้ดูแลระบบ\nร้านค้าของคุณจะไม่แสดงให้ผู้ซื้อเห็นในตลาดอีกต่อไป`;
    } else if (type === 'topup_request') {
      subject = `[YourShop] มีคำขอเติมเหรียญใหม่ (New Top-up Request)`;
      text = `ผู้ใช้ ${order?.buyerName || 'ไม่ทราบชื่อ'} แจ้งโอนเงินจำนวน ${order?.totalPrice || 0} บาท\nกรุณาตรวจสอบและอนุมัติในระบบ Admin`;
    } else if (type === 'topup_approved') {
      subject = `[YourShop] การเติมเหรียญสำเร็จแล้ว (Top-up Approved)`;
      text = `การแจ้งโอนเงินของคุณได้รับการอนุมัติแล้ว คุณได้รับ ${order?.totalPrice || 0} เหรียญ`;
    } else if (type === 'topup_rejected') {
      subject = `[YourShop] คำขอเติมเหรียญถูกปฏิเสธ (Top-up Rejected)`;
      text = `คำขอเติมเหรียญของคุณถูกปฏิเสธ เนื่องจาก: ${order?.rejectReason || 'ไม่ระบุ'}`;
    } else {
      subject = `[YourShop] Notification`;
      text = `You have a new notification.`;
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
