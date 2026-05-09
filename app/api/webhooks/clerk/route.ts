import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: verify Svix signature and handle Clerk webhook events
  return NextResponse.json({ received: true });
}
