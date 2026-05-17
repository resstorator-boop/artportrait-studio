import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockClerkClient: vi.fn(),
  mockGetUser: vi.fn(),
  mockReturning: vi.fn(),
  mockInsertValues: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: mocks.mockAuth,
  clerkClient: mocks.mockClerkClient,
}));

vi.mock('@/db', () => ({
  db: {
    update: () => ({
      set: () => ({
        where: () => ({ returning: mocks.mockReturning }),
      }),
    }),
    insert: () => ({ values: mocks.mockInsertValues }),
  },
}));

vi.mock('@/db/schema', () => ({ users: 'users_table', events: 'events_table' }));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  isNull: vi.fn(),
}));

import { POST } from '@/app/api/auth/activate/route';


const CLERK_USER_ID = 'clerk_user_abc';
const DB_USER_ID = 'db-uuid-123';

describe('POST /api/auth/activate', () => {
  beforeEach(() => {
    mocks.mockAuth.mockReset();
    mocks.mockClerkClient.mockReset();
    mocks.mockGetUser.mockReset();
    mocks.mockReturning.mockReset();
    mocks.mockInsertValues.mockReset();

    mocks.mockAuth.mockResolvedValue({ userId: CLERK_USER_ID });
    mocks.mockClerkClient.mockResolvedValue({ users: { getUser: mocks.mockGetUser } });
    mocks.mockGetUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: 'test@example.com' },
    });
    mocks.mockReturning.mockResolvedValue([{ id: DB_USER_ID }]);
    mocks.mockInsertValues.mockResolvedValue(undefined);
  });

  it('возвращает 401 если нет Clerk-сессии', async () => {
    mocks.mockAuth.mockResolvedValue({ userId: null });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('возвращает 400 если у Clerk user нет email', async () => {
    mocks.mockGetUser.mockResolvedValue({ primaryEmailAddress: null });
    const res = await POST();
    expect(res.status).toBe(400);
  });

  it('возвращает 200 при успешной верификации (clerk_id match)', async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; userId: string };
    expect(body.ok).toBe(true);
    expect(body.userId).toBe(DB_USER_ID);
  });

  it('возвращает 200 при email match (race: webhook ещё не пришёл)', async () => {
    mocks.mockReturning.mockResolvedValue([{ id: 'db-uuid-email-match' }]);
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json() as { userId: string };
    expect(body.userId).toBe('db-uuid-email-match');
  });

  it('возвращает 404 если ни clerk_id ни email не найдены', async () => {
    mocks.mockReturning.mockResolvedValue([]);
    const res = await POST();
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('user_not_found');
  });

  it('логирует magic_link.clicked с user_id и source=activate', async () => {
    await POST();
    expect(mocks.mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: DB_USER_ID,
        type: 'magic_link.clicked',
        payload: { source: 'activate' },
      }),
    );
  });

  it('Тест A: race condition — clerk_id NULL, email match (webhook ещё не пришёл)', async () => {
    mocks.mockAuth.mockImplementation(async () => ({ userId: 'clerk-race' }));
    mocks.mockGetUser.mockImplementation(async () => ({
      primaryEmailAddress: { emailAddress: 'race@test.com' },
    }));
    mocks.mockReturning.mockImplementation(async () => [{ id: 'db-1' }]);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; userId: string };
    expect(body.ok).toBe(true);
    expect(body.userId).toBe('db-1');
    expect(mocks.mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'db-1', type: 'magic_link.clicked' }),
    );
  });

  it('Тест B: идемпотентность — повторный вызов не ломает верификацию', async () => {
    mocks.mockAuth.mockImplementation(async () => ({ userId: 'clerk-idem' }));
    mocks.mockGetUser.mockImplementation(async () => ({
      primaryEmailAddress: { emailAddress: 'idem@test.com' },
    }));
    mocks.mockReturning.mockImplementation(async () => [{ id: 'db-2' }]);

    const res1 = await POST();
    const res2 = await POST();
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(mocks.mockInsertValues).toHaveBeenCalledTimes(2);
    expect(mocks.mockInsertValues).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ userId: 'db-2', type: 'magic_link.clicked' }),
    );
    expect(mocks.mockInsertValues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ userId: 'db-2', type: 'magic_link.clicked' }),
    );
  });
});
