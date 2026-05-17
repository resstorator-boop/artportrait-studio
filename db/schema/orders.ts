import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { orderStatusEnum } from './enums';
import { users } from './users';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: orderStatusEnum('status').notNull().default('pending'),
    // Сумма в копейках
    amountKopecks: integer('amount_kopecks').notNull(),
    robokassaInvoiceId: text('robokassa_invoice_id').unique(),
    // Partial unique index applied via raw SQL in 0001 migration
    // (drizzle-kit does not generate WHERE clause). See db/migrations/0001_*.sql.
    idempotencyKey: text('idempotency_key'),
    // 54-ФЗ Receipt payload для ОФД
    receiptPayload: jsonb('receipt_payload'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('orders_user_id_idx').on(t.userId),
    index('orders_status_idx').on(t.status),
    index('orders_paid_at_idx').on(t.paidAt),
  ],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
