import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { styles } from "@/lib/db/schema";

// GET /api/styles — public, returns active styles ordered by sort_order
export async function GET() {
  const rows = await db
    .select({
      id: styles.id,
      slug: styles.slug,
      name: styles.name,
      description: styles.description,
      creditCost: styles.creditCost,
      previewImageUrl: styles.previewImageUrl,
    })
    .from(styles)
    .where(eq(styles.isActive, true))
    .orderBy(asc(styles.sortOrder));

  return NextResponse.json(rows);
}
