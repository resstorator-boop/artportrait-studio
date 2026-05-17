import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockVerifyResult: vi.fn(),
  mockFindFirstOrder: vi.fn(),
  mockFindFirstUser: vi.fn(),
  mockInsertValues: vi.fn(),
  mockInngestSend: vi.fn(),
}));

vi.mock('@/lib/billing/robokassa', () => ({
  verifyResultSignature: mocks.mockVerifyResult,
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      orders: { findFirst: mocks.mockFindFirstOrder },
      users: { findFirst: mocks.mockFindFirstUser },
    },
    insert: () => ({ values: mocks.mockInsertValues }),
  },
}));

vi.mock('@/db/schema', () => ({
  events: 'events_table',
  orders: 'orders_table',
  users: 'users_table',
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

vi.mock('@/inngest/client', () => ({
  inngest: { send: mocks.mockInngestSend },
}));

import { POST } from '@/app/api/webhooks/robokassa/result/route';

const INVOICE_ID = '12345';
const AMOUNT_RUBLES = '100.00';
const MOCK_ORDER = {
  id: 'order-uuid',
  userId: 'user-uuid',
  status: 'pending',
  amountKopecks: 10_000,
  robokassaInvoiceId: INVOICE_ID,
};
const MOCK_USER = { id: 'user-uuid', email: 'buyer@example.com' };

function makeRequest(body: Record<string, string>) {
  return new Request('http://localhost/api/webhooks/robokassa/result', {
    method: 'POST',
    body: new URLSearchParams(body).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

const VALID_BODY = {
  OutSum: AMOUNT_RUBLES,
  InvId: INVOICE_ID,
  SignatureValue: 'validsig',
};

describe('POST /api/webhooks/robokassa/result', () => {
  beforeEach(() => {
    mocks.mockVerifyResult.mockReset();
    mocks.mockFindFirstOrder.mockReset();
    mocks.mockFindFirstUser.mockReset();
    mocks.mockInsertValues.mockReset();
    mocks.mockInngestSend.mockReset();

    mocks.mockVerifyResult.mockImplementation(() => true);
    mocks.mockFindFirstOrder.mockImplementation(async () => MOCK_ORDER);
    mocks.mockFindFirstUser.mockImplementation(async () => MOCK_USER);
    mocks.mockInsertValues.mockImplementation(async () => undefined);
    mocks.mockInngestSend.mockImplementation(async () => undefined);
  });

  it('невалидная подпись → 403, логирует webhook_invalid_signature', async () => {
    mocks.mockVerifyResult.mockImplementation(() => false);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
    expect(mocks.mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'order.webhook_invalid_signature' }),
    );
    expect(mocks.mockInngestSend).not.toHaveBeenCalled();
  });

  it('неизвестный invId → 404, логирует webhook_unknown_invoice', async () => {
    mocks.mockFindFirstOrder.mockImplementation(async () => undefined);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
    expect(mocks.mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'order.webhook_unknown_invoice', payload: { invId: INVOICE_ID } }),
    );
    expect(mocks.mockInngestSend).not.toHaveBeenCalled();
  });

  it('несовпадение суммы → 403, логирует webhook_amount_mismatch', async () => {
    mocks.mockFindFirstOrder.mockImplementation(async () => ({
      ...MOCK_ORDER,
      amountKopecks: 20_000, // ≠ 10000 из OutSum=100.00
    }));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
    expect(mocks.mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'order.webhook_amount_mismatch' }),
    );
    expect(mocks.mockInngestSend).not.toHaveBeenCalled();
  });

  it('status=pending → inngest.send order/paid, ответ OK<invId>', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe(`OK${INVOICE_ID}`);
    expect(mocks.mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'order/paid',
        data: expect.objectContaining({ orderId: 'order-uuid', email: 'buyer@example.com' }),
      }),
    );
  });

  it('status=paid → НЕ отправляет inngest.send, ответ OK<invId>', async () => {
    mocks.mockFindFirstOrder.mockImplementation(async () => ({ ...MOCK_ORDER, status: 'paid' }));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(`OK${INVOICE_ID}`);
    expect(mocks.mockInngestSend).not.toHaveBeenCalled();
  });

  it('status=failed → НЕ отправляет inngest.send, ответ OK<invId>', async () => {
    mocks.mockFindFirstOrder.mockImplementation(async () => ({ ...MOCK_ORDER, status: 'failed' }));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(`OK${INVOICE_ID}`);
    expect(mocks.mockInngestSend).not.toHaveBeenCalled();
  });

  it('успешный ответ имеет Content-Type: text/plain', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.headers.get('content-type')).toBe('text/plain');
  });

  it('мусорный OutSum → 400', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, OutSum: 'not-a-number' }));
    expect(res.status).toBe(400);
    expect(mocks.mockInngestSend).not.toHaveBeenCalled();
  });
});
