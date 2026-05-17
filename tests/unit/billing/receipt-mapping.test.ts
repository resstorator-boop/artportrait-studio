import { describe, expect, it } from 'vitest';
import {
  PAYMENT_OBJECT_BY_PRODUCT,
  PAYMENT_METHOD,
  TAX,
  SNO,
  buildReceiptPayload,
} from '@/lib/billing/receipt-mapping';

describe('PAYMENT_OBJECT_BY_PRODUCT', () => {
  it('pack_1 → service', () => expect(PAYMENT_OBJECT_BY_PRODUCT['pack_1']).toBe('service'));
  it('pack_10 → service', () => expect(PAYMENT_OBJECT_BY_PRODUCT['pack_10']).toBe('service'));
  it('pack_50 → service', () => expect(PAYMENT_OBJECT_BY_PRODUCT['pack_50']).toBe('service'));
  it('animation → service', () => expect(PAYMENT_OBJECT_BY_PRODUCT['animation']).toBe('service'));
  it('voiceover → service', () => expect(PAYMENT_OBJECT_BY_PRODUCT['voiceover']).toBe('service'));
  it('poster → commodity', () => expect(PAYMENT_OBJECT_BY_PRODUCT['poster']).toBe('commodity'));
  it('painting → commodity', () => expect(PAYMENT_OBJECT_BY_PRODUCT['painting']).toBe('commodity'));
  it('postcard → commodity', () => expect(PAYMENT_OBJECT_BY_PRODUCT['postcard']).toBe('commodity'));
  it('puzzle → commodity', () => expect(PAYMENT_OBJECT_BY_PRODUCT['puzzle']).toBe('commodity'));
});

describe('Constants', () => {
  it('PAYMENT_METHOD = full_payment', () => expect(PAYMENT_METHOD).toBe('full_payment'));
  it('TAX = none', () => expect(TAX).toBe('none'));
  it('SNO = usn_income', () => expect(SNO).toBe('usn_income'));
});

describe('buildReceiptPayload', () => {
  const items = [
    { productType: 'pack_1' as const, quantity: 1, priceKopecks: 10_000 },
    { productType: 'poster' as const, quantity: 2, priceKopecks: 50_000 },
  ];

  it('sno = usn_income', () => {
    const payload = buildReceiptPayload(items, 'test@example.com');
    expect(payload.sno).toBe('usn_income');
  });

  it('содержит правильное количество items', () => {
    const payload = buildReceiptPayload(items, 'test@example.com');
    expect(payload.items).toHaveLength(2);
  });

  it('pack_1 → payment_object=service, tax=none, payment_method=full_payment', () => {
    const payload = buildReceiptPayload(items, 'test@example.com');
    expect(payload.items[0]).toMatchObject({
      payment_object: 'service',
      tax: 'none',
      payment_method: 'full_payment',
    });
  });

  it('poster → payment_object=commodity', () => {
    const payload = buildReceiptPayload(items, 'test@example.com');
    expect(payload.items[1]).toMatchObject({ payment_object: 'commodity' });
  });

  it('sum в рублях (не в копейках): 10000 → 100', () => {
    const payload = buildReceiptPayload(items, 'test@example.com');
    expect(payload.items[0]!.sum).toBe(100);
  });

  it('пустой список items → пустой receipt', () => {
    const payload = buildReceiptPayload([], 'test@example.com');
    expect(payload.items).toHaveLength(0);
    expect(payload.sno).toBe('usn_income');
  });
});
