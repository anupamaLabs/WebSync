import { NextResponse } from 'next/server';
import { tickScheduler } from '../../../../lib/scheduler';

export async function POST() {
  try {
    const summary = await tickScheduler();
    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Scheduler tick execution failed' }, { status: 500 });
  }
}
