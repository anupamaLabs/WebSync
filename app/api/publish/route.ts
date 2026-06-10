import { NextResponse } from 'next/server';
import { publishPost } from '../../../lib/publisher';
import { writeDb, readDb } from '../../../lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { postId, dbState } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    if (dbState) {
      writeDb(dbState);
    }

    const updatedPost = await publishPost(postId);
    const finalDb = readDb();
    return NextResponse.json({ result: updatedPost, dbState: finalDb });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Publishing failed' }, { status: 500 });
  }
}
