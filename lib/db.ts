import fs from 'fs';
import path from 'path';

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined || process.env.NOW_BUILDER !== undefined;
const DB_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

export interface Website {
  id: string;
  name: string;
  url: string;
  niche: string;
  tone: 'professional' | 'witty' | 'casual' | 'informative' | 'hype';
  keywords: string[];
  competitors: string[];
  intervalHours: number;
  lastScannedAt: string | null;
  nextScanAt: string;
  createdAt: string;
  status: 'active' | 'paused';
}

export interface Post {
  id: string;
  websiteId: string;
  blogTitle: string;
  blogSlug: string;
  blogExcerpt: string;
  blogContent: string; // Markdown
  seoKeywords: string[];
  coverImagePrompt: string;
  socialTwitter: string;
  socialLinkedIn: string;
  socialFacebook: string;
  status: 'draft' | 'approved' | 'scheduled' | 'published';
  scheduledFor: string;
  publishedAt: string | null;
  publishedUrls: {
    wordpress?: string;
    twitter?: string;
    linkedin?: string;
    git?: string;
  };
  createdAt: string;
  error: string | null;
}

export interface Settings {
  geminiApiKey: string;
  wordpressUrl: string;
  wordpressUsername: string;
  wordpressPassword: string;
  twitterMock: boolean;
  linkedinMock: boolean;
  wordpressMock: boolean;
  brandVoiceDescription: string;
}

export interface Log {
  id: string;
  timestamp: string;
  type: 'scrape' | 'ai_generation' | 'publish' | 'scheduler' | 'error' | 'info';
  message: string;
  details?: string;
}

export interface DatabaseSchema {
  websites: Website[];
  posts: Post[];
  settings: Settings;
  logs: Log[];
}

