import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/sheetsService';
import type { Reservation } from '@/lib/types';

/** DELETE — 반복 그룹 전체 취소 */
export async function DELETE(req: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const { sheetId, cancelled_by } =
      await req.json() as { sheetId?: string; cancelled_by?: string };
    if (!sheetId || !cancelled_by)
      return NextResponse.json({ error: 'sheetId, cancelled_by 필요' }, { status: 400 });
    await svc.cancelReservationsByGroup(sheetId, params.groupId, cancelled_by);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** PATCH — 반복 그룹 전체 수정 */
export async function PATCH(req: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const { sheetId, changed_by, ...data } =
      await req.json() as { sheetId?: string; changed_by?: string } &
        Partial<Omit<Reservation, 'reservation_id' | 'created_at' | 'date'>>;
    if (!sheetId || !changed_by)
      return NextResponse.json({ error: 'sheetId, changed_by 필요' }, { status: 400 });
    await svc.updateReservationsByGroup(sheetId, params.groupId, data, changed_by);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
