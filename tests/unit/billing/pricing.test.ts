import { describe, expect, it } from 'vitest';
import { priceFor } from '@/lib/pricing';

describe('priceFor', () => {
  it('pack_1 × 1 = 10000 копеек (100 ₽)', () => {
    expect(priceFor('pack_1', 1)).toBe(10_000);
  });

  it('pack_10 × 1 = 70000 копеек (700 ₽)', () => {
    expect(priceFor('pack_10', 1)).toBe(70_000);
  });

  it('pack_50 × 1 = 290000 копеек (2900 ₽)', () => {
    expect(priceFor('pack_50', 1)).toBe(290_000);
  });

  it('умножает на quantity', () => {
    expect(priceFor('pack_1', 3)).toBe(30_000);
  });
});
