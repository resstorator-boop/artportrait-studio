import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, sessions, outputs } from "@/lib/db/schema";
import StatusPoller, { type SessionData } from "./StatusPoller";

// Auth guard comes from app/(dashboard)/layout.tsx

export const metadata = { title: "Portrait status · ArtPortrait Studio" };

// Revalidate each request so the server render is always fresh
export const dynamic = "force-dynamic";

const TERMINAL = new Set(["completed", "failed", "refunded"]);

type Props = { params: { id: string } };

export default async function SessionStatusPage({ params }: Props) {
  const { userId: clerkId } = await auth();
  if (!clerkId) notFound(); // layout redirects first, this is belt-and-suspenders

  // Resolve internal user
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) notFound();

  // Load session — ownership enforced in WHERE clause
  const [session] = await db
    .select({
      id: sessions.id,
      status: sessions.status,
      errorMessage: sessions.errorMessage,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
    })
    .from(sessions)
    .where(and(eq(sessions.id, params.id), eq(sessions.userId, user.id)))
    .limit(1);

  if (!session) notFound();

  // Load outputs (empty array if not yet completed)
  const sessionOutputs = await db
    .select({
      id: outputs.id,
      publicUrl: outputs.publicUrl,
      width: outputs.width,
      height: outputs.height,
      isPrimary: outputs.isPrimary,
    })
    .from(outputs)
    .where(eq(outputs.sessionId, session.id));

  const initialData: SessionData = {
    sessionId: session.id,
    status: session.status,
    outputs: sessionOutputs,
    errorMessage: session.errorMessage ?? null,
    createdAt: session.createdAt.toISOString(),
    completedAt: TERMINAL.has(session.status)
      ? session.updatedAt.toISOString()
      : null,
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <StatusPoller initialData={initialData} sessionId={params.id} />
    </main>
  );
}
