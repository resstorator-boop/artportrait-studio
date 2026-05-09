"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CREDIT_PACKS, type PackSlug } from "@/lib/stripe/packs";

// Wrapped in Suspense by page.tsx — required for useSearchParams in Next 14.
export default function PurchaseBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Lazy init: read params once on first render and freeze them in state.
  // router.replace() will update the URL and trigger a re-render with empty
  // searchParams, but this state value is already locked in.
  const [data] = useState<{ credits: number } | null>(() => {
    const purchase = searchParams.get("purchase");
    const pack = searchParams.get("pack");
    if (purchase !== "success" || !pack || !(pack in CREDIT_PACKS)) return null;
    return { credits: CREDIT_PACKS[pack as PackSlug].credits };
  });

  const [visible, setVisible] = useState(data !== null);

  useEffect(() => {
    if (!data) return;
    // Strip query params so a hard refresh doesn't re-show the banner.
    router.replace("/dashboard");
    const t = setTimeout(() => setVisible(false), 5_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  if (!visible || !data) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-between rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white"
    >
      <span>
        You got <strong>{data.credits} credits!</strong> Your balance has been
        updated.
      </span>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="ml-4 text-white/70 hover:text-white text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}
