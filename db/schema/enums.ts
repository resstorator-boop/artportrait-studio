import { pgEnum } from 'drizzle-orm/pg-core';

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'processing',
  'awaiting_fulfillment',
  'fulfilled',
  'failed',
  'refunded',
]);

export const productTypeEnum = pgEnum('product_type', [
  // Цифровые
  'pack_1',
  'pack_10',
  'pack_50',
  'animation',
  'voiceover',
  // Физические
  'poster',
  'painting',
  'postcard',
  'puzzle',
]);

export const generationStatusEnum = pgEnum('generation_status', [
  'pending',
  'analyzing',
  'generating',
  'completed',
  'failed',
]);

export const referralUseStatusEnum = pgEnum('referral_use_status', [
  'pending',
  'credited',
  'rejected',
]);

export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'pending',
  'sent',
  'delivered',
]);

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type ProductType = (typeof productTypeEnum.enumValues)[number];
export type GenerationStatus = (typeof generationStatusEnum.enumValues)[number];
export type ReferralUseStatus = (typeof referralUseStatusEnum.enumValues)[number];
export type FulfillmentStatus = (typeof fulfillmentStatusEnum.enumValues)[number];
