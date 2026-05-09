import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { styles } from "@/lib/db/schema";
import GenerateForm from "./GenerateForm";

// Auth guard is handled by app/(dashboard)/layout.tsx

export const metadata = { title: "Generate Portrait · ArtPortrait Studio" };

export default async function GeneratePage() {
  const activeStyles = await db
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

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create portrait</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a photo, pick a style, and let the AI do the rest.
        </p>
      </div>

      <GenerateForm styles={activeStyles} />
    </main>
  );
}
