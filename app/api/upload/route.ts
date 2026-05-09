import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { r2, R2_BUCKET } from "@/lib/r2";

// ─── Allowed types ────────────────────────────────────────────────────────────

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AllowedContentType = keyof typeof ALLOWED_TYPES;

function isAllowed(ct: unknown): ct is AllowedContentType {
  return typeof ct === "string" && ct in ALLOWED_TYPES;
}

// ─── POST /api/upload ─────────────────────────────────────────────────────────
// Body:    { contentType: "image/jpeg" | "image/png" | "image/webp" }
// Returns: { uploadUrl: string, key: string }
//
// Client flow:
//   1. POST /api/upload → { uploadUrl, key }
//   2. PUT uploadUrl  (Content-Type header must match requested contentType)
//   3. POST /api/sessions { styleId, inputImageKey: key }

export async function POST(req: NextRequest) {
  // 1. Auth
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate body
  let contentType: AllowedContentType;
  try {
    const body = (await req.json()) as { contentType?: unknown };
    if (!isAllowed(body.contentType)) {
      return NextResponse.json(
        { error: `contentType must be one of: ${Object.keys(ALLOWED_TYPES).join(", ")}` },
        { status: 400 }
      );
    }
    contentType = body.contentType;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Resolve internal user (key is namespaced by internal UUID, not clerkId)
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 4. Build collision-free R2 key
  const ext = ALLOWED_TYPES[contentType];
  const key = `uploads/${user.id}/${crypto.randomUUID()}.${ext}`;

  // 5. Generate presigned PUT URL (15 min TTL)
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 });

  return NextResponse.json({ uploadUrl, key });
}
