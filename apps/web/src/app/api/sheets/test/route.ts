import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/sheetsService';

export async function POST(req: NextRequest) {
  try {
    const { sheetId } = await req.json() as { sheetId?: string };
    if (!sheetId) return NextResponse.json({ error: 'sheetId 필요' }, { status: 400 });
    const title = await testConnection(sheetId);
    return NextResponse.json({ title });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
