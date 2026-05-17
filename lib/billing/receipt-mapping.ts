import type { ProductType } from '@/db/schema/enums';

export type PaymentObject = 'service' | 'commodity';
export type PaymentMethod = 'full_payment';
export type Tax = 'none';
export type Sno = 'usn_income';

export const PAYMENT_OBJECT_BY_PRODUCT: Record<ProductType, PaymentObject> = {
  // Цифровые услуги — AI-генерация
  pack_1: 'service',
  pack_10: 'service',
  pack_50: 'service',
  animation: 'service',
  voiceover: 'service',
  // Физические товары
  poster: 'commodity',
  painting: 'commodity',
  postcard: 'commodity',
  puzzle: 'commodity',
};

export const PAYMENT_METHOD: PaymentMethod = 'full_payment';
export const TAX: Tax = 'none';
export const SNO: Sno = 'usn_income'; // УСН 6% — НДС не выделяется

export interface ReceiptItem {
  productType: ProductType;
  quantity: number;
  priceKopecks: number;
}

export interface RobokassaReceiptPayload {
  sno: Sno;
  items: Array<{
    name: string;
    quantity: number;
    sum: number;
    payment_method: PaymentMethod;
    payment_object: PaymentObject;
    tax: Tax;
  }>;
}

const PRODUCT_NAMES: Record<ProductType, string> = {
  pack_1: 'NUMERO — 1 арт-портрет',
  pack_10: 'NUMERO — 10 арт-портретов',
  pack_50: 'NUMERO — 50 арт-портретов',
  animation: 'NUMERO — Анимация',
  voiceover: 'NUMERO — Озвучка',
  poster: 'NUMERO — Постер',
  painting: 'NUMERO — Картина',
  postcard: 'NUMERO — Открытка',
  puzzle: 'NUMERO — Пазл',
};

export function buildReceiptPayload(
  items: ReceiptItem[],
  _customerEmail: string,
): RobokassaReceiptPayload {
  return {
    sno: SNO,
    items: items.map((item) => ({
      name: PRODUCT_NAMES[item.productType],
      quantity: item.quantity,
      sum: (item.priceKopecks / 100),
      payment_method: PAYMENT_METHOD,
      payment_object: PAYMENT_OBJECT_BY_PRODUCT[item.productType],
      tax: TAX,
    })),
  };
}
