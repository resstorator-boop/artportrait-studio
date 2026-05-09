import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, sessions, outputs } from "@/lib/db/schema";
import { CREDIT_PACKS } from "@/lib/stripe/packs";
import { CreditPacks } from "./CreditPacks";
import PurchaseBanner from "./PurchaseBanner";
import type { SessionStatus } from "@/lib/db/schema";

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const [user] = await db
    .select({ id: users.id, creditsBalance: users.creditsBalance })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) redirect("/sign-in");

  const userSessions = await db.query.sessions.findMany({
    where: eq(sessions.userId, user.id),
    with: { outputs: { limit: 1, orderBy: asc(outputs.createdAt) } },
    orderBy: desc(sessions.createdAt),
    limit: 20,
  });

  const packs = Object.values(CREDIT_PACKS).map(({ slug, name, credits }) => ({
    slug,
    name,
    credits,
  }));

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <Suspense fallback={null}>
        <PurchaseBanner />
      </Suspense>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/generate"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Generate new portrait
        </Link>
      </div>

      {/* Credit balance + buy packs */}
      <section className="rounded-xl border p-6 space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{user.creditsBalance}</span>
          <span className="text-gray-500">credits remaining</span>
        </div>
        <CreditPacks packs={packs} />
      </section>

      {/* Session list */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent sessions</h2>
        {userSessions.length === 0 ? (
          <p className="text-sm text-gray-500">
            No sessions yet. Generate your first portrait!
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userSessions.map((session) => {
              const thumb = session.outputs[0]?.publicUrl ?? null;
              return (
                <li key={session.id}>
                  <Link
                    href={`/sessions/${session.id}`}
                    className="group block rounded-xl border overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-gray-100 relative">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt="Portrait thumbnail"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-400">
                          <PendingLabel status={session.status} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                      <StatusBadge status={session.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function PendingLabel({ status }: { status: SessionStatus }) {
  const labels: Record<SessionStatus, string> = {
    pending: "Pending…",
    processing: "Processing…",
    completed: "No image",
    failed: "Failed",
    refunded: "Refunded",
  };
  return <>{labels[status]}</>;
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const colors: Record<SessionStatus, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}
