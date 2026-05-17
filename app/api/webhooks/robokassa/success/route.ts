import { NextRequest, NextResponse } from 'next/server';
import { verifySuccessSignature } from '@/lib/billing/robokassa';

export async function GET(req: NextRequest) {
  const outSum = req.nextUrl.searchParams.get('OutSum') ?? '';
  const invId = req.nextUrl.searchParams.get('InvId') ?? '';
  const signatureValue = req.nextUrl.searchParams.get('SignatureValue') ?? '';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const parsedAmount = parseFloat(outSum);
  const amountKopecks =
    Number.isFinite(parsedAmount) && parsedAmount >= 0
      ? Math.round(parsedAmount * 100)
      : -1;

  if (
    amountKopecks < 0 ||
    !verifySuccessSignature(amountKopecks, Number(invId), signatureValue)
  ) {
    return NextResponse.redirect(`${baseUrl}/pricing?error=signature`, { status: 302 });
  }

  return NextResponse.redirect(`${baseUrl}/account?paid=true&order=${invId}`, { status: 302 });
}
