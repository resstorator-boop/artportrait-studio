/**
 * Seed starter styles into the database.
 * Idempotent: uses ON CONFLICT DO NOTHING on the unique slug column.
 *
 * Usage:
 *   npm run db:seed
 *   npx tsx --env-file=.env.local scripts/seed-styles.ts
 */

import { db } from "@/lib/db";
import { styles } from "@/lib/db/schema";

const STYLES = [
  {
    slug: "oil-painting",
    name: "Oil Painting",
    description:
      "Rich textures and bold strokes in the style of classic oil masters.",
    creditCost: 10,
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: "watercolor",
    name: "Watercolor",
    description:
      "Soft, translucent washes with delicate edges and a dreamy feel.",
    creditCost: 8,
    isActive: true,
    sortOrder: 2,
  },
  {
    slug: "pencil-sketch",
    name: "Pencil Sketch",
    description: "Fine line work and careful shading, like a studio sketch.",
    creditCost: 5,
    isActive: true,
    sortOrder: 3,
  },
  {
    slug: "renaissance",
    name: "Renaissance",
    description:
      "Dramatic chiaroscuro lighting and the refined detail of the old masters.",
    creditCost: 12,
    isActive: true,
    sortOrder: 4,
  },
  {
    slug: "pop-art",
    name: "Pop Art",
    description:
      "Bold outlines, flat color, and graphic pop energy inspired by Warhol.",
    creditCost: 7,
    isActive: true,
    sortOrder: 5,
  },
] as const;

async function main() {
  console.log(`Seeding ${STYLES.length} styles…`);

  await db
    .insert(styles)
    .values([...STYLES])
    .onConflictDoNothing({ target: styles.slug });

  console.log("Done. Existing slugs were skipped, new ones inserted.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
