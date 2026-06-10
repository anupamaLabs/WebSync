export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getPosts, addPost, updatePost, deletePost, getWebsites, addLog, writeDb, readDb } from '../../../lib/db';
import { generateContent } from '../../../lib/ai';
import { scrapeWebsite } from '../../../lib/scraper';

export async function GET() {
  try {
    const posts = getPosts();
    // Return posts sorted newest first
    const sorted = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(sorted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { websiteId, topic, scheduledFor, dbState } = body;

    if (dbState) {
      writeDb(dbState);
    }

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const websites = getWebsites();
    const site = websites.find(w => w.id === websiteId);
    if (!site) {
      return NextResponse.json({ error: 'Associated website not found' }, { status: 404 });
    }

    // Always scrape site and competitors to get the SEO metadata context
    const data = await scrapeWebsite(site.url, site.niche, site.competitors);
    
    let targetTopic = topic;
    if (!targetTopic) {
      // Select first unused topic
      const existingTitles = getPosts()
        .filter(p => p.websiteId === site.id)
        .map(p => p.blogTitle.toLowerCase());

      for (const t of data.suggestedTopics) {
        if (!existingTitles.includes(t.toLowerCase())) {
          targetTopic = t;
          break;
        }
      }
      if (!targetTopic) {
        targetTopic = data.suggestedTopics[0] || 'Modern Industry Trends';
      }
    }

    // Generate content using tone and voice, enhanced with crawled SEO context
    const content = await generateContent(site.name, site.url, targetTopic, site.tone, site.niche, data);

    const targetScheduledFor = scheduledFor || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    const newPost = addPost({
      websiteId: site.id,
      blogTitle: content.blogTitle,
      blogSlug: content.blogSlug,
      blogExcerpt: content.blogExcerpt,
      blogContent: content.blogContent,
      seoKeywords: content.seoKeywords,
      coverImagePrompt: content.coverImagePrompt,
      socialTwitter: content.socialTwitter,
      socialLinkedIn: content.socialLinkedIn,
      socialFacebook: content.socialFacebook,
      status: 'draft',
      scheduledFor: targetScheduledFor,
    });

    addLog('info', `Manually generated post draft: "${newPost.blogTitle}" for website ${site.name}`);
    
    const finalDb = readDb();
    return NextResponse.json({ result: newPost, dbState: finalDb }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate post' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { dbState, ...postData } = body;

    if (dbState) {
      writeDb(dbState);
    }

    const updated = updatePost(id, postData);
    const finalDb = readDb();
    return NextResponse.json({ result: updated, dbState: finalDb });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
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

    deletePost(id);
    const finalDb = readDb();
    return NextResponse.json({ message: 'Post deleted successfully', dbState: finalDb });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete post' }, { status: 500 });
  }
}
