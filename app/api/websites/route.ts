export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getWebsites, addWebsite, updateWebsite, deleteWebsite, writeDb, readDb } from '../../../lib/db';

export async function GET() {
  try {
    const websites = getWebsites();
    return NextResponse.json(websites);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch websites' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, niche, tone, keywords, competitors, intervalHours, status, dbState } = body;
    
    if (dbState) {
      writeDb(dbState);
    }

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    const newSite = addWebsite({
      name,
      url,
      niche: niche || 'Technology',
      tone: tone || 'informative',
      keywords: keywords || [],
      competitors: competitors || [],
      intervalHours: Number(intervalHours) || 24,
      status: status || 'active',
    });

    const finalDb = readDb();
    return NextResponse.json({ result: newSite, dbState: finalDb }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add website' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { dbState, ...siteData } = body;

    if (dbState) {
      writeDb(dbState);
    }

    const updated = updateWebsite(id, siteData);
    const finalDb = readDb();
    return NextResponse.json({ result: updated, dbState: finalDb });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update website' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    let dbState = null;
    try {
      const body = await request.json();
      dbState = body?.dbState;
    } catch {
      // Body might be empty, ignore
    }

    if (dbState) {
      writeDb(dbState);
    }

    deleteWebsite(id);
    const finalDb = readDb();
    return NextResponse.json({ message: 'Website deleted successfully', dbState: finalDb });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete website' }, { status: 500 });
  }
}
