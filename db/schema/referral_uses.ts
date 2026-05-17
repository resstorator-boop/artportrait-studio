import { index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { referralUseStatusEnum } from './enums';
import { orders } from './orders';
import { referrals } from './referrals';
import { users } from './users';

export const referralUses = pgTable(
  'referral_uses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    referralId: uuid('referral_id')
      .notNull()
      .references(() => referrals.id, { onDelete: 'cascade' }),
    // Каждый приглашённый использует код только раз
    referredUserId: uuid('referred_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: referralUseStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('referral_uses_unique').on(t.referralId, t.referredUserId),
    index('referral_uses_referral_id_idx').on(t.referralId),
    index('referral_uses_referred_user_id_idx').on(t.referredUserId),
  ],
);

export type ReferralUse = typeof referralUses.$inferSelect;
export type NewReferralUse = typeof referralUses.$inferInsert;
