import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events } from '@/db/schema';

export async function GET(req: NextRequest) {
  const ticket = req.nextUrl.searchParams.get('ticket');

  if (!ticket || ticket.trim() === '') {
    return NextResponse.json({ error: 'Missing ticket' }, { status: 400 });
  }

  // Логируем анонимный клик по ссылке для аналитики воронки.
  // user_id=null — кто кликнул, выясним позже в /api/auth/activate.
  await db.insert(events).values({
    userId: null,
    type: 'magic_link.clicked',
    payload: {
      ticket_prefix: ticket.slice(0, 8),
      timestamp: new Date().toISOString(),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return NextResponse.redirect(`${baseUrl}/account?ticket=${ticket}`, { status: 302 });
}
