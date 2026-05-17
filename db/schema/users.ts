import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // NULLABLE до клика по magic link — пользователь создаётся после оплаты
    clerkId: text('clerk_id').unique(),
    email: text('email').notNull().unique(),
    // true до клика по magic link
    pendingRegistration: boolean('pending_registration').notNull().default(true),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('users_pending_registration_idx').on(t.pendingRegistration)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
