import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/sheetsService';
import type { Reservation } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const sheetId = req.nextUrl.searchParams.get('sheetId');
    if (!sheetId) return NextResponse.json({ error: 'sheetId 필요' }, { status: 400 });
    const reservations = await svc.getReservations(sheetId);
    return NextResponse.json(reservations);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sheetId, items, created_by } =
      await req.json() as {
        sheetId?: string;
        items?: Omit<Reservation, 'reservation_id' | 'created_at' | 'updated_at'>[];
        created_by?: string;
      };
    if (!sheetId || !items || !created_by)
      return NextResponse.json({ error: 'sheetId, items, created_by 필요' }, { status: 400 });
    const added = await svc.addReservations(sheetId, items, created_by);
    return NextResponse.json(added);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
