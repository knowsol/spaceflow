import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/sheetsService';

export async function GET(req: NextRequest) {
  try {
    const sheetId = req.nextUrl.searchParams.get('sheetId');
    const reservationId = req.nextUrl.searchParams.get('reservationId') ?? undefined;
    if (!sheetId) return NextResponse.json({ error: 'sheetId 필요' }, { status: 400 });
    const history = await getHistory(sheetId, reservationId);
    return NextResponse.json(history);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
