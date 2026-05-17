import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockFindFirstOrder: vi.fn(),
  mockUpdateReturning: vi.fn(),
  mockInsertValues: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      orders: { findFirst: mocks.mockFindFirstOrder },
    },
    update: () => ({
      set: () => ({
        where: () => ({ returning: mocks.mockUpdateReturning }),
      }),
    }),
    insert: () => ({ values: mocks.mockInsertValues }),
  },
}));

vi.mock('@/db/schema', () => ({
  events: 'events_table',
  orders: 'orders_table',
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }));

import {
  _handleProcessPayment,
  type ProcessPaymentStepTools,
} from '@/inngest/functions/billing/process-payment';

const MOCK_ORDER_PENDING = {
  id: 'order-uuid',
  userId: 'user-uuid',
  status: 'pending',
  amountKopecks: 10_000,
};

const EVENT_DATA = { orderId: 'order-uuid', userId: 'user-uuid', email: 'buyer@example.com' };

describe('_handleProcessPayment', () => {
  let mockStep: {
    run: ReturnType<typeof vi.fn>;
    sendEvent: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mocks.mockFindFirstOrder.mockReset();
    mocks.mockUpdateReturning.mockReset();
    mocks.mockInsertValues.mockReset();

    mocks.mockFindFirstOrder.mockImplementation(async () => MOCK_ORDER_PENDING);
    mocks.mockUpdateReturning.mockImplementation(async () => [{ id: 'order-uuid' }]);
    mocks.mockInsertValues.mockImplementation(async () => undefined);

    mockStep = {
      // Вызываем fn() — как настоящий Inngest step
      run: vi.fn().mockImplementation(async (_id: string, fn: () => Promise<unknown>) => fn()),
      sendEvent: vi.fn().mockImplementation(async () => undefined),
    };
  });

  it('pending → обновляет статус, отправляет 2 Inngest события', async () => {
    await _handleProcessPayment(EVENT_DATA, mockStep as unknown as ProcessPaymentStepTools);

    expect(mockStep.run).toHaveBeenCalledWith('mark-paid', expect.any(Function));
    expect(mockStep.run).toHaveBeenCalledWith('log-event', expect.any(Function));
    expect(mockStep.sendEvent).toHaveBeenCalledTimes(2);
    expect(mockStep.sendEvent).toHaveBeenCalledWith(
      'notify-magic-link',
      expect.objectContaining({
        name: 'auth/create_magic_link',
        data: expect.objectContaining({ userId: 'user-uuid', email: 'buyer@example.com' }),
      }),
    );
    expect(mockStep.sendEvent).toHaveBeenCalledWith(
      'trigger-receipt',
      expect.objectContaining({ name: 'billing/send_receipt' }),
    );
  });

  it('статус paid → ранний выход, нет sendEvent', async () => {
    mocks.mockFindFirstOrder.mockImplementation(async () => ({
      ...MOCK_ORDER_PENDING,
      status: 'paid',
    }));

    await _handleProcessPayment(EVENT_DATA, mockStep as unknown as ProcessPaymentStepTools);

    // Только fetch-order вызван, дальше — ранний выход
    expect(mockStep.run).toHaveBeenCalledTimes(1);
    expect(mockStep.run).toHaveBeenCalledWith('fetch-order', expect.any(Function));
    expect(mockStep.sendEvent).not.toHaveBeenCalled();
  });

  it('0 rows updated (race condition) → нет sendEvent, не падает', async () => {
    mocks.mockUpdateReturning.mockImplementation(async () => []);

    await _handleProcessPayment(EVENT_DATA, mockStep as unknown as ProcessPaymentStepTools);

    expect(mockStep.sendEvent).not.toHaveBeenCalled();
  });

  it('order not found → ранний выход, нет sendEvent', async () => {
    mocks.mockFindFirstOrder.mockImplementation(async () => undefined);

    await _handleProcessPayment(EVENT_DATA, mockStep as unknown as ProcessPaymentStepTools);

    expect(mockStep.sendEvent).not.toHaveBeenCalled();
  });
});
