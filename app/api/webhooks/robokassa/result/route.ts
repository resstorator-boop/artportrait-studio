import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { events, orders, users } from '@/db/schema';
import { inngest } from '@/inngest/client';
import { verifyResultSignature } from '@/lib/billing/robokassa';

export async function POST(req: Request) {
  const text = await req.text();
  const params = new URLSearchParams(text);

  const outSum = params.get('OutSum') ?? '';
  const invId = params.get('InvId') ?? '';
  const signatureValue = params.get('SignatureValue') ?? '';

  // Валидация суммы
  const parsedAmount = parseFloat(outSum);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return new Response('invalid_amount', { status: 400 });
  }
  const amountKopecks = Math.round(parsedAmount * 100);

  // Проверка подписи (password_2)
  const signatureValid = verifyResultSignature(amountKopecks, Number(invId), signatureValue);
  if (!signatureValid) {
    await db.insert(events).values({
      userId: null,
      type: 'order.webhook_invalid_signature',
      payload: { invId, signaturePrefix: signatureValue.slice(0, 8) },
    });
    return new Response('bad signature', { status: 403 });
  }

  // Поиск заказа
  const order = await db.query.orders.findFirst({
    where: eq(orders.robokassaInvoiceId, invId),
  });

  if (!order) {
    await db.insert(events).values({
      userId: null,
      type: 'order.webhook_unknown_invoice',
      payload: { invId },
    });
    return new Response('not found', { status: 404 });
  }

  // Проверка суммы (двойная защита от подмены)
  if (order.amountKopecks !== amountKopecks) {
    await db.insert(events).values({
      userId: order.userId,
      type: 'order.webhook_amount_mismatch',
      payload: { invId, expected: order.amountKopecks, received: amountKopecks },
    });
    return new Response('amount mismatch', { status: 403 });
  }

  // Логируем факт получения webhook
  await db.insert(events).values({
    userId: order.userId,
    type: 'order.webhook_received',
    payload: {
      invId,
      statusBefore: order.status,
      amountKopecks,
      signaturePrefix: signatureValue.slice(0, 8),
    },
  });

  // Только для pending — запускаем обработку
  if (order.status === 'pending') {
    const user = await db.query.users.findFirst({
      where: eq(users.id, order.userId),
    });
    await inngest.send({
      name: 'order/paid',
      data: {
        orderId: order.id,
        userId: order.userId,
        email: user?.email ?? '',
      },
    });
  }

  // Robokassa требует строго 'OK' + invId в text/plain
  return new Response(`OK${invId}`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
