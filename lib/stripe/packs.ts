// ─── Credit packs ─────────────────────────────────────────────────────────────
// Single source of truth: slug → credits.
// priceId comes from env so it can differ between envs without code changes.
// The slug is stored in Checkout Session metadata.pack and used at webhook time
// to resolve the authoritative credit amount server-side.

export type CreditPack = {
  slug: string;
  name: string;
  credits: number;
  /** Stripe Price ID — set via env per environment */
  priceId: string;
};

export const CREDIT_PACKS = {
  starter: {
    slug: "starter",
    name: "Starter",
    credits: 50,
    priceId: process.env.STRIPE_PRICE_STARTER ?? "",
  },
  pro: {
    slug: "pro",
    name: "Pro",
    credits: 150,
    priceId: process.env.STRIPE_PRICE_PRO ?? "",
  },
  studio: {
    slug: "studio",
    name: "Studio",
    credits: 500,
    priceId: process.env.STRIPE_PRICE_STUDIO ?? "",
  },
} satisfies Record<string, CreditPack>;

export type PackSlug = keyof typeof CREDIT_PACKS;

/**
 * Resolve the number of credits for a checkout.
 *
 * Priority:
 *  1. `pack` slug — looked up from CREDIT_PACKS (server-side authoritative)
 *  2. `creditsRaw` — numeric string from metadata (fallback / custom amounts)
 *
 * Returns `null` when neither yields a valid positive integer.
 */
export function resolveCredits(
  pack: string | undefined,
  creditsRaw: string | undefined
): number | null {
  if (pack && pack in CREDIT_PACKS) {
    return CREDIT_PACKS[pack as PackSlug].credits;
  }
  if (creditsRaw) {
    const n = parseInt(creditsRaw, 10);
    return !isNaN(n) && n > 0 ? n : null;
  }
  return null;
}
