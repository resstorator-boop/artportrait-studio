import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const mockVerify = vi.fn();
  // Обычная function (не стрелочная) для корректной работы с new Webhook()
  const MockWebhook = vi.fn(function (this: unknown) {
    return { verify: mockVerify };
  });
  const mockFindFirst = vi.fn();
  const mockInsertValues = vi.fn();
  const mockUpdateWhere = vi.fn();
  return { mockVerify, MockWebhook, mockFindFirst, mockInsertValues, mockUpdateWhere };
});

vi.mock('svix', () => ({ Webhook: mocks.MockWebhook }));

vi.mock('@/db', () => ({
  db: {
    query: { users: { findFirst: mocks.mockFindFirst } },
    insert: () => ({ values: mocks.mockInsertValues }),
    update: () => ({ set: () => ({ where: mocks.mockUpdateWhere }) }),
  },
}));

vi.mock('@/db/schema', () => ({ events: 'events_table', users: 'users_table' }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

import { POST } from '@/app/api/webhooks/clerk/route';

const userCreatedPayload = {
  type: 'user.created',
  data: {
    id: 'clerk_user_abc',
    email_addresses: [{ id: 'ea_1', email_address: 'test@example.com' }],
    primary_email_address_id: 'ea_1',
  },
};

function makeRequest(body: object, headersOverride: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': 'msg_test_123',
      'svix-timestamp': '1700000000',
      'svix-signature': 'v1,sig',
      ...headersOverride,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/webhooks/clerk', () => {
  beforeEach(() => {
    // mockReset сбрасывает и calls, и implementation — нужно переустанавливать всё явно
    mocks.mockVerify.mockReset();
    mocks.MockWebhook.mockReset();
    mocks.mockFindFirst.mockReset();
    mocks.mockInsertValues.mockReset();
    mocks.mockUpdateWhere.mockReset();

    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mocks.MockWebhook.mockImplementation(function (this: any) {
      return { verify: mocks.mockVerify };
    });
    mocks.mockVerify.mockImplementation(() => userCreatedPayload);
    mocks.mockFindFirst.mockResolvedValue({ id: 'db-user-uuid', email: 'test@example.com' });
    mocks.mockInsertValues.mockResolvedValue(undefined);
    mocks.mockUpdateWhere.mockResolvedValue(undefined);
  });

  it('возвращает 400 при отсутствии svix заголовков', async () => {
    const req = makeRequest(userCreatedPayload, {
      'svix-id': '',
      'svix-timestamp': '',
      'svix-signature': '',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('возвращает 500 если CLERK_WEBHOOK_SECRET не задан', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET;
    const req = makeRequest(userCreatedPayload);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('возвращает 403 при невалидной подписи', async () => {
    // mockImplementationOnce перекрывает дефолт только для одного вызова
    mocks.mockVerify.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });
    const req = makeRequest(userCreatedPayload);
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('обрабатывает user.created — возвращает 200 и вызывает update', async () => {
    const req = makeRequest(userCreatedPayload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocks.mockUpdateWhere).toHaveBeenCalled();
  });

  it('логирует clerk.webhook.received для всех событий', async () => {
    const req = makeRequest(userCreatedPayload);
    await POST(req);
    expect(mocks.mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'clerk.webhook.received' }),
    );
  });

  it('обрабатывает user.deleted — вызывает update (clerkId = null)', async () => {
    mocks.mockVerify.mockImplementation(() => ({
      type: 'user.deleted',
      data: { id: 'clerk_user_abc', email_addresses: [], primary_email_address_id: '' },
    }));
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocks.mockUpdateWhere).toHaveBeenCalled();
  });
});
