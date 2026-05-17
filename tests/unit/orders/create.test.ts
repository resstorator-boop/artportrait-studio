import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ORDER_ID = 'order-uuid-001';
const USER_ID = 'user-uuid-001';
const IDEM_KEY = '550e8400-e29b-41d4-a716-446655440000';

const mocks = vi.hoisted(() => ({
  mockFindFirstUser: vi.fn(),
  mockFindFirstOrder: vi.fn(),
  mockFindManyItems: vi.fn(),
  mockInsertUser: vi.fn(),
  mockInsertOrder: vi.fn(),
  mockInsertItems: vi.fn(),
  mockInsertEvent: vi.fn(),
  mockInngestSend: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      users: { findFirst: mocks.mockFindFirstUser },
      orders: { findFirst: mocks.mockFindFirstOrder },
      orderItems: { findMany: mocks.mockFindManyItems },
    },
    insert: (table: string) => {
      if (table === 'users_table') return { values: () => ({ returning: mocks.mockInsertUser }) };
      if (table === 'orders_table') return { values: () => ({ returning: mocks.mockInsertOrder }) };
      if (table === 'order_items_table') return { values: mocks.mockInsertItems };
      if (table === 'events_table') return { values: mocks.mockInsertEvent };
      return { values: vi.fn().mockResolvedValue(undefined) };
    },
  },
}));

vi.mock('@/db/schema', () => ({
  users: 'users_table',
  orders: 'orders_table',
  orderItems: 'order_items_table',
  events: 'events_table',
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

vi.mock('@/inngest/client', () => ({
  inngest: { send: mocks.mockInngestSend },
}));

vi.mock('@/lib/billing/robokassa', () => ({
  createPaymentUrl: vi.fn().mockReturnValue('https://robokassa.example/pay?InvId=12345'),
}));

vi.mock('@/lib/billing/receipt-mapping', () => ({
  buildReceiptPayload: vi.fn().mockReturnValue({ sno: 'usn_income', items: [] }),
}));

import { POST } from '@/app/api/orders/create/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/orders/create', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const VALID_BODY = {
  email: 'buyer@example.com',
  items: [{ productType: 'pack_1', quantity: 1 }],
  idempotencyKey: IDEM_KEY,
};

describe('POST /api/orders/create', () => {
  beforeEach(() => {
    mocks.mockFindFirstUser.mockReset();
    mocks.mockFindFirstOrder.mockReset();
    mocks.mockFindManyItems.mockReset();
    mocks.mockInsertUser.mockReset();
    mocks.mockInsertOrder.mockReset();
    mocks.mockInsertItems.mockReset();
    mocks.mockInsertEvent.mockReset();
    mocks.mockInngestSend.mockReset();

    // Defaults: no existing order, no existing user
    mocks.mockFindFirstOrder.mockImplementation(async () => undefined);
    mocks.mockFindFirstUser.mockImplementation(async () => undefined);
    mocks.mockInsertUser.mockImplementation(async () => [{ id: USER_ID }]);
    mocks.mockInsertOrder.mockImplementation(async () => [{ id: ORDER_ID }]);
    mocks.mockInsertItems.mockImplementation(async () => undefined);
    mocks.mockInsertEvent.mockImplementation(async () => undefined);
    mocks.mockInngestSend.mockImplementation(async () => undefined);
  });

  it('200 с orderId и paymentUrl при валидном запросе', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json() as { orderId: string; paymentUrl: string };
    expect(body.orderId).toBe(ORDER_ID);
    expect(body.paymentUrl).toContain('robokassa');
  });

  it('400 при отсутствии email', async () => {
    const res = await POST(makeRequest({ items: [{ productType: 'pack_1', quantity: 1 }], idempotencyKey: IDEM_KEY }));
    expect(res.status).toBe(400);
  });

  it('400 при невалидном email', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('400 при пустом массиве items', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, items: [] }));
    expect(res.status).toBe(400);
  });

  it('400 amount_too_low при totalKopecks < 10000', async () => {
    // animation = 0 kopecks → totalKopecks = 0
    const res = await POST(makeRequest({ ...VALID_BODY, items: [{ productType: 'animation', quantity: 1 }] }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('amount_too_low');
  });

  it('переиспользует существующего user по email', async () => {
    mocks.mockFindFirstUser.mockImplementation(async () => ({ id: 'existing-user-id' }));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(mocks.mockInsertUser).not.toHaveBeenCalled();
  });

  it('идемпотентность: второй POST с тем же idempotencyKey возвращает тот же orderId', async () => {
    mocks.mockFindFirstOrder.mockImplementation(async () => ({
      id: ORDER_ID,
      robokassaInvoiceId: '999',
      amountKopecks: 10_000,
    }));
    mocks.mockFindManyItems.mockImplementation(async () => [
      { productType: 'pack_1', quantity: 1, priceKopecks: 10_000 },
    ]);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json() as { orderId: string };
    expect(body.orderId).toBe(ORDER_ID);
    // Новый order не вставляется
    expect(mocks.mockInsertOrder).not.toHaveBeenCalled();
  });

  it('referralCode → отправляет inngest event referral/used', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, referralCode: 'REF123' }));
    expect(res.status).toBe(200);
    expect(mocks.mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'referral/used' }),
    );
  });

  it('без referralCode → не отправляет inngest event', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(mocks.mockInngestSend).not.toHaveBeenCalled();
  });
});
