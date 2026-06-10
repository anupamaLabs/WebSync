import { NextResponse } from 'next/server';
import { tickScheduler } from '../../../../lib/scheduler';
import { writeDb, readDb } from '../../../../lib/db';

export async function POST(request: Request) {
  try {
    // Some external cron setups might send an empty body, support that fallback
    let dbState = null;
    try {
      const body = await request.json();
      dbState = body?.dbState;
    } catch {
      // Empty body
    }

    if (dbState) {
      writeDb(dbState);
    }

    const summary = await tickScheduler();
    const finalDb = readDb();
    return NextResponse.json({ result: summary, dbState: finalDb });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Scheduler tick execution failed' }, { status: 500 });
  }
}
