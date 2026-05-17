import { asc, eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { events, orderItems, orders, users } from '@/db/schema';
import type { ProductType } from '@/db/schema/enums';
import {
  buildReceiptPayload,
  type RobokassaReceiptPayload,
} from '@/lib/billing/receipt-mapping';

export type SendReceiptEventData = { orderId: string };

export type SendReceiptStepTools = {
  run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
};

export async function _handleSendReceipt(data: SendReceiptEventData, step: SendReceiptStepTools): Promise<void> {
  const { orderId } = data;

  // Step 1: получаем заказ
  const order = await step.run('fetch-order', async () =>
    db.query.orders.findFirst({ where: eq(orders.id, orderId) }),
  );

  if (!order) return;

  let payload = order.receiptPayload as RobokassaReceiptPayload | null;

  // Step 2: если receipt_payload отсутствует — пересобираем и сохраняем
  if (!payload) {
    payload = await step.run('rebuild-receipt', async () => {
      const [items, user] = await Promise.all([
        db.query.orderItems.findMany({
          where: eq(orderItems.orderId, orderId),
          // Двойной ключ для стабильного порядка при одинаковом timestamp
          orderBy: [asc(orderItems.createdAt), asc(orderItems.id)],
        }),
        db.query.users.findFirst({ where: eq(users.id, order.userId) }),
      ]);

      const receiptItems = items.map((i) => ({
        productType: i.productType as ProductType,
        quantity: i.quantity,
        priceKopecks: i.priceKopecks,
      }));

      const built = buildReceiptPayload(receiptItems, user?.email ?? '');

      await db.update(orders).set({ receiptPayload: built }).where(eq(orders.id, orderId));

      return built;
    });
  }

  // Step 3: STUB — реальный вызов Robokassa Receipt API в Этапе 4
  await step.run('stub-send', async () => {
    console.log('[receipt-api][stub] OrderId:', orderId);
    console.log('[receipt-api][stub] Payload:', JSON.stringify(payload));
  });

  // Step 4: логируем
  await step.run('log-event', async () => {
    await db.insert(events).values({
      userId: order.userId,
      type: 'receipt.stub_logged',
      payload: { orderId },
    });
  });
}

export const sendReceipt = inngest.createFunction(
  { id: 'send-receipt', name: 'Send Receipt', triggers: [{ event: 'billing/send_receipt' }] },
  async ({ event, step }: { event: { data: SendReceiptEventData }; step: SendReceiptStepTools }) =>
    _handleSendReceipt(event.data, step),
);
