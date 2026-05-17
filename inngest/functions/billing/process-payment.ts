import { inngest } from '@/inngest/client';

// Переводит заказ в статус paid, записывает paid_at.
// Реальная реализация в Этапе 3.2 (webhook handler).
export const processPayment = inngest.createFunction(
  { id: 'process-payment', name: 'Process Payment', triggers: [{ event: 'order/paid' }] },
  async ({ event: _event }: { event: { data: { orderId: string; invoiceId: string; amountKopecks: number } } }) => {
    // TODO Этап 3.2:
    // const { orderId, invoiceId } = _event.data;
    // UPDATE orders SET status='paid', paid_at=now() WHERE id=orderId
  },
);
