import { index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { productTypeEnum } from './enums';
import { orders } from './orders';

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productType: productTypeEnum('product_type').notNull(),
    quantity: integer('quantity').notNull().default(1),
    priceKopecks: integer('price_kopecks').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('order_items_order_id_idx').on(t.orderId)],
);

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
