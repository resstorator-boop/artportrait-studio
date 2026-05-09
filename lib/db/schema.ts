import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "purchase",
  "usage",
  "refund",
  "bonus",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "refunded",
]);

export const webhookSourceEnum = pgEnum("webhook_source", ["stripe", "clerk"]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  creditsBalance: integer("credits_balance").notNull().default(0),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Styles ───────────────────────────────────────────────────────────────────

export const styles = pgTable("styles", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  creditCost: integer("credit_cost").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  previewImageUrl: text("preview_image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Sessions (generation orders) ────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  styleId: uuid("style_id")
    .notNull()
    .references(() => styles.id),
  status: sessionStatusEnum("status").notNull().default("pending"),
  creditsCharged: integer("credits_charged").notNull(),
  inputImageKey: text("input_image_key"),
  prompt: text("prompt"),
  errorMessage: text("error_message"),
  inngestRunId: text("inngest_run_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Outputs ──────────────────────────────────────────────────────────────────

export const outputs = pgTable("outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull(),
  publicUrl: text("public_url").notNull(),
  width: integer("width"),
  height: integer("height"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Credit Transactions ──────────────────────────────────────────────────────

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // positive = credit added, negative = credit spent
  amount: integer("amount").notNull(),
  type: creditTransactionTypeEnum("type").notNull(),
  description: text("description"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  // set when type = "usage", links the debit to a session
  sessionId: uuid("session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Webhook Events (idempotency log) ─────────────────────────────────────────

export const webhookEvents = pgTable("webhook_events", {
  // provider-issued event ID used as idempotency key
  id: text("id").primaryKey(),
  source: webhookSourceEnum("source").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  creditTransactions: many(creditTransactions),
  sessions: many(sessions),
}));

export const stylesRelations = relations(styles, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  style: one(styles, { fields: [sessions.styleId], references: [styles.id] }),
  outputs: many(outputs),
  creditTransactions: many(creditTransactions),
}));

export const outputsRelations = relations(outputs, ({ one }) => ({
  session: one(sessions, {
    fields: [outputs.sessionId],
    references: [sessions.id],
  }),
}));

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [creditTransactions.userId],
      references: [users.id],
    }),
    session: one(sessions, {
      fields: [creditTransactions.sessionId],
      references: [sessions.id],
    }),
  })
);

// ─── Inferred types ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Style = typeof styles.$inferSelect;
export type NewStyle = typeof styles.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Output = typeof outputs.$inferSelect;
export type NewOutput = typeof outputs.$inferInsert;

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;

export type SessionStatus = Session["status"];
export type CreditTransactionType = CreditTransaction["type"];
export type WebhookSource = WebhookEvent["source"];
