import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  mockInsertValues: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    insert: () => ({ values: mocks.mockInsertValues }),
  },
}));

vi.mock('@/db/schema', () => ({ events: 'events_table' }));

import { GET } from '@/app/api/auth/magic-link/verify/route';

function makeRequest(ticket?: string) {
  const url = ticket
    ? `http://localhost/api/auth/magic-link/verify?ticket=${ticket}`
    : `http://localhost/api/auth/magic-link/verify`;
  return new NextRequest(url);
}

describe('GET /api/auth/magic-link/verify', () => {
  beforeEach(() => {
    mocks.mockInsertValues.mockReset();
    mocks.mockInsertValues.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.numero.art';
  });

  it('возвращает 400 при отсутствии ticket', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it('возвращает 400 при пустом ticket', async () => {
    const res = await GET(makeRequest('   '));
    expect(res.status).toBe(400);
  });

  it('делает 302 redirect на /account?ticket=...', async () => {
    const res = await GET(makeRequest('tok_abc123xyz'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'https://test.numero.art/account?ticket=tok_abc123xyz',
    );
  });

  it('логирует magic_link.clicked с user_id=null и ticket_prefix', async () => {
    await GET(makeRequest('tok_abcdefgh_suffix'));
    expect(mocks.mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        type: 'magic_link.clicked',
        payload: expect.objectContaining({ ticket_prefix: 'tok_abcd' }),
      }),
    );
  });
});
