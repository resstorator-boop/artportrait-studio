import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Seed: magic_link_initial, magic_link_reminder, magic_link_final,
//       welcome_quiz, referral_share
export const emailCampaigns = pgTable('email_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  subject: text('subject').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type NewEmailCampaign = typeof emailCampaigns.$inferInsert;
