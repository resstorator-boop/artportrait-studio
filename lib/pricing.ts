import type { ProductType } from '@/db/schema/enums';

export const PRICES: Record<ProductType, number> = {
  // Основные пакеты (копейки)
  pack_1: 10_000,   // 100 ₽
  pack_10: 70_000,  // 700 ₽
  pack_50: 290_000, // 2900 ₽
  // Phase 2 pricing TBD
  animation: 0,
  voiceover: 0,
  poster: 0,
  painting: 0,
  postcard: 0,
  puzzle: 0,
};

export function priceFor(productType: ProductType, quantity: number): number {
  return PRICES[productType] * quantity;
}
