import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: generate presigned R2 upload URL
  return NextResponse.json({ url: "" });
}
