import { eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import { sessions, styles, outputs } from "@/lib/db/schema";
import { generatePortraitImage } from "@/lib/ai/provider";
import { uploadToR2 } from "@/lib/r2/upload";

// ─── Event type ───────────────────────────────────────────────────────────────

type PortraitGenerateEvent = {
  name: "portrait/generate";
  data: { sessionId: string };
};

// ─── Failure handler ──────────────────────────────────────────────────────────
// Called by Inngest after all retries are exhausted.
// Marks the session as failed so the UI can surface the error.

async function onFailure({
  error,
  event,
}: {
  error: Error;
  event: { data: { event?: { data?: { sessionId?: string } } } };
}) {
  const sessionId = event.data?.event?.data?.sessionId;
  if (!sessionId) return;

  await db
    .update(sessions)
    .set({ status: "failed", errorMessage: error.message, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

// ─── Main function ────────────────────────────────────────────────────────────

export const generatePortrait = inngest.createFunction(
  {
    id: "generate-portrait",
    name: "Generate Portrait",
    retries: 2,
    onFailure,
  },
  { event: "portrait/generate" },

  async ({ event, step }) => {
    const { sessionId } = (event as PortraitGenerateEvent).data;

    // ── Step 1: load session ──────────────────────────────────────────────────
    const session = await step.run("load-session", async () => {
      const [row] = await db
        .select({
          id: sessions.id,
          userId: sessions.userId,
          styleId: sessions.styleId,
          inputImageKey: sessions.inputImageKey,
          prompt: sessions.prompt,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (!row) throw new Error(`Session not found: ${sessionId}`);
      return row;
    });

    // ── Step 2: load style ────────────────────────────────────────────────────
    const style = await step.run("load-style", async () => {
      const [row] = await db
        .select({ id: styles.id, slug: styles.slug })
        .from(styles)
        .where(eq(styles.id, session.styleId))
        .limit(1);

      if (!row) throw new Error(`Style not found: ${session.styleId}`);
      return row;
    });

    // ── Step 3: call AI provider ──────────────────────────────────────────────
    const generated = await step.run("call-ai-provider", async () => {
      return generatePortraitImage({
        inputImageKey: session.inputImageKey ?? "",
        styleSlug: style.slug,
        prompt: session.prompt,
      });
    });

    // ── Step 4: download result and upload to R2 ──────────────────────────────
    // In mock mode the imageUrl is already a stable public URL, so skip R2.
    const r2Result = await step.run("upload-to-r2", async () => {
      const r2Key = `outputs/${sessionId}/result.png`;

      if (process.env.AI_PROVIDER === "mock") {
        return { r2Key, publicUrl: generated.imageUrl };
      }

      const response = await fetch(generated.imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch generated image: ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const publicUrl = await uploadToR2({ key: r2Key, buffer, contentType: "image/png" });

      return { r2Key, publicUrl };
    });

    // ── Step 5: persist output + mark session complete ────────────────────────
    await step.run("save-results", async () => {
      await db.insert(outputs).values({
        sessionId,
        r2Key: r2Result.r2Key,
        publicUrl: r2Result.publicUrl,
        width: generated.width ?? null,
        height: generated.height ?? null,
        isPrimary: true,
      });

      await db
        .update(sessions)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(sessions.id, sessionId));
    });

    return { sessionId, outputUrl: r2Result.publicUrl };
  }
);
