import { NextResponse } from 'next/server';
import { and, eq, isNull, or } from 'drizzle-orm';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { events, users } from '@/db/schema';

export async function POST() {
  // 1. Проверяем наличие Clerk-сессии (подписанный JWT, верифицированный Clerk)
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Получаем email из Clerk
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const email = clerkUser.primaryEmailAddress?.emailAddress;

  if (!email) {
    return NextResponse.json({ error: 'No primary email on Clerk user' }, { status: 400 });
  }

  // 3. UPDATE с двумя условиями:
  //    - clerk_id = userId (нормальный путь, webhook уже пришёл)
  //    - clerk_id IS NULL AND email = email (race: webhook ещё не пришёл)
  //    clerk_id всегда ставим в userId — идемпотентно для уже заполненного.
  const updated = await db
    .update(users)
    .set({
      pendingRegistration: false,
      emailVerifiedAt: new Date(),
      clerkId: userId,
    })
    .where(
      or(
        eq(users.clerkId, userId),
        and(isNull(users.clerkId), eq(users.email, email)),
      ),
    )
    .returning({ id: users.id });

  // 4. 0 rows → юзер оплатил с email A, кликнул с email B (edge case)
  if (updated.length === 0) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  const dbUserId = updated[0]!.id;

  // 5. Логируем верификацию с установленным user_id
  await db.insert(events).values({
    userId: dbUserId,
    type: 'magic_link.clicked',
    payload: { source: 'activate' },
  });

  return NextResponse.json({ ok: true, userId: dbUserId });
}