const defaultSettings: Settings = {
  geminiApiKey: '',
  wordpressUrl: '',
  wordpressUsername: '',
  wordpressPassword: '',
  twitterMock: true,
  linkedinMock: true,
  wordpressMock: true,
  brandVoiceDescription: 'Helpful, professional tech writer focusing on actionable insights.',
};

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DatabaseSchema = {
      websites: [
        {
          id: 'web-1',
          name: 'TechFlow Solutions',
          url: 'https://techflow-solutions.example.com',
          niche: 'SaaS Productivity & Software Tools',
          tone: 'informative',
          keywords: ['automation', 'productivity', 'remote work', 'collaboration'],
          competitors: [],
          intervalHours: 6,
          lastScannedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          nextScanAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
        },
        {
          id: 'web-2',
          name: 'GreenLife Goods',
          url: 'https://greenlife-goods.example.com',
          niche: 'Eco-friendly and sustainable lifestyle products',
          tone: 'casual',
          keywords: ['zero waste', 'eco-friendly', 'organic', 'sustainability'],
          competitors: [],
          intervalHours: 24,
          lastScannedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          nextScanAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
        }
      ],
      posts: [
        {
          id: 'post-1',
          websiteId: 'web-1',
          blogTitle: '10 Software Tools to Automated Your Small Business Operations in 2026',
          blogSlug: '10-software-tools-automate-small-business-2026',
          blogExcerpt: 'Operational drag can kill a small business. In this guide, we dive into the top 10 automated systems that free up your team for high-value strategic growth.',
          blogContent: `# 10 Software Tools to Automated Your Small Business Operations in 2026\n\nRunning a small business is a marathon. Between client onboarding, project management, invoicing, and support, your calendar gets eaten alive by operations. \n\nFortunately, 2026 brings an incredible wave of **autonomous business agents** and tools designed to streamline these processes. Here are the top tools you should install today:\n\n### 1. WebSync Automation Studio\nManage your content creation pipelines automatically. It links directly to your website inventory and publishes promotional micro-content without lifting a finger.\n\n### 2. ClickUp 4.0\nWith automated project dispatching, ClickUp automatically assigns sub-tasks to relevant specialists based on project briefs.\n\n### Conclusion\nBy automating just three administrative tasks this week, you can reclaim up to 10 hours of strategic planning time. Start small, verify outputs, and scale.`,
          seoKeywords: ['business automation', 'small business tools 2026', 'productivity software'],
          coverImagePrompt: 'A beautiful workspace with a clean laptop displaying operational flowchart graphics, glassmorphism UI overlay, warm office lighting, professional photography, 8k resolution',
          socialTwitter: '🚀 Stop wasting time on administrative drag. Here are 10 software tools that will automate your small business operations in 2026. Read our full guide to reclaim 10+ hours a week: https://techflow-solutions.example.com/blog/10-software-tools-automate-small-business-2026 #BusinessAutomation #Productivity',
          socialLinkedIn: 'Running a small business in 2026 shouldn\'t mean working 80-hour weeks. Operational drag can be mitigated with modern AI-assisted automators. In our latest guide, we cover 10 tools that streamline project dispatching, support tickets, and scheduling.\n\n👉 Read the full article: https://techflow-solutions.example.com/blog/10-software-tools-automate-small-business-2026\n\n#SoftwareDevelopment #SaaSProductivity #BusinessGrowth',
          socialFacebook: 'Operational drag is one of the top reasons small businesses struggle to scale. Check out our list of the top 10 software tools to automate your operations in 2026 and reclaim your free time!',
          status: 'published',
          scheduledFor: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          publishedUrls: {
            wordpress: 'https://techflow-solutions.example.com/blog/10-software-tools-automate-small-business-2026',
            twitter: 'https://twitter.com/techflow/status/19283746283',
            linkedin: 'https://linkedin.com/posts/techflow-solutions_automated-small-business-2026',
          },
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          error: null,
        },
        {
          id: 'post-2',
          websiteId: 'web-2',
          blogTitle: 'Why Plastic-Free Kitchen Essentials are Crucial for a Zero-Waste Transition',
          blogSlug: 'why-plastic-free-kitchen-essentials-zero-waste',
          blogExcerpt: 'Your kitchen is the largest contributor to household plastic waste. Discover simple swaps like beeswax wraps and bamboo brushes that cut carbon footprint and toxins.',
          blogContent: `# Why Plastic-Free Kitchen Essentials are Crucial for a Zero-Waste Transition\n\nThe average household throws away over 200 pounds of single-use plastic every year—and a staggering percentage of it originates in the kitchen. From cling wraps to disposable sponges, the objects we use to prep, pack, and clean are piling up in landfills.\n\nHere are 3 kitchen essentials to transition out of your home:\n\n1. **Cling Wrap -> Beeswax Wraps**: Reusable, washable, and completely biodegradable.\n2. **Plastic Sponges -> Bamboo Scrub Brushes**: Sponges shed microplastics into our waterways. Natural fiber brushes biodegrade completely.\n3. **Plastic Bags -> Silicone or Cotton Bags**: Sturdier, dishwasher-safe, and reusable thousands of times.\n\nSmall changes in your daily routine build a foundation for global environmental impact.`,
          seoKeywords: ['zero waste kitchen', 'plastic free alternatives', 'sustainable living swaps'],
          coverImagePrompt: 'Eco-friendly kitchen products, wooden bamboo dish brushes, beeswax wraps, organic cotton bags, bright natural sunlight, green plants in background, aesthetic home decoration, flatlay photography',
          socialTwitter: 'Sponges shed microplastics every time you wash dishes. 🧽 Swap them for biodegradable bamboo scrub brushes! Discover 3 simple plastic-free kitchen switches here: https://greenlife-goods.example.com/blog/why-plastic-free-kitchen-essentials-zero-waste #ZeroWaste #Sustainability',
          socialLinkedIn: 'Is your kitchen truly sustainable? The average kitchen accounts for the vast majority of household plastic packaging and synthetic microplastics. By introducing natural alternatives like beeswax wraps and bamboo scrubbers, we can drastically decrease our ecological footprint.\n\nRead our breakdown: https://greenlife-goods.example.com/blog/why-plastic-free-kitchen-essentials-zero-waste\n\n#Sustainability #ZeroWaste #GreenLiving',
          socialFacebook: 'Ready to kick plastic out of the kitchen? We\'ve compiled the easiest and most effective swaps you can make today, from beeswax wraps to organic cotton storage bags. Read the guide!',
          status: 'approved',
          scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          publishedAt: null,
          publishedUrls: {},
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          error: null,
        },
        {
          id: 'post-3',
          websiteId: 'web-1',
          blogTitle: 'How to Manage Async Communication in Distributed Engineering Teams',
          blogSlug: 'how-manage-async-communication-distributed-engineering',
          blogExcerpt: 'Real-time chat is ruining engineering productivity. Learn how to design a structured asynchronous documentation culture that lets developers build without interruptions.',
          blogContent: `# How to Manage Async Communication in Distributed Engineering Teams\n\nConstant pings on Slack or Teams create a state of perpetual distraction. Developers need deep, uninterrupted focus time to solve complex issues. \n\n### The Asynchronous Protocol\n1. **Write Detailed Specs**: Before writing code, outline the architectural design in a central doc.\n2. **Replace Status Meetings with Standup Logs**: Write out weekly check-ins rather than scheduling daily sync calls.\n3. **Set Communication SLAs**: Expect replies within 4-6 hours, not 5 minutes.\n\nBy moving away from instant-response expectations, you foster a culture of deep work and technical excellence.`,
          seoKeywords: ['async communication', 'distributed teams engineering', 'developer productivity'],
          coverImagePrompt: 'A conceptual dark-mode graphic representation of developer workspace, calm coding interface on triple monitors, cyber neon blue and purple ambient backlighting, high tech minimalist interior',
          socialTwitter: 'Continuous pings ruin deep focus. If you want high-performing engineering teams, you need to transition to async communication. Read our latest workflow guide: https://techflow-solutions.example.com/blog/how-manage-async-communication-distributed-engineering #RemoteWork #CodingLife #SaaS',
          socialLinkedIn: 'Instant-message fatigue is a major driver of developer burnout. True engineering excellence requires sustained focus. We detail our Asynchronous Protocol in our new blog post:\n\n🔗 https://techflow-solutions.example.com/blog/how-manage-async-communication-distributed-engineering\n\nHow does your team handle async deep work?\n\n#DeveloperProductivity #RemoteWork #Management #AsyncCoding',
          socialFacebook: 'Does your engineering team suffer from Slack fatigue? Learn how to establish a documentation-first asynchronous communication framework.',
          status: 'draft',
          scheduledFor: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
          publishedAt: null,
          publishedUrls: {},
          createdAt: new Date().toISOString(),
          error: null,
        }
      ],
      settings: defaultSettings,
      logs: [
        {
          id: 'log-1',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          type: 'info',
          message: 'WebSync AutoPost initialized.',
        },
        {
          id: 'log-2',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          type: 'scrape',
          message: 'Web scraping successful for TechFlow Solutions. Found new focus topic: "SaaS automation & productivity".',
        },
        {
          id: 'log-3',
          timestamp: new Date(Date.now() - 3.8 * 60 * 60 * 1000).toISOString(),
          type: 'ai_generation',
          message: 'AI successfully generated blog post and social copy for "10 Software Tools to Automated Your Small Business Operations in 2026".',
        },
        {
          id: 'log-4',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          type: 'publish',
          message: 'Successfully published post "10 Software Tools to Automated Your Small Business Operations in 2026" to mock WordPress, X, and LinkedIn.',
        }
      ],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  }
}

