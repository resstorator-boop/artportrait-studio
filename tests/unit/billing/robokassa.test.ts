import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';

// Фиксированные входы для детерминированных тестов
const LOGIN = 'test_login';
const PASS1 = 'test_pass1';
const PASS2 = 'test_pass2';
const INVOICE_ID = 12345;
const AMOUNT_KOPECKS = 10_000; // 100.00 ₽
const AMOUNT_RUBLES = '100.00';
const RECEIPT = JSON.stringify({ sno: 'usn_income', items: [] });

// Pre-computed hashes (verified by separate node script)
const EXPECTED_CREATE_SIG = '558a85c7fc5f0c745e62dd519a974b3c';
const EXPECTED_RESULT_SIG = '3f084f898f47adef750c75a949a61e9e';
const EXPECTED_SUCCESS_SIG = '2a7ad8f0d7cc0d685893418c812081b1';

function md5(s: string) { return createHash('md5').update(s, 'utf8').digest('hex'); }

// Проверяем формулы вручную (без импорта приватных функций)
describe('Robokassa MD5 signatures', () => {
  it('create sig = md5(login:amount:invoiceId:pass1:rawReceiptJson)', () => {
    const sig = md5(`${LOGIN}:${AMOUNT_RUBLES}:${INVOICE_ID}:${PASS1}:${RECEIPT}`);
    expect(sig).toBe(EXPECTED_CREATE_SIG);
  });

  it('result sig = md5(amount:invoiceId:pass2)', () => {
    const sig = md5(`${AMOUNT_RUBLES}:${INVOICE_ID}:${PASS2}`);
    expect(sig).toBe(EXPECTED_RESULT_SIG);
  });

  it('success sig = md5(amount:invoiceId:pass1)', () => {
    const sig = md5(`${AMOUNT_RUBLES}:${INVOICE_ID}:${PASS1}`);
    expect(sig).toBe(EXPECTED_SUCCESS_SIG);
  });

  it('raw JSON и URL-encoded JSON дают разные подписи', () => {
    const rawSig = md5(`${LOGIN}:${AMOUNT_RUBLES}:${INVOICE_ID}:${PASS1}:${RECEIPT}`);
    const encodedSig = md5(`${LOGIN}:${AMOUNT_RUBLES}:${INVOICE_ID}:${PASS1}:${encodeURIComponent(RECEIPT)}`);
    expect(rawSig).not.toBe(encodedSig);
  });
});

describe('createPaymentUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ROBOKASSA_MERCHANT_LOGIN: LOGIN,
      ROBOKASSA_PASSWORD_1: PASS1,
      ROBOKASSA_PASSWORD_2: PASS2,
      ROBOKASSA_IS_TEST: 'false',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('URL содержит правильный SignatureValue (raw JSON)', async () => {
    const { createPaymentUrl } = await import('@/lib/billing/robokassa');
    const url = createPaymentUrl({
      invoiceId: INVOICE_ID,
      amountKopecks: AMOUNT_KOPECKS,
      description: 'Test',
      receipt: { sno: 'usn_income', items: [] },
      email: 'test@example.com',
    });
    const params = new URL(url).searchParams;
    expect(params.get('SignatureValue')).toBe(EXPECTED_CREATE_SIG);
  });

  it('URL не содержит IsTest=1 когда ROBOKASSA_IS_TEST=false', async () => {
    const { createPaymentUrl } = await import('@/lib/billing/robokassa');
    const url = createPaymentUrl({
      invoiceId: INVOICE_ID,
      amountKopecks: AMOUNT_KOPECKS,
      description: 'Test',
      receipt: { sno: 'usn_income', items: [] },
      email: 'test@example.com',
    });
    expect(url).not.toContain('IsTest');
  });

  it('URL содержит IsTest=1 когда ROBOKASSA_IS_TEST=true', async () => {
    process.env.ROBOKASSA_IS_TEST = 'true';
    const mod = await import('@/lib/billing/robokassa');
    const url = mod.createPaymentUrl({
      invoiceId: INVOICE_ID,
      amountKopecks: AMOUNT_KOPECKS,
      description: 'Test',
      receipt: { sno: 'usn_income', items: [] },
      email: 'test@example.com',
    });
    expect(url).toContain('IsTest=1');
  });

  it('Receipt в URL декодируется обратно в исходный JSON (нет double-encoding)', async () => {
    const { createPaymentUrl } = await import('@/lib/billing/robokassa');
    const originalReceipt = { sno: 'usn_income' as const, items: [] };
    const url = createPaymentUrl({
      invoiceId: INVOICE_ID,
      amountKopecks: AMOUNT_KOPECKS,
      description: 'Test',
      receipt: originalReceipt,
      email: 'test@example.com',
    });
    const receiptParam = new URL(url).searchParams.get('Receipt');
    expect(receiptParam).not.toBeNull();
    expect(JSON.parse(receiptParam!)).toEqual(originalReceipt);
  });
});

describe('verifyResultSignature', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ROBOKASSA_MERCHANT_LOGIN: LOGIN, ROBOKASSA_PASSWORD_1: PASS1, ROBOKASSA_PASSWORD_2: PASS2 };
  });

  afterEach(() => { process.env = originalEnv; });

  it('возвращает true для правильной подписи', async () => {
    const { verifyResultSignature } = await import('@/lib/billing/robokassa');
    expect(verifyResultSignature(AMOUNT_KOPECKS, INVOICE_ID, EXPECTED_RESULT_SIG)).toBe(true);
  });

  it('возвращает false для неправильной подписи', async () => {
    const { verifyResultSignature } = await import('@/lib/billing/robokassa');
    expect(verifyResultSignature(AMOUNT_KOPECKS, INVOICE_ID, 'bad_signature_xyz')).toBe(false);
  });

  it('timing-safe compare не бросает при разной длине подписи', async () => {
    const { verifyResultSignature } = await import('@/lib/billing/robokassa');
    expect(() => verifyResultSignature(AMOUNT_KOPECKS, INVOICE_ID, 'short')).not.toThrow();
    expect(verifyResultSignature(AMOUNT_KOPECKS, INVOICE_ID, 'short')).toBe(false);
  });
});

describe('verifySuccessSignature', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ROBOKASSA_MERCHANT_LOGIN: LOGIN, ROBOKASSA_PASSWORD_1: PASS1, ROBOKASSA_PASSWORD_2: PASS2 };
  });

  afterEach(() => { process.env = originalEnv; });

  it('возвращает true для правильной подписи', async () => {
    const { verifySuccessSignature } = await import('@/lib/billing/robokassa');
    expect(verifySuccessSignature(AMOUNT_KOPECKS, INVOICE_ID, EXPECTED_SUCCESS_SIG)).toBe(true);
  });

  it('возвращает false для неправильной подписи', async () => {
    const { verifySuccessSignature } = await import('@/lib/billing/robokassa');
    expect(verifySuccessSignature(AMOUNT_KOPECKS, INVOICE_ID, 'wrong')).toBe(false);
  });
});
