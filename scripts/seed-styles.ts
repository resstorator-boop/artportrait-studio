/**
 * Seed styles from content/styles/*.json into the database.
 * Deactivates all styles, then upserts each JSON row so exactly the catalog
 * from disk is active (Docs/landing-spec.md — director moods).
 *
 * Usage:
 *   npm run db:seed
 *   npx tsx --env-file=.env.local scripts/seed-styles.ts
 */

import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { styles } from "@/lib/db/schema";

type StyleJson = {
  slug: string;
  name: string;
  description: string;
  creditCost: number;
  sortOrder: number;
  isActive?: boolean;
};

function loadStylesFromDisk(): StyleJson[] {
  const dir = path.join(process.cwd(), "content", "styles");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

  const rows: StyleJson[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    rows.push(JSON.parse(raw) as StyleJson);
  }
  rows.sort((a, b) => a.sortOrder - b.sortOrder);
  return rows;
}

async function main() {
  const rows = loadStylesFromDisk();
  console.log(`Seeding ${rows.length} styles from content/styles…`);

  await db.transaction(async (tx) => {
    await tx.update(styles).set({ isActive: false });

    for (const r of rows) {
      await tx
        .insert(styles)
        .values({
          slug: r.slug,
          name: r.name,
          description: r.description,
          creditCost: r.creditCost,
          sortOrder: r.sortOrder,
          isActive: r.isActive ?? true,
        })
        .onConflictDoUpdate({
          target: styles.slug,
          set: {
            name: r.name,
            description: r.description,
            creditCost: r.creditCost,
            sortOrder: r.sortOrder,
            isActive: r.isActive ?? true,
          },
        });
    }
  });

  console.log("Done. All styles deactivated first; catalog from JSON is active.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
