import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { resolveCredits } from "@/lib/stripe/packs";
import { creditUser } from "@/lib/credits/ledger";

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  // Raw body is required for Stripe HMAC verification — must use req.text()
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

  // Idempotency: Stripe guarantees at-least-once delivery
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
    // Future: payment_intent.payment_failed, customer.subscription.* etc.

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

    // Record failure so the event is not silently lost; Stripe will retry
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

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  // Guard: skip free / invoice-pending sessions
  if (session.payment_status !== "paid") return;

  const { userId, pack, credits: creditsRaw } = session.metadata ?? {};

  if (!userId) {
    throw new Error("checkout metadata missing: userId");
  }

  // pack slug is authoritative; raw credits string is a fallback
  const credits = resolveCredits(pack, creditsRaw);
  if (!credits) {
    throw new Error(
      `Cannot resolve credits — pack: "${pack}", credits: "${creditsRaw}"`
    );
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await creditUser({
    userId,
    amount: credits,
    type: "purchase",
    description: pack ? `Pack: ${pack}` : "Credit purchase",
    stripePaymentIntentId: paymentIntentId,
  });
}
