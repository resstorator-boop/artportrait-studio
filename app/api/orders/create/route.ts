import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { events, orderItems, orders, users } from '@/db/schema';
import type { ProductType } from '@/db/schema/enums';
import { inngest } from '@/inngest/client';
import { buildReceiptPayload } from '@/lib/billing/receipt-mapping';
import { createPaymentUrl } from '@/lib/billing/robokassa';
import { priceFor } from '@/lib/pricing';

const itemSchema = z.object({
  productType: z.enum([
    'pack_1', 'pack_10', 'pack_50',
    'animation', 'voiceover',
    'poster', 'painting', 'postcard', 'puzzle',
  ]),
  quantity: z.number().int().min(1),
});

const bodySchema = z.object({
  email: z.string().email(),
  items: z.array(itemSchema).min(1),
  referralCode: z.string().optional(),
  idempotencyKey: z.string().uuid(),
});

const MAX_INVOICE_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  let parsed: ReturnType<typeof bodySchema.safeParse>;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, items, referralCode, idempotencyKey } = parsed.data;

  // Проверяем идемпотентность: если заказ с таким ключом уже есть — отдаём его
  const existing = await db.query.orders.findFirst({
    where: eq(orders.idempotencyKey, idempotencyKey),
  });

  if (existing?.robokassaInvoiceId) {
    // Пересобираем receipt из order_items для rebuild URL
    const existingItems = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, existing.id),
    });
    const receiptItems = existingItems.map((i) => ({
      productType: i.productType as ProductType,
      quantity: i.quantity,
      priceKopecks: i.priceKopecks,
    }));
    const receipt = buildReceiptPayload(receiptItems, email);
    const paymentUrl = createPaymentUrl({
      invoiceId: Number(existing.robokassaInvoiceId),
      amountKopecks: existing.amountKopecks,
      description: `NUMERO — заказ #${existing.robokassaInvoiceId}`,
      receipt,
      email,
    });
    return NextResponse.json({ orderId: existing.id, paymentUrl });
  }

  // Считаем сумму
  const totalKopecks = items.reduce(
    (sum, item) => sum + priceFor(item.productType as ProductType, item.quantity),
    0,
  );

  if (totalKopecks < 10_000) {
    return NextResponse.json({ error: 'amount_too_low' }, { status: 400 });
  }

  // Upsert пользователя по email
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    const inserted = await db
      .insert(users)
      .values({ email, pendingRegistration: true })
      .returning();
    user = inserted[0]!;
  }

  // Генерируем invoice ID с retry при коллизии UNIQUE constraint
  let invoiceId: number | null = null;
  let orderId: string | null = null;

  for (let attempt = 0; attempt < MAX_INVOICE_ATTEMPTS; attempt++) {
    const candidateId = Math.floor(Math.random() * 2_000_000_000) + 1;
    try {
      const receiptItems = items.map((item) => ({
        productType: item.productType as ProductType,
        quantity: item.quantity,
        priceKopecks: priceFor(item.productType as ProductType, item.quantity),
      }));
      const receipt = buildReceiptPayload(receiptItems, email);

      const [newOrder] = await db
        .insert(orders)
        .values({
          userId: user.id,
          amountKopecks: totalKopecks,
          robokassaInvoiceId: String(candidateId),
          receiptPayload: receipt,
          idempotencyKey,
        })
        .returning({ id: orders.id });

      invoiceId = candidateId;
      orderId = newOrder!.id;

      // Создаём order_items
      await db.insert(orderItems).values(
        items.map((item) => ({
          orderId: orderId!,
          productType: item.productType as ProductType,
          quantity: item.quantity,
          priceKopecks: priceFor(item.productType as ProductType, item.quantity),
        })),
      );

      break;
    } catch (err: unknown) {
      const isUnique =
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === '23505';

      if (isUnique && attempt < MAX_INVOICE_ATTEMPTS - 1) continue;

      if (isUnique) {
        // Исчерпали попытки — логируем и отдаём 500
        await db.insert(events).values({
          userId: user.id,
          type: 'order.invoice_collision',
          payload: { email, attempts: MAX_INVOICE_ATTEMPTS },
        }).catch(() => undefined);
        return NextResponse.json({ error: 'invoice_id_collision' }, { status: 500 });
      }

      throw err;
    }
  }

  if (!invoiceId || !orderId) {
    return NextResponse.json({ error: 'invoice_id_collision' }, { status: 500 });
  }

  // Referral event
  if (referralCode) {
    await inngest.send({
      name: 'referral/used',
      data: { orderId, userId: user.id, referralCode },
    });
  }

  const receiptItems = items.map((item) => ({
    productType: item.productType as ProductType,
    quantity: item.quantity,
    priceKopecks: priceFor(item.productType as ProductType, item.quantity),
  }));
  const receipt = buildReceiptPayload(receiptItems, email);
  const paymentUrl = createPaymentUrl({
    invoiceId,
    amountKopecks: totalKopecks,
    description: `NUMERO — заказ #${invoiceId}`,
    receipt,
    email,
  });

  return NextResponse.json({ orderId, paymentUrl });
}
