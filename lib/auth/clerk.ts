import { clerkClient } from '@clerk/nextjs/server';

export interface MagicLinkToken {
  token: string;
  url: string;
}

/**
 * Создаёт Clerk sign-in token для userId и возвращает verify-URL.
 * URL ведёт на /api/auth/magic-link/verify?ticket=<token>.
 */
export async function createMagicLinkToken(userId: string): Promise<MagicLinkToken> {
  const client = await clerkClient();
  const signInToken = await client.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 3600,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const url = `${baseUrl}/api/auth/magic-link/verify?ticket=${signInToken.token}`;

  return { token: signInToken.token, url };
}
