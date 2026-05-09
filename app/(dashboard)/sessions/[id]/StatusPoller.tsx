"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Shared types (exported for page.tsx) ─────────────────────────────────────

export type SessionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded";

export type SessionOutput = {
  id: string;
  publicUrl: string;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
};

export type SessionData = {
  sessionId: string;
  status: SessionStatus;
  outputs: SessionOutput[];
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TERMINAL = new Set<SessionStatus>(["completed", "failed", "refunded"]);
const POLL_MS = 3_000;

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatusPoller({
  initialData,
  sessionId,
}: {
  initialData: SessionData;
  sessionId: string;
}) {
  const [data, setData] = useState<SessionData>(initialData);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // If the server already returned a terminal state, nothing to poll
    if (TERMINAL.has(initialData.status)) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
          // Bypass Next.js fetch cache so we always get fresh data
          cache: "no-store",
        });
        if (!res.ok) return; // transient error — retry on next tick

        const next = (await res.json()) as SessionData;
        setData(next);

        if (TERMINAL.has(next.status)) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
        }
      } catch {
        // Network error — silently retry
      }
    };

    timerRef.current = setInterval(poll, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // ── Completed ─────────────────────────────────────────────────────────────

  if (data.status === "completed") {
    const primary =
      data.outputs.find((o) => o.isPrimary) ?? data.outputs[0] ?? null;

    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Your portrait is ready!
        </h1>

        {primary ? (
          <img
            src={primary.publicUrl}
            alt="Generated portrait"
            width={primary.width ?? undefined}
            height={primary.height ?? undefined}
            className="mx-auto max-h-[600px] w-full rounded-2xl object-contain shadow-lg"
          />
        ) : (
          <p className="text-sm text-gray-500">No image attached.</p>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {primary && (
            <a
              href={primary.publicUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Download
            </a>
          )}
          <Link
            href="/generate"
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Generate another
          </Link>
        </div>
      </div>
    );
  }

  // ── Failed ────────────────────────────────────────────────────────────────

  if (data.status === "failed") {
    return (
      <div className="space-y-5 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Generation failed</h1>

        {data.errorMessage && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {data.errorMessage}
          </p>
        )}

        <Link
          href="/generate"
          className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Try again
        </Link>
      </div>
    );
  }

  // ── Pending / Processing ──────────────────────────────────────────────────

  const label =
    data.status === "processing" ? "Generating your portrait…" : "Queued…";

  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      {/* CSS-only spinner, no extra dependencies */}
      <div
        aria-label="Loading"
        className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"
      />
      <div>
        <p className="text-base font-semibold text-gray-900">{label}</p>
        <p className="mt-1 text-sm text-gray-400">
          Checking every {POLL_MS / 1000} seconds…
        </p>
      </div>
    </div>
  );
}
