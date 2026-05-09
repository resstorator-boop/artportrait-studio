import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: verify Stripe webhook signature and handle events
  return NextResponse.json({ received: true });
}
