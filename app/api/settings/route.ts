export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSettings, updateSettings, writeDb, readDb } from '../../../lib/db';

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dbState, ...settingsData } = body;

    if (dbState) {
      writeDb(dbState);
    }

    const updated = updateSettings(settingsData);
    const finalDb = readDb();
    return NextResponse.json({ result: updated, dbState: finalDb });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
