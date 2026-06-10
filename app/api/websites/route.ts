export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getWebsites, addWebsite, updateWebsite, deleteWebsite } from '../../../lib/db';

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
    const { name, url, niche, tone, keywords, competitors, intervalHours, status } = body;
    
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

    return NextResponse.json(newSite, { status: 201 });
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
    const updated = updateWebsite(id, body);
    
    return NextResponse.json(updated);
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

    deleteWebsite(id);
    return NextResponse.json({ message: 'Website deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete website' }, { status: 500 });
  }
}
