import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, sessions, outputs } from "@/lib/db/schema";

// ─── GET /api/sessions/[id] ───────────────────────────────────────────────────
// Returns the session status and outputs for the authenticated user.
// Safe for polling: always returns the same shape regardless of status.
//
// Response shape:
// {
//   sessionId:    string
//   status:       "pending" | "processing" | "completed" | "failed" | "refunded"
//   outputs:      Array<{ id, publicUrl, width, height, isPrimary }>
//   errorMessage: string | null
//   createdAt:    string   (ISO-8601)
//   completedAt:  string | null  (updatedAt when status is completed/failed)
// }

const TERMINAL_STATUSES = new Set(["completed", "failed", "refunded"]);

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  // 1. Auth
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  // 2. Resolve internal user
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 3. Load session — ownership enforced by AND userId = user.id
  const [session] = await db
    .select({
      id: sessions.id,
      status: sessions.status,
      errorMessage: sessions.errorMessage,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
    })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)))
    .limit(1);

  if (!session) {
    // Return 404 for both "not found" and "belongs to someone else"
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // 4. Load outputs (empty array while still processing)
  const sessionOutputs = await db
    .select({
      id: outputs.id,
      publicUrl: outputs.publicUrl,
      width: outputs.width,
      height: outputs.height,
      isPrimary: outputs.isPrimary,
    })
    .from(outputs)
    .where(eq(outputs.sessionId, session.id));

  // 5. Build response
  const isTerminal = TERMINAL_STATUSES.has(session.status);

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    outputs: sessionOutputs,
    errorMessage: session.errorMessage ?? null,
    createdAt: session.createdAt.toISOString(),
    completedAt: isTerminal ? session.updatedAt.toISOString() : null,
  });
}
