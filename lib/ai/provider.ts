// ─── Types ────────────────────────────────────────────────────────────────────

export type GenerateInput = {
  /** R2 key of the user's uploaded source photo */
  inputImageKey: string;
  styleSlug: string;
  prompt?: string | null;
};

export type GenerateOutput = {
  /** Publicly reachable URL of the generated image */
  imageUrl: string;
  width?: number;
  height?: number;
};

// ─── Mock implementation ──────────────────────────────────────────────────────
// Used when AI_PROVIDER=mock (local dev / CI).
// Returns a deterministic placeholder so the full pipeline is testable
// without a real AI API key.

async function generateMock(_input: GenerateInput): Promise<GenerateOutput> {
  // Simulate ~2 s network latency
  await new Promise((r) => setTimeout(r, 2_000));
  return {
    imageUrl: "https://placehold.co/1024x1024/png",
    width: 1024,
    height: 1024,
  };
}

// ─── Real implementation stubs ────────────────────────────────────────────────
// TODO: replace with Replicate / fal.ai call in the AI-provider chunk.

async function generateReal(_input: GenerateInput): Promise<GenerateOutput> {
  // Example shape for Replicate:
  //   const output = await replicate.run("owner/model:version", { input: { ... } });
  throw new Error(
    "Real AI provider not implemented yet. Set AI_PROVIDER=mock for local testing."
  );
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Generate a portrait image.
 * Delegates to mock when AI_PROVIDER=mock, otherwise calls the real provider.
 */
export async function generatePortraitImage(
  input: GenerateInput
): Promise<GenerateOutput> {
  if (process.env.AI_PROVIDER === "mock") {
    return generateMock(input);
  }
  return generateReal(input);
}
