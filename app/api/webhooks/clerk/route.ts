import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, webhookEvents } from "@/lib/db/schema";

// ─── Clerk payload types (only fields we need) ────────────────────────────────

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUserData = {
  id: string;
  deleted?: boolean;
  first_name?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
};

type ClerkWebhookEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: ClerkUserData;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function primaryEmail(data: ClerkUserData): string {
  const list = data.email_addresses ?? [];
  const primary = list.find((e) => e.id === data.primary_email_address_id);
  return (primary ?? list[0])?.email_address ?? "";
}

function fullName(data: ClerkUserData): string | null {
  const parts = [data.first_name, data.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  const body = await req.text();
  const svixId = req.headers.get("svix-id") ?? "";
  const svixTs = req.headers.get("svix-timestamp") ?? "";
  const svixSig = req.headers.get("svix-signature") ?? "";

  if (!svixId || !svixTs || !svixSig) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  // Verify signature — throws on failure
  let event: ClerkWebhookEvent;
  try {
    event = new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTs,
      "svix-signature": svixSig,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  // Idempotency: skip if we already processed this event ID
  const [seen] = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(eq(webhookEvents.id, svixId))
    .limit(1);

  if (seen) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const { type, data } = event;
  const payload = JSON.parse(body) as Record<string, unknown>;

  try {
    if (type === "user.created" || type === "user.updated") {
      await db
        .insert(users)
        .values({
          clerkId: data.id,
          email: primaryEmail(data),
          name: fullName(data),
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: primaryEmail(data),
            name: fullName(data),
            updatedAt: new Date(),
          },
        });
    } else if (type === "user.deleted") {
      // ON DELETE CASCADE handles related rows in sessions / credit_transactions
      await db.delete(users).where(eq(users.clerkId, data.id));
    }

    await db.insert(webhookEvents).values({
      id: svixId,
      source: "clerk",
      type,
      payload,
      processedAt: new Date(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("clerk webhook processing error", { svixId, type, error });

    // Record the failure so the event isn't silently lost
    await db.insert(webhookEvents).values({
      id: svixId,
      source: "clerk",
      type,
      payload,
      error,
    });

    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
