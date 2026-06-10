import { NextResponse } from 'next/server';
import { scrapeWebsite } from '../../../../lib/scraper';
import { writeDb } from '../../../../lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, niche, competitors, dbState } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (dbState) {
      writeDb(dbState);
    }

    const scrapedData = await scrapeWebsite(url, niche, competitors);
    return NextResponse.json(scrapedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Scraping execution failed' }, { status: 500 });
  }
}
