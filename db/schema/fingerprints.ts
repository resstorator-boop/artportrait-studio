import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

// Антифрод для рефералки — хранит fingerprint браузера/устройства
export const fingerprints = pgTable(
  'fingerprints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hash: text('hash').notNull().unique(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('fingerprints_user_id_idx').on(t.userId)],
);

export type Fingerprint = typeof fingerprints.$inferSelect;
export type NewFingerprint = typeof fingerprints.$inferInsert;
