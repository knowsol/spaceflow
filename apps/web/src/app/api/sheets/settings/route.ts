import { NextRequest, NextResponse } from 'next/server';
import { getSheetSettings, saveSheetSettings } from '@/lib/sheetsService';

export async function GET(req: NextRequest) {
  const sheetId = req.nextUrl.searchParams.get('sheetId');
  if (!sheetId) return NextResponse.json({ error: 'sheetId required' }, { status: 400 });
  try {
    const data = await getSheetSettings(sheetId);
    return NextResponse.json(data ?? {});
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sheetId, workDays, repeatMaxCount, layoutWidth } = await req.json();
    if (!sheetId) return NextResponse.json({ error: 'sheetId required' }, { status: 400 });
    await saveSheetSettings(sheetId, {
      workDays,
      repeatMaxCount: typeof repeatMaxCount === 'number' ? repeatMaxCount : 100,
      layoutWidth: layoutWidth === 'full' || typeof layoutWidth === 'number' ? layoutWidth : 'full',
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
