"use client";

import { useState } from "react";

export type PackInfo = { slug: string; name: string; credits: number };

export function CreditPacks({ packs }: { packs: PackInfo[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleBuy(slug: string) {
    setLoading(slug);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: slug }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        alert(data.error ?? "Failed to start checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      alert("Network error, please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {packs.map((pack) => (
        <button
          key={pack.slug}
          onClick={() => handleBuy(pack.slug)}
          disabled={loading !== null}
          className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === pack.slug
            ? "Redirecting…"
            : `Buy ${pack.name} — ${pack.credits} credits`}
        </button>
      ))}
    </div>
  );
}
