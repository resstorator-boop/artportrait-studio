import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  mockVerifySuccess: vi.fn(),
}));

vi.mock('@/lib/billing/robokassa', () => ({
  verifySuccessSignature: mocks.mockVerifySuccess,
}));

import { GET } from '@/app/api/webhooks/robokassa/success/route';

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/webhooks/robokassa/success');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const VALID_PARAMS = { OutSum: '100.00', InvId: '12345', SignatureValue: 'validsig' };

describe('GET /api/webhooks/robokassa/success', () => {
  beforeEach(() => {
    mocks.mockVerifySuccess.mockReset();
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.numero.art';
  });

  it('валидная подпись → 302 на /account?paid=true&order=<invId>', async () => {
    mocks.mockVerifySuccess.mockImplementation(() => true);
    const res = await GET(makeRequest(VALID_PARAMS));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'https://test.numero.art/account?paid=true&order=12345',
    );
  });

  it('невалидная подпись → 302 на /pricing?error=signature', async () => {
    mocks.mockVerifySuccess.mockImplementation(() => false);
    const res = await GET(makeRequest(VALID_PARAMS));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'https://test.numero.art/pricing?error=signature',
    );
  });

  it('мусорный OutSum → 302 на /pricing?error=signature', async () => {
    mocks.mockVerifySuccess.mockImplementation(() => true);
    const res = await GET(makeRequest({ ...VALID_PARAMS, OutSum: 'garbage' }));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/pricing?error=signature');
  });
});
