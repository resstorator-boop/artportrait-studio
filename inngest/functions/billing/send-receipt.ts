import { inngest } from '@/inngest/client';

// Отправляет receipt payload в Robokassa → ОФД.
// Реальная реализация в Этапе 3.2.
export const sendReceipt = inngest.createFunction(
  { id: 'send-receipt', name: 'Send Receipt', triggers: [{ event: 'order/paid' }] },
  async ({ event: _event }: { event: { data: { orderId: string; invoiceId: string } } }) => {
    // TODO Этап 3.2:
    // Получить orders.receipt_payload из БД
    // Отправить в Robokassa Receipt API
  },
);
