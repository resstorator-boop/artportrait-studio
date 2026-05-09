import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { CREDIT_PACKS, type PackSlug } from "@/lib/stripe/packs";

// ─── POST /api/checkout ───────────────────────────────────────────────────────
// Body: { pack: "starter" | "pro" | "studio" }
// Returns: { url: string }  ← Stripe-hosted Checkout page

export async function POST(req: NextRequest) {
  // 1. Authenticate — never trust userId from the client
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate request body
  let pack: PackSlug;
  try {
    const body = (await req.json()) as { pack?: unknown };
    const slug = body.pack;
    if (typeof slug !== "string" || !(slug in CREDIT_PACKS)) {
      return NextResponse.json(
        { error: `Invalid pack. Valid values: ${Object.keys(CREDIT_PACKS).join(", ")}` },
        { status: 400 }
      );
    }
    pack = slug as PackSlug;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Resolve internal user row (we store our UUID in metadata, not clerkId)
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    // Clerk webhook hasn't synced yet — rare race condition
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 4. Resolve pack config
  const selectedPack = CREDIT_PACKS[pack];

  if (!selectedPack.priceId) {
    console.error(`STRIPE_PRICE_${pack.toUpperCase()} env var is not set`);
    return NextResponse.json({ error: "Pack not configured" }, { status: 500 });
  }

  // 5. Build URLs
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const successUrl = `${appUrl}/dashboard?purchase=success&pack=${pack}`;
  const cancelUrl  = `${appUrl}/dashboard`;

  // 6. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,       // pre-fill so user doesn't retype
    line_items: [{ price: selectedPack.priceId, quantity: 1 }],
    metadata: {
      userId:  user.id,                          // internal UUID → used by webhook
      pack:    selectedPack.slug,                // human-readable + resolveCredits key
      credits: String(selectedPack.credits),     // fallback for webhook resolveCredits
    },
    success_url: successUrl,
    cancel_url:  cancelUrl,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
