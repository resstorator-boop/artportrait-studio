import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, creditTransactions, webhookEvents } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  // Raw body required for Stripe HMAC verification
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  // Idempotency: Stripe may deliver the same event more than once
  const [seen] = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(eq(webhookEvents.id, event.id))
    .limit(1);

  if (seen) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const payload = JSON.parse(body) as Record<string, unknown>;

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session
      );
    }
    // Additional event types go here in future milestones

    await db.insert(webhookEvents).values({
      id: event.id,
      source: "stripe",
      type: event.type,
      payload,
      processedAt: new Date(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("stripe webhook error", { eventId: event.id, type: event.type, error });

    await db.insert(webhookEvents).values({
      id: event.id,
      source: "stripe",
      type: event.type,
      payload,
      error,
    });

    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── checkout.session.completed ───────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Guard: only process paid sessions (not free / pending invoice)
  if (session.payment_status !== "paid") return;

  const userId = session.metadata?.userId;
  const creditsRaw = session.metadata?.credits;

  if (!userId || !creditsRaw) {
    throw new Error(
      `Missing required metadata — userId: ${userId}, credits: ${creditsRaw}`
    );
  }

  const credits = parseInt(creditsRaw, 10);
  if (isNaN(credits) || credits <= 0) {
    throw new Error(`Invalid credits value in metadata: "${creditsRaw}"`);
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const packLabel = session.metadata?.pack;

  // Atomic: update balance + insert ledger entry
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        creditsBalance: sql`${users.creditsBalance} + ${credits}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await tx.insert(creditTransactions).values({
      userId,
      amount: credits,
      type: "purchase",
      description: packLabel ? `Pack: ${packLabel}` : "Credit purchase",
      stripePaymentIntentId: paymentIntentId,
    });
  });
}
