import { createHash, timingSafeEqual } from 'node:crypto';
import type { RobokassaReceiptPayload } from './receipt-mapping';

function md5(input: string): string {
  return createHash('md5').update(input, 'utf8').digest('hex');
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

const ROBOKASSA_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';

export interface PaymentUrlParams {
  invoiceId: number;
  amountKopecks: number;
  description: string;
  receipt: RobokassaReceiptPayload;
  email: string;
}

export function createPaymentUrl(params: PaymentUrlParams): string {
  const login = getEnv('ROBOKASSA_MERCHANT_LOGIN');
  const password1 = getEnv('ROBOKASSA_PASSWORD_1');
  const isTest = process.env.ROBOKASSA_IS_TEST === 'true';

  const { invoiceId, amountKopecks, description, receipt, email } = params;
  const amountRubles = (amountKopecks / 100).toFixed(2);
  const receiptJson = JSON.stringify(receipt);

  // Подпись: md5 от raw JSON receipt (не URL-encoded)
  const signature = md5(`${login}:${amountRubles}:${invoiceId}:${password1}:${receiptJson}`);

  const query = new URLSearchParams({
    MerchantLogin: login,
    OutSum: amountRubles,
    InvId: String(invoiceId),
    Description: description,
    SignatureValue: signature,
    Receipt: receiptJson, // URLSearchParams.toString() сам энкодит — не double-encode
    Email: email,
    Culture: 'ru',
    Encoding: 'utf-8',
  });

  if (isTest) query.set('IsTest', '1');

  return `${ROBOKASSA_URL}?${query.toString()}`;
}

export function verifyResultSignature(
  amountKopecks: number,
  invoiceId: number,
  signature: string,
): boolean {
  const password2 = getEnv('ROBOKASSA_PASSWORD_2');
  const amountRubles = (amountKopecks / 100).toFixed(2);
  const expected = md5(`${amountRubles}:${invoiceId}:${password2}`);
  return safeCompare(signature.toLowerCase(), expected);
}

export function verifySuccessSignature(
  amountKopecks: number,
  invoiceId: number,
  signature: string,
): boolean {
  const password1 = getEnv('ROBOKASSA_PASSWORD_1');
  const amountRubles = (amountKopecks / 100).toFixed(2);
  const expected = md5(`${amountRubles}:${invoiceId}:${password1}`);
  return safeCompare(signature.toLowerCase(), expected);
}