export function readDb(): DatabaseSchema {
  ensureDbExists();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error('Failed to read db file, returning empty schema:', error);
    return { websites: [], posts: [], settings: defaultSettings, logs: [] };
  }
}

export function writeDb(data: DatabaseSchema) {
  ensureDbExists();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Helpers for Websites
export function getWebsites(): Website[] {
  const db = readDb();
  return db.websites;
}

export function addWebsite(site: Omit<Website, 'id' | 'createdAt' | 'lastScannedAt' | 'nextScanAt'>): Website {
  const db = readDb();
  const newSite: Website = {
    ...site,
    id: `web-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    lastScannedAt: null,
    nextScanAt: new Date(Date.now() + site.intervalHours * 60 * 60 * 1000).toISOString(),
  };
  db.websites.push(newSite);
  writeDb(db);
  
  addLog('info', `Website connected: ${site.name} (${site.url})`, `Scheduled frequency set to scan every ${site.intervalHours} hours.`);
  return newSite;
}

export function updateWebsite(id: string, updates: Partial<Website>): Website {
  const db = readDb();
  const idx = db.websites.findIndex(w => w.id === id);
  if (idx === -1) throw new Error('Website not found');
  
  const original = db.websites[idx];
  
  // If interval changes, recalculate nextScanAt
  let nextScanAt = original.nextScanAt;
  if (updates.intervalHours !== undefined && updates.intervalHours !== original.intervalHours) {
    const lastScanned = original.lastScannedAt ? new Date(original.lastScannedAt).getTime() : Date.now();
    nextScanAt = new Date(lastScanned + updates.intervalHours * 60 * 60 * 1000).toISOString();
  }

  const updatedSite: Website = {
    ...original,
    ...updates,
    nextScanAt,
  } as Website;

  db.websites[idx] = updatedSite;
  writeDb(db);
  
  addLog('info', `Website configuration updated for: ${updatedSite.name}`);
  return updatedSite;
}

export function deleteWebsite(id: string) {
  const db = readDb();
  const name = db.websites.find(w => w.id === id)?.name || id;
  db.websites = db.websites.filter(w => w.id !== id);
  // Also delete posts associated with this website if they are drafts or scheduled
  db.posts = db.posts.filter(p => !(p.websiteId === id && p.status !== 'published'));
  writeDb(db);
  
  addLog('info', `Website deleted: ${name}`, `All associated pending draft and scheduled posts were removed.`);
}

// Helpers for Posts
export function getPosts(): Post[] {
  const db = readDb();
  return db.posts;
}

export function addPost(post: Omit<Post, 'id' | 'createdAt' | 'publishedAt' | 'publishedUrls' | 'error'>): Post {
  const db = readDb();
  const newPost: Post = {
    ...post,
    id: `post-${Math.random().toString(36).substring(2, 9)}`,
    publishedAt: null,
    publishedUrls: {},
    createdAt: new Date().toISOString(),
    error: null,
  };
  db.posts.push(newPost);
  writeDb(db);
  return newPost;
}

export function updatePost(id: string, updates: Partial<Post>): Post {
  const db = readDb();
  const idx = db.posts.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Post not found');
  
  const updatedPost = {
    ...db.posts[idx],
    ...updates,
  };
  db.posts[idx] = updatedPost;
  writeDb(db);
  return updatedPost;
}

export function deletePost(id: string) {
  const db = readDb();
  db.posts = db.posts.filter(p => p.id !== id);
  writeDb(db);
}

// Helpers for Settings
export function getSettings(): Settings {
  const db = readDb();
  if (process.env.GEMINI_API_KEY) {
    db.settings.geminiApiKey = process.env.GEMINI_API_KEY;
  }
  return db.settings;
}

export function updateSettings(updates: Partial<Settings>): Settings {
  const db = readDb();
  db.settings = {
    ...db.settings,
    ...updates,
  };
  writeDb(db);
  addLog('info', `System settings updated.`);
  return db.settings;
}

// Helpers for Logs
export function getLogs(): Log[] {
  const db = readDb();
  // Return logs sorted newest first
  return [...db.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function addLog(type: Log['type'], message: string, details?: string): Log {
  const db = readDb();
  const newLog: Log = {
    id: `log-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    type,
    message,
    details,
  };
  db.logs.push(newLog);
  // Cap logs to 200 items to avoid bloated db size
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(db.logs.length - 200);
  }
  writeDb(db);
  return newLog;
}
