"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StyleOption = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  creditCost: number;
  previewImageUrl: string | null;
};

type Step = "idle" | "uploading" | "creating";

const STEP_LABEL: Record<Step, string> = {
  idle: "Generate portrait",
  uploading: "Uploading photo…",
  creating: "Starting generation…",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GenerateForm({ styles }: { styles: StyleOption[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [styleId, setStyleId] = useState(styles[0]?.id ?? "");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !styleId || step !== "idle") return;
    setError(null);

    try {
      // 1. Get presigned upload URL
      setStep("uploading");
      const uploadMeta = await fetchJson<{ uploadUrl: string; key: string }>(
        "/api/upload",
        { contentType: file.type }
      );

      // 2. PUT file directly to R2 (no auth header — presigned URL already has it)
      const r2Res = await fetch(uploadMeta.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!r2Res.ok) throw new Error("Image upload to storage failed");

      // 3. Create generation session
      setStep("creating");
      const session = await fetchJson<{ sessionId: string }>("/api/sessions", {
        styleId,
        inputImageKey: uploadMeta.key,
      });

      // 4. Redirect to status page
      router.push(`/sessions/${session.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }

  const busy = step !== "idle";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* ── Photo upload ── */}
      <section>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Your photo
        </label>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-indigo-400 hover:bg-indigo-50"
        >
          {preview ? (
            <img
              src={preview}
              alt="Selected photo"
              className="max-h-48 rounded-lg object-contain"
            />
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Click to select a photo
              </p>
              <p className="mt-1 text-xs text-gray-400">JPEG · PNG · WebP</p>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFileChange}
        />

        {file && (
          <p className="mt-2 text-xs text-gray-500 truncate">
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
      </section>

      {/* ── Style selector ── */}
      <section>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          Style
        </label>

        {styles.length === 0 ? (
          <p className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            No styles available yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {styles.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyleId(s.id)}
                className={[
                  "rounded-xl border p-3 text-left transition-all",
                  styleId === s.id
                    ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                    : "border-gray-200 bg-white hover:border-gray-300",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                {s.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                    {s.description}
                  </p>
                )}
                <p className="mt-2 text-xs font-medium text-indigo-600">
                  {s.creditCost} credit{s.creditCost !== 1 ? "s" : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Error ── */}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={busy || !file || !styleId}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {STEP_LABEL[step]}
      </button>
    </form>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data;
}
