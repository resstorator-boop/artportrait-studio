import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { events, users } from '@/db/schema';

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkWebhookData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkWebhookData;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const clerkUserId = event.data.id;
  const primaryEmail = event.data.email_addresses.find(
    (e) => e.id === event.data.primary_email_address_id,
  )?.email_address;

  // Найти нашего пользователя для привязки event
  const existingUser = primaryEmail
    ? await db.query.users.findFirst({ where: eq(users.email, primaryEmail) })
    : null;

  // Логируем все входящие webhook события
  await db.insert(events).values({
    userId: existingUser?.id ?? null,
    type: 'clerk.webhook.received',
    payload: { eventType: event.type, clerkUserId },
  });

  if (event.type === 'user.created' && primaryEmail) {
    await db
      .update(users)
      .set({ clerkId: clerkUserId })
      .where(eq(users.email, primaryEmail));
  }

  if (event.type === 'user.updated' && primaryEmail) {
    await db
      .update(users)
      .set({ clerkId: clerkUserId })
      .where(eq(users.email, primaryEmail));
  }

  if (event.type === 'user.deleted') {
    await db
      .update(users)
      .set({ clerkId: null })
      .where(eq(users.clerkId, clerkUserId));
  }

  return NextResponse.json({ ok: true });
}
