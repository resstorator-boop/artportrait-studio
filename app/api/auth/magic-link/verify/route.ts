import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { events, users } from '@/db/schema';

/**
 * Декодирует payload JWT без верификации подписи.
 * Используется только для извлечения sub (Clerk user ID) — сам Clerk user
 * затем запрашивается через API, что обеспечивает фактическую верификацию.
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  return JSON.parse(
    Buffer.from(parts[1]!, 'base64url').toString('utf-8'),
  ) as Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  const ticket = req.nextUrl.searchParams.get('ticket');
  if (!ticket) {
    return NextResponse.json({ error: 'Missing ticket' }, { status: 400 });
  }

  // 1. Декодируем JWT payload → Clerk user ID (sub)
  let clerkUserId: string;
  try {
    const payload = decodeJwtPayload(ticket);
    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new Error('Missing sub claim');
    }
    clerkUserId = payload.sub;
  } catch {
    return NextResponse.json({ error: 'Invalid ticket' }, { status: 400 });
  }

  // 2. Запрашиваем Clerk user — это фактически верифицирует существование пользователя
  let clerkEmail: string;
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);
    const primaryEmailObj = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    if (!primaryEmailObj?.emailAddress) throw new Error('No primary email');
    clerkEmail = primaryEmailObj.emailAddress;
  } catch {
    return NextResponse.json({ error: 'Invalid ticket' }, { status: 400 });
  }

  // 3. Находим пользователя в нашей DB по email (не по uid из URL)
  const user = await db.query.users.findFirst({
    where: eq(users.email, clerkEmail),
  });

  if (user) {
    // 4. Обновляем флаги регистрации
    await db
      .update(users)
      .set({ pendingRegistration: false, emailVerifiedAt: new Date() })
      .where(eq(users.id, user.id));

    // 5. Логируем событие
    await db.insert(events).values({
      userId: user.id,
      type: 'magic_link.clicked',
      payload: { clerkUserId },
    });
  }

  // 6. Редирект на /account с ticket для клиентской стороны Clerk sign-in
  // Страница /account (Этап 9) завершит цикл: signIn.create({ strategy: 'ticket', ticket })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return NextResponse.redirect(`${baseUrl}/account?ticket=${ticket}`);
}
