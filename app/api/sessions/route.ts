import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, styles, sessions, outputs } from "@/lib/db/schema";
import { debitUser, InsufficientCreditsError } from "@/lib/credits/ledger";
import { inngest } from "@/inngest/client";

// ─── POST /api/sessions ───────────────────────────────────────────────────────
// Body:    { styleId: string, inputImageKey: string }
// Returns: { sessionId: string }  201
//
// inputImageKey must be the R2 key returned by POST /api/upload.
//
// Flow:
//   auth → resolve user → validate style → insert session (pending) →
//   debitUser → fire Inngest event → update session (processing) → 201

export async function POST(req: NextRequest) {
  // 1. Auth
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate body
  let styleId: string;
  let inputImageKey: string;
  try {
    const body = (await req.json()) as { styleId?: unknown; inputImageKey?: unknown };

    if (typeof body.styleId !== "string" || !body.styleId) {
      return NextResponse.json({ error: "styleId is required" }, { status: 400 });
    }
    if (typeof body.inputImageKey !== "string" || !body.inputImageKey) {
      return NextResponse.json({ error: "inputImageKey is required" }, { status: 400 });
    }
    // Sanity-check: only keys produced by /api/upload are accepted
    if (!body.inputImageKey.startsWith("uploads/")) {
      return NextResponse.json({ error: "Invalid inputImageKey" }, { status: 400 });
    }

    styleId = body.styleId;
    inputImageKey = body.inputImageKey;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Resolve internal user
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 4. Resolve style
  const [style] = await db
    .select({ id: styles.id, slug: styles.slug, creditCost: styles.creditCost, isActive: styles.isActive })
    .from(styles)
    .where(eq(styles.id, styleId))
    .limit(1);

  if (!style) {
    return NextResponse.json({ error: "Style not found" }, { status: 404 });
  }
  if (!style.isActive) {
    return NextResponse.json({ error: "Style is not available" }, { status: 400 });
  }

  // 5. Create session (pending) — session ID needed for debit ledger link
  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      styleId: style.id,
      status: "pending",
      creditsCharged: style.creditCost,
      inputImageKey,
    })
    .returning({ id: sessions.id });

  // 6. Debit credits — atomic balance check + deduction
  try {
    await debitUser({
      userId: user.id,
      amount: style.creditCost,
      sessionId: session.id,
      description: `Portrait generation — ${style.slug}`,
    });
  } catch (err) {
    // Clean up the dangling session before surfacing the error
    await db.delete(sessions).where(eq(sessions.id, session.id));

    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", balance: err.balance, required: err.required },
        { status: 402 }
      );
    }
    throw err;
  }

  // 7. Fire Inngest event
  const { ids } = await inngest.send({
    name: "portrait/generate",
    data: { sessionId: session.id },
  });

  // 8. Advance status and store run reference
  await db
    .update(sessions)
    .set({ status: "processing", inngestRunId: ids[0] ?? null, updatedAt: new Date() })
    .where(eq(sessions.id, session.id));

  return NextResponse.json({ sessionId: session.id }, { status: 201 });
}

// ─── GET /api/sessions ────────────────────────────────────────────────────────
// Returns: last 20 sessions for the authenticated user, each with outputs[0]

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const rows = await db.query.sessions.findMany({
    where: eq(sessions.userId, user.id),
    with: { outputs: { limit: 1, orderBy: asc(outputs.createdAt) } },
    orderBy: desc(sessions.createdAt),
    limit: 20,
  });

  return NextResponse.json(rows);
}
