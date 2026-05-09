/**
 * Credit ledger — the only place that touches credits_balance.
 *
 * Rules:
 *  - Every balance change is atomic: UPDATE users + INSERT credit_transactions
 *    happen in a single transaction, so the ledger is never out of sync.
 *  - Callers never write to users.credits_balance directly.
 *  - debitUser checks balance before writing; throws on insufficient credits.
 */

import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, creditTransactions } from "@/lib/db/schema";
import type { CreditTransactionType } from "@/lib/db/schema";

// ─── Internal tx type ─────────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Public param types ───────────────────────────────────────────────────────

export type CreditParams = {
  userId: string;
  amount: number; // must be > 0
  type: Extract<CreditTransactionType, "purchase" | "bonus">;
  description?: string;
  stripePaymentIntentId?: string | null;
};

export type DebitParams = {
  userId: string;
  amount: number; // positive — will be stored as negative
  sessionId: string;
  description?: string;
};

// ─── Core writer (always runs inside a transaction) ───────────────────────────

async function writeLedger(
  tx: Tx,
  entry: {
    userId: string;
    amount: number;
    type: CreditTransactionType;
    description?: string | null;
    stripePaymentIntentId?: string | null;
    sessionId?: string | null;
  }
): Promise<void> {
  await tx
    .update(users)
    .set({
      creditsBalance: sql`${users.creditsBalance} + ${entry.amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, entry.userId));

  await tx.insert(creditTransactions).values({
    userId: entry.userId,
    amount: entry.amount,
    type: entry.type,
    description: entry.description ?? null,
    stripePaymentIntentId: entry.stripePaymentIntentId ?? null,
    sessionId: entry.sessionId ?? null,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add credits to a user's balance (purchase or bonus).
 * Creates its own transaction.
 */
export async function creditUser(params: CreditParams): Promise<void> {
  if (params.amount <= 0) throw new Error("creditUser: amount must be > 0");

  await db.transaction((tx) =>
    writeLedger(tx, {
      userId: params.userId,
      amount: params.amount,
      type: params.type,
      description: params.description,
      stripePaymentIntentId: params.stripePaymentIntentId,
    })
  );
}

/**
 * Deduct credits for a generation session.
 * Throws `InsufficientCreditsError` if balance is too low.
 * Creates its own transaction.
 */
export async function debitUser(params: DebitParams): Promise<void> {
  if (params.amount <= 0) throw new Error("debitUser: amount must be > 0");

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ creditsBalance: users.creditsBalance })
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1);

    if (!row) throw new Error(`debitUser: user not found — ${params.userId}`);

    if (row.creditsBalance < params.amount) {
      throw new InsufficientCreditsError(row.creditsBalance, params.amount);
    }

    await writeLedger(tx, {
      userId: params.userId,
      amount: -params.amount,
      type: "usage",
      description: params.description,
      sessionId: params.sessionId,
    });
  });
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly balance: number,
    public readonly required: number
  ) {
    super(
      `Insufficient credits: balance=${balance}, required=${required}`
    );
    this.name = "InsufficientCreditsError";
  }
}
