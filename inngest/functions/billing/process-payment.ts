import { and, eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { events, orders } from '@/db/schema';

export type ProcessPaymentEventData = { orderId: string; userId: string; email: string };

export type ProcessPaymentStepTools = {
  run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
  sendEvent: (id: string, payload: { name: string; data: unknown }) => Promise<void>;
};

export async function _handleProcessPayment(data: ProcessPaymentEventData, step: ProcessPaymentStepTools): Promise<void> {
  const { orderId, userId, email } = data;

  // Step 1: получаем заказ, проверяем статус
  const order = await step.run('fetch-order', async () =>
    db.query.orders.findFirst({ where: eq(orders.id, orderId) }),
  );

  if (!order || order.status !== 'pending') return;

  // Step 2: атомарный перевод в paid (WHERE status='pending' защищает от повторов)
  const updated = await step.run('mark-paid', async () =>
    db
      .update(orders)
      .set({ status: 'paid', paidAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, 'pending')))
      .returning({ id: orders.id }),
  );

  if (updated.length === 0) return; // race condition — другой воркер уже обработал

  // Step 3: записываем событие
  await step.run('log-event', async () => {
    await db.insert(events).values({
      userId,
      type: 'order.paid',
      payload: { orderId },
    });
  });

  // Step 4: запускаем отправку magic link
  await step.sendEvent('notify-magic-link', {
    name: 'auth/create_magic_link',
    data: { userId, orderId, email },
  });

  // Step 5: запускаем формирование и отправку чека
  await step.sendEvent('trigger-receipt', {
    name: 'billing/send_receipt',
    data: { orderId },
  });
}

export const processPayment = inngest.createFunction(
  { id: 'process-payment', name: 'Process Payment', triggers: [{ event: 'order/paid' }] },
  async ({ event, step }: { event: { data: ProcessPaymentEventData }; step: ProcessPaymentStepTools }) =>
    _handleProcessPayment(event.data, step),
);
