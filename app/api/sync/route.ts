export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { writeDb } from '../../../lib/db';

export async function POST(request: Request) {
  try {
    const { dbState } = await request.json();
    if (dbState) {
      writeDb(dbState);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
