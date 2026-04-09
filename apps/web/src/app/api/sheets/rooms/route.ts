import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/sheetsService';

export async function GET(req: NextRequest) {
  try {
    const sheetId = req.nextUrl.searchParams.get('sheetId');
    if (!sheetId) return NextResponse.json({ error: 'sheetId 필요' }, { status: 400 });
    const rooms = await svc.getRooms(sheetId);
    return NextResponse.json(rooms);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sheetId, name, color } = await req.json() as { sheetId?: string; name?: string; color?: string };
    if (!sheetId || !name) return NextResponse.json({ error: 'sheetId, name 필요' }, { status: 400 });
    const room = await svc.addRoom(sheetId, name, color);
    return NextResponse.json(room);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
