import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { events, users } from '@/db/schema';
import { createMagicLinkToken } from '@/lib/auth/clerk';

const bodySchema = z.object({ email: z.email() });

export async function POST(req: NextRequest) {
  let parsed: ReturnType<typeof bodySchema.safeParse>;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const { email } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Не раскрываем факт существования пользователя
  if (!user?.clerkId) {
    return NextResponse.json({ ok: true });
  }

  const { url } = await createMagicLinkToken(user.clerkId);

  // TODO Этап 4: заменить на реальный вызов Unisender Go (lib/email/unisender.ts)
  console.log(`[magic-link] Sending magic link to email=${email} url=${url}`);

  await db.insert(events).values({
    userId: user.id,
    type: 'magic_link.email_sent',
    payload: { email },
  });

  return NextResponse.json({ ok: true });
}
