import { 
  getWebsites, 
  updateWebsite, 
  getPosts, 
  addPost, 
  addLog, 
  Website, 
  Post 
} from './db';
import { scrapeWebsite } from './scraper';
import { generateContent } from './ai';
import { publishPost } from './publisher';

export interface TickResult {
  websitesScanned: string[];
  postsPublished: string[];
  postsGenerated: string[];
  errors: string[];
}

export async function tickScheduler(): Promise<TickResult> {
  const now = new Date();
  const websites = getWebsites();
  const posts = getPosts();
  const result: TickResult = {
    websitesScanned: [],
    postsPublished: [],
    postsGenerated: [],
    errors: []
  };

  addLog('scheduler', 'Scheduler tick cycle initiated.');

  // 1. Scrape Websites due for crawls
  for (const site of websites) {
    if (site.status !== 'active') continue;

    const nextScan = new Date(site.nextScanAt);
    if (nextScan <= now) {
      try {
        addLog('scheduler', `Website "${site.name}" is due for a content sync.`);
        
        // Crawl metadata & gather topics
        const data = await scrapeWebsite(site.url, site.niche, site.competitors);
        
        // Find a topic that has not been written about yet for this site
        const existingTitles = posts
          .filter(p => p.websiteId === site.id)
          .map(p => p.blogTitle.toLowerCase());
          
        let selectedTopic = '';
        for (const topic of data.suggestedTopics) {
          if (!existingTitles.includes(topic.toLowerCase())) {
            selectedTopic = topic;
            break;
          }
        }

        // Fallback: If all suggested topics have been written, create a dynamic title
        if (!selectedTopic) {
          const randTopic = data.suggestedTopics[Math.floor(Math.random() * data.suggestedTopics.length)];
          selectedTopic = `${randTopic} (Deep Dive Updates)`;
        }

        // Generate AI Content
        const content = await generateContent(
          site.name, 
          site.url, 
          selectedTopic, 
          site.tone, 
          site.niche,
          data
        );

        // Schedule time: Default to schedule 4 hours from now
        const scheduledTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

        // Create new Post in DB (Start as 'draft' so user can review/edit/approve)
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
          scheduledFor: scheduledTime,
        });

        // Update Website timings
        const intervalMs = site.intervalHours * 60 * 60 * 1000;
        const nextScanTime = new Date(Date.now() + intervalMs).toISOString();
        
        updateWebsite(site.id, {
          lastScannedAt: now.toISOString(),
          nextScanAt: nextScanTime,
        });

        result.websitesScanned.push(site.name);
        result.postsGenerated.push(newPost.blogTitle);
        addLog('scheduler', `Successfully scanned "${site.name}" and generated draft: "${newPost.blogTitle}". Next scan scheduled for ${nextScanTime}.`);
      } catch (err: any) {
        const msg = `Error executing sync for website "${site.name}": ${err.message || err}`;
        result.errors.push(msg);
        addLog('error', msg);
      }
    }
  }

  // 2. Publish Approved Posts that are due
  const pendingPosts = posts.filter(p => p.status === 'approved' || p.status === 'scheduled');
  
  for (const post of pendingPosts) {
    const publishTime = new Date(post.scheduledFor);
    if (publishTime <= now) {
      try {
        addLog('scheduler', `Approved post "${post.blogTitle}" is due for posting.`);
        await publishPost(post.id);
        result.postsPublished.push(post.blogTitle);
      } catch (err: any) {
        const msg = `Error publishing scheduled post "${post.blogTitle}": ${err.message || err}`;
        result.errors.push(msg);
        addLog('error', msg);
      }
    }
  }

  addLog('scheduler', `Scheduler tick completed. Scanned: ${result.websitesScanned.length}, Generated Drafts: ${result.postsGenerated.length}, Published: ${result.postsPublished.length}.`);

  return result;
}
