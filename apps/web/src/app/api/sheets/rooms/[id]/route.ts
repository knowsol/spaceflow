import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/sheetsService';
import type { Room } from '@/lib/types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { sheetId, ...data } = await req.json() as { sheetId?: string } & Partial<Omit<Room, 'room_id'>>;
    if (!sheetId) return NextResponse.json({ error: 'sheetId 필요' }, { status: 400 });
    const room = await svc.updateRoom(sheetId, params.id, data);
    return NextResponse.json(room);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sheetId = req.nextUrl.searchParams.get('sheetId');
    if (!sheetId) return NextResponse.json({ error: 'sheetId 필요' }, { status: 400 });
    await svc.deleteRoom(sheetId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
