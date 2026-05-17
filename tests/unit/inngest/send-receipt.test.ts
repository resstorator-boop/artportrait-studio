import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockFindFirstOrder: vi.fn(),
  mockFindManyItems: vi.fn(),
  mockFindFirstUser: vi.fn(),
  mockInsertValues: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockBuildReceipt: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      orders: { findFirst: mocks.mockFindFirstOrder },
      orderItems: { findMany: mocks.mockFindManyItems },
      users: { findFirst: mocks.mockFindFirstUser },
    },
    insert: () => ({ values: mocks.mockInsertValues }),
    update: () => ({ set: () => ({ where: mocks.mockUpdateWhere }) }),
  },
}));

vi.mock('@/db/schema', () => ({
  events: 'events_table',
  orders: 'orders_table',
  orderItems: 'order_items_table',
  users: 'users_table',
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn(), asc: vi.fn() }));

vi.mock('@/lib/billing/receipt-mapping', () => ({
  buildReceiptPayload: mocks.mockBuildReceipt,
}));

import {
  _handleSendReceipt,
  type SendReceiptStepTools,
} from '@/inngest/functions/billing/send-receipt';

const MOCK_RECEIPT = { sno: 'usn_income' as const, items: [] };
const MOCK_ORDER_WITH_RECEIPT = {
  id: 'order-uuid',
  userId: 'user-uuid',
  receiptPayload: MOCK_RECEIPT,
};
const MOCK_ORDER_NO_RECEIPT = {
  id: 'order-uuid',
  userId: 'user-uuid',
  receiptPayload: null,
};
const MOCK_USER = { id: 'user-uuid', email: 'buyer@example.com' };

describe('_handleSendReceipt', () => {
  let mockStep: { run: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mocks.mockFindFirstOrder.mockReset();
    mocks.mockFindManyItems.mockReset();
    mocks.mockFindFirstUser.mockReset();
    mocks.mockInsertValues.mockReset();
    mocks.mockUpdateWhere.mockReset();
    mocks.mockBuildReceipt.mockReset();

    mocks.mockFindFirstOrder.mockImplementation(async () => MOCK_ORDER_WITH_RECEIPT);
    mocks.mockFindManyItems.mockImplementation(async () => []);
    mocks.mockFindFirstUser.mockImplementation(async () => MOCK_USER);
    mocks.mockInsertValues.mockImplementation(async () => undefined);
    mocks.mockUpdateWhere.mockImplementation(async () => undefined);
    mocks.mockBuildReceipt.mockImplementation(() => MOCK_RECEIPT);

    mockStep = {
      run: vi.fn().mockImplementation(async (_id: string, fn: () => Promise<unknown>) => fn()),
    };
  });

  it('receipt_payload существует → не пересобирает, не вызывает buildReceiptPayload', async () => {
    await _handleSendReceipt({ orderId: 'order-uuid' }, mockStep as unknown as SendReceiptStepTools);

    expect(mocks.mockBuildReceipt).not.toHaveBeenCalled();
    expect(mocks.mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('receipt_payload = null → пересобирает через buildReceiptPayload и сохраняет UPDATE', async () => {
    mocks.mockFindFirstOrder.mockImplementation(async () => MOCK_ORDER_NO_RECEIPT);

    await _handleSendReceipt({ orderId: 'order-uuid' }, mockStep as unknown as SendReceiptStepTools);

    expect(mocks.mockBuildReceipt).toHaveBeenCalledOnce();
    expect(mocks.mockUpdateWhere).toHaveBeenCalled();
  });

  it('логирует event receipt.stub_logged', async () => {
    await _handleSendReceipt({ orderId: 'order-uuid' }, mockStep as unknown as SendReceiptStepTools);

    expect(mocks.mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid',
        type: 'receipt.stub_logged',
        payload: { orderId: 'order-uuid' },
      }),
    );
  });

  it('order not found → ранний выход, не падает', async () => {
    mocks.mockFindFirstOrder.mockImplementation(async () => undefined);

    await expect(
      _handleSendReceipt({ orderId: 'order-uuid' }, mockStep as unknown as SendReceiptStepTools),
    ).resolves.toBeUndefined();
    expect(mocks.mockInsertValues).not.toHaveBeenCalled();
  });
});
