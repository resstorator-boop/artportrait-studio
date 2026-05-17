import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
}));

import { clerkClient } from '@clerk/nextjs/server';
import { createMagicLinkToken } from '@/lib/auth/clerk';

describe('createMagicLinkToken', () => {
  beforeEach(() => {
    vi.mocked(clerkClient).mockResolvedValue({
      signInTokens: {
        createSignInToken: vi.fn().mockResolvedValue({ token: 'test-token-abc123' }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.numero.art';
  });

  it('возвращает token', async () => {
    const result = await createMagicLinkToken('clerk_user_123');
    expect(result.token).toBe('test-token-abc123');
  });

  it('URL содержит /api/auth/magic-link/verify с ticket', async () => {
    const result = await createMagicLinkToken('clerk_user_123');
    expect(result.url).toBe(
      'https://test.numero.art/api/auth/magic-link/verify?ticket=test-token-abc123',
    );
  });

  it('передаёт userId и expiresInSeconds=3600 в Clerk API', async () => {
    const mockCreateSignInToken = vi.fn().mockResolvedValue({ token: 'tok' });
    vi.mocked(clerkClient).mockResolvedValue({
      signInTokens: { createSignInToken: mockCreateSignInToken },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await createMagicLinkToken('user_xyz');

    expect(mockCreateSignInToken).toHaveBeenCalledWith({
      userId: 'user_xyz',
      expiresInSeconds: 3600,
    });
  });
});
