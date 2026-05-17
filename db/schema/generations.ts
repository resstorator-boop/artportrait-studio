import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { generationStatusEnum } from './enums';
import { orders } from './orders';
import { users } from './users';

export const generations = pgTable(
  'generations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    // R2 ключ загруженного селфи
    selfieR2Key: text('selfie_r2_key').notNull(),
    // Результат анализа Claude Vision
    faceMeta: jsonb('face_meta'),
    status: generationStatusEnum('status').notNull().default('pending'),
    // Массив R2 ключей результатов
    resultR2Keys: jsonb('result_r2_keys').$type<string[]>(),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('generations_order_id_idx').on(t.orderId),
    index('generations_status_idx').on(t.status),
  ],
);

export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
