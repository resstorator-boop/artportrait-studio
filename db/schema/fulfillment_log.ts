import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { fulfillmentStatusEnum, productTypeEnum } from './enums';
import { orders } from './orders';

// Ручная печать физических товаров (постер/паззл/открытка/картина)
export const fulfillmentLog = pgTable(
  'fulfillment_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    productType: productTypeEnum('product_type').notNull(),
    status: fulfillmentStatusEnum('status').notNull().default('pending'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('fulfillment_log_order_id_idx').on(t.orderId),
    index('fulfillment_log_status_idx').on(t.status),
  ],
);

export type FulfillmentLog = typeof fulfillmentLog.$inferSelect;
export type NewFulfillmentLog = typeof fulfillmentLog.$inferInsert;
