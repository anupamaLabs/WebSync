import { addLog, getSettings } from './db';

async function fetchWithRetry(url: string, options: RequestInit, type: 'scrape' | 'ai_generation', retries = 3, initialDelay = 1000): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 200) {
        return res;
      }
      if (res.status === 503 || res.status === 429) {
        const delay = initialDelay * Math.pow(2, i);
        addLog(type, `Gemini API returned transient status ${res.status}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (i === retries - 1) throw err;
      const delay = initialDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error(`Failed after ${retries} retries`);
}

export interface ScrapedData {
  title: string;
  description: string;
  keywords: string[];
  suggestedTopics: string[];
  scrapedContentSnippet: string;
  detectedBrandName?: string;
  detectedNiche?: string;
  detectedKeywords?: string[];
  detectedCompetitors?: string[];
  competitorAnalysis?: Array<{
    url: string;
    title: string;
    description: string;
    keywords: string[];
    scrapedContentSnippet: string;
  }>;
}

// Map keywords/niches to default beautiful mock topics to ensure high-fidelity outputs
const NICHE_TOPICS: Record<string, string[]> = {
  tech: [
    'How serverless architectures scale automatically in 2026',
    'Understanding the difference between Server Components and Client Components in Next.js',
    'Why developer experience (DX) is the highest-leverage investment for engineering teams',
    'Moving from REST to GraphQL: A pragmatic developer\'s guide',
  ],
  eco: [
    'Sourcing organic zero-waste cleaning supplies for your home',
    'The carbon cost of fast shipping: How local sustainable buying helps',
    'How to construct a home composting system in under an hour',
    '5 simple plastic-free switches to make in your laundry room',
  ],
  fashion: [
    'Capsule wardrobes: The ultimate minimalist guide to high-end style',
    'Why organic cotton and linen are taking over summer fashion trends',
    'The lifecycle of a shirt: How circular apparel is reshaping retail',
    'How to style vintage denim with modern luxury accessories',
  ],
  health: [
    'Why morning light sets your circadian rhythm and improves deep sleep',
    'How mindfulness micro-habits boost cognitive capacity during coding sprints',
    'Understanding macros: A clean eating guide for busy remote professionals',
    'The physical benefits of zone 2 training for cardiovascular longevity',
  ],
  marketing: [
    'How to build a high-converting B2B content marketing strategy in 2026',
    'Why demand generation is replacing traditional lead gen for B2B growth',
    '5 simple ways to align your marketing and sales pipelines',
    'The role of clear brand positioning in a crowded digital marketplace',
  ],
  generic: [
    'Creating high-leverage workflows using modern automation tools',
    'Building an authentic brand voice on social media in a crowded market',
    'The evolution of remote collaboration tools and asynchronous team culture',
    'How to design digital products that prioritize accessibility and clean layouts',
  ]
};

export async function scrapeWebsite(url: string, targetNiche?: string, competitorUrls?: string[]): Promise<ScrapedData> {
  addLog('scrape', `Initiating crawler scan for URL: ${url}`);
  
  let html = '';
  let successfullyFetched = false;

  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebSyncAutoPostCrawler/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    clearTimeout(timeoutId);

    if (res.ok) {
      html = await res.text();
      successfullyFetched = true;
      addLog('scrape', `Fetch succeeded for ${url} (Status: ${res.status}). Parsing HTML metadata...`);
    } else {
      addLog('scrape', `Fetch returned status code ${res.status} for ${url}. Triggering fallback scraper.`);
    }
  } catch (error: any) {
    addLog('scrape', `Fetch failed for ${url} (${error.message || error}). Loading fallback metadata resolver.`);
  }

  // Define parsed fields
  let title = '';
  let description = '';
  const keywords: string[] = [];
  let scrapedContentSnippet = '';

  if (successfullyFetched && html) {
    // 1. Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    // 2. Extract meta description
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || 
                      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }

    // 3. Extract keywords
    const kwMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']keywords["']/i);
    if (kwMatch && kwMatch[1]) {
      kwMatch[1].split(',').forEach(k => {
        const cleanK = k.trim();
        if (cleanK) keywords.push(cleanK);
      });
    }

    // 4. Get some text context from body (H1s, H2s)
    const bodyMatches = Array.from(html.matchAll(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi));
    const headings = bodyMatches
      .map(m => m[1].replace(/<[^>]*>/g, '').trim())
      .filter(h => h.length > 5 && h.length < 100)
      .slice(0, 5);

    if (headings.length > 0) {
      scrapedContentSnippet = `Found headings: ${headings.join(' | ')}`;
    } else {
      // Get first 200 characters from first paragraph
      const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pMatch && pMatch[1]) {
        scrapedContentSnippet = pMatch[1].replace(/<[^>]*>/g, '').trim().substring(0, 200) + '...';
      }
    }
  }

  // Fallbacks if data is missing
  const urlLower = url.toLowerCase();
  const domainName = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0].split('.')[0];
  const capitalizedDomain = domainName.charAt(0).toUpperCase() + domainName.slice(1);

  if (!title) {
    title = `${capitalizedDomain} | Official Website`;
  }

  // Crawl Competitor URLs
  const competitorAnalysis: Array<{
    url: string;
    title: string;
    description: string;
    keywords: string[];
    scrapedContentSnippet: string;
  }> = [];

  if (competitorUrls && competitorUrls.length > 0) {
    addLog('scrape', `Crawl queue: scanning ${competitorUrls.length} competitor sites...`);
    for (const compUrl of competitorUrls) {
      if (!compUrl.trim()) continue;
      try {
        const cleanCompUrl = compUrl.trim().startsWith('http') ? compUrl.trim() : `https://${compUrl.trim()}`;
        addLog('scrape', `Crawl competitor website: ${cleanCompUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        const res = await fetch(cleanCompUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebSyncAutoPostCrawler/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          }
        });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const compHtml = await res.text();
          let compTitle = '';
          let compDesc = '';
          const compKeywords: string[] = [];
          let compSnippet = '';
          
          // Title
          const titleMatch = compHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) compTitle = titleMatch[1].trim();
          
          // Desc
          const descMatch = compHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || 
                            compHtml.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
          if (descMatch && descMatch[1]) compDesc = descMatch[1].trim();
          
          // Keywords
          const kwMatch = compHtml.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']*)["']/i) ||
                          compHtml.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']keywords["']/i);
          if (kwMatch && kwMatch[1]) {
            kwMatch[1].split(',').forEach(k => {
              const cleanK = k.trim();
              if (cleanK) compKeywords.push(cleanK);
            });
          }
          
          // Headings
          const bodyMatches = Array.from(compHtml.matchAll(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi));
          const headings = bodyMatches
            .map(m => m[1].replace(/<[^>]*>/g, '').trim())
            .filter(h => h.length > 5 && h.length < 100)
            .slice(0, 5);
          if (headings.length > 0) compSnippet = `Headings: ${headings.join(' | ')}`;
          
          competitorAnalysis.push({
            url: compUrl,
            title: compTitle || `${compUrl} | Competitor`,
            description: compDesc,
            keywords: compKeywords,
            scrapedContentSnippet: compSnippet || 'No headings or paragraphs scraped.'
          });
          addLog('scrape', `Competitor scan success for ${compUrl}.`);
        } else {
          addLog('scrape', `Competitor scan returned status code ${res.status} for ${compUrl}.`);
        }
      } catch (err: any) {
        addLog('scrape', `Competitor scan failed for ${compUrl} (${err.message || err}).`);
      }
    }
  }

  // 1. Establish defaults in case AI is not configured or fails
  let detectedBrandName = title.split(/[|:-]/)[0].trim() || capitalizedDomain;
  let detectedNiche = targetNiche || '';

  // Heuristic Niche Detection
  if (!detectedNiche) {
    const nicheSearch = (urlLower + ' ' + title.toLowerCase() + ' ' + description.toLowerCase()).toLowerCase();
    if (nicheSearch.includes('tech') || nicheSearch.includes('software') || nicheSearch.includes('saas') || nicheSearch.includes('code') || nicheSearch.includes('dev') || nicheSearch.includes('cyber') || nicheSearch.includes('security') || nicheSearch.includes('cloud') || nicheSearch.includes('system') || nicheSearch.includes('api')) {
      detectedNiche = 'tech';
    } else if (nicheSearch.includes('eco') || nicheSearch.includes('green') || nicheSearch.includes('sustain') || nicheSearch.includes('organic') || nicheSearch.includes('nature') || nicheSearch.includes('earth') || nicheSearch.includes('waste')) {
      detectedNiche = 'eco';
    } else if (nicheSearch.includes('fashion') || nicheSearch.includes('style') || nicheSearch.includes('clothes') || nicheSearch.includes('wear') || nicheSearch.includes('retail') || nicheSearch.includes('apparel')) {
      detectedNiche = 'fashion';
    } else if (nicheSearch.includes('health') || nicheSearch.includes('fit') || nicheSearch.includes('wellness') || nicheSearch.includes('sleep') || nicheSearch.includes('diet') || nicheSearch.includes('food') || nicheSearch.includes('cleaning')) {
      detectedNiche = 'health';
    } else if (nicheSearch.includes('market') || nicheSearch.includes('agency') || nicheSearch.includes('adver') || nicheSearch.includes('sales') || nicheSearch.includes('seo') || nicheSearch.includes('lead gen') || nicheSearch.includes('business')) {
      detectedNiche = 'marketing';
    } else {
      detectedNiche = 'generic';
    }
  }

  // Heuristic description fallback
  if (!description) {
    if (detectedNiche === 'tech') {
      description = `Advanced software development tools and automated technology systems at ${capitalizedDomain}.`;
    } else if (detectedNiche === 'eco') {
      description = `Eco-friendly lifestyle swaps, zero-waste packaging, and organic goods by ${capitalizedDomain}.`;
    } else if (detectedNiche === 'fashion') {
      description = `Curated contemporary style catalogs, minimalist sustainable linen clothing, and luxury essentials.`;
    } else if (detectedNiche === 'health') {
      description = `Daily clean eating recipes, biological sleep optimization hacks, and health routines.`;
    } else if (detectedNiche === 'marketing') {
      description = `Professional marketing services, B2B demand generation strategies, and brand positioning by ${capitalizedDomain}.`;
    } else {
      description = `Official blog content, news, and updates for ${capitalizedDomain}.`;
    }
  }

  // Heuristic Keywords fallback
  let detectedKeywords = [...keywords];
  if (detectedKeywords.length === 0) {
    if (detectedNiche === 'tech') detectedKeywords = ['automation', 'saas', 'productivity', domainName];
    else if (detectedNiche === 'eco') detectedKeywords = ['zero-waste', 'sustainable', 'organic', domainName];
    else if (detectedNiche === 'fashion') detectedKeywords = ['capsule wardrobe', 'style', 'fashion', domainName];
    else if (detectedNiche === 'health') detectedKeywords = ['wellness', 'longevity', 'health', domainName];
    else if (detectedNiche === 'marketing') detectedKeywords = ['b2b marketing', 'lead generation', 'brand strategy', domainName];
    else detectedKeywords = ['blog', 'updates', 'articles', domainName];
  }

  // Heuristic Competitors fallback
  let detectedCompetitors = competitorUrls && competitorUrls.length > 0 ? competitorUrls : [];
  if (detectedCompetitors.length === 0) {
    if (detectedNiche === 'tech') detectedCompetitors = ['techcrunch.com', 'wired.com'];
    else if (detectedNiche === 'eco') detectedCompetitors = ['treehugger.com', 'greenmatters.com'];
    else if (detectedNiche === 'fashion') detectedCompetitors = ['vogue.com', 'refiner29.com'];
    else if (detectedNiche === 'health') detectedCompetitors = ['healthline.com', 'webmd.com'];
    else if (detectedNiche === 'marketing') detectedCompetitors = ['hubspot.com', 'marketo.com'];
    else detectedCompetitors = ['medium.com', 'blogger.com'];
  }


  // Heuristic suggested topics fallback: dynamic and customized to keywords
  const firstKw = detectedKeywords[0] || domainName;
  const secondKw = detectedKeywords[1] || 'industry trends';
  const capFirst = firstKw.charAt(0).toUpperCase() + firstKw.slice(1);
  const capSecond = secondKw.charAt(0).toUpperCase() + secondKw.slice(1);
  let suggestedTopics = [
    `The Future of ${capFirst} in 2026: Key Developments`,
    `5 Simple Ways to Optimize Your ${capSecond} Strategy`,
    `Why ${capFirst} is Crucial for Modern Scalability`,
    `A Complete Beginner's Guide to ${capSecond}`
  ];

  if (!scrapedContentSnippet) {
    scrapedContentSnippet = `Successfully cataloged website index for ${capitalizedDomain} focusing on the ${detectedNiche} sector.`;
  }

  // If Gemini API key is present, use it to perform comprehensive auto-detection of brand settings
  const settings = getSettings();
  const apiKey = settings.geminiApiKey;
  if (apiKey) {
    try {
      addLog('scrape', `Gemini API Key detected. Performing dynamic brand, keyword, competitor and content gap analysis...`);
      
      let analysisPrompt = `You are a professional SEO Specialist and Brand Strategist.
Analyze the target website based on its homepage metadata:

Website URL: ${url}
Title: "${title}"
Description: "${description}"
Page headings/content snippet: "${scrapedContentSnippet}"

Already configured competitors (if any): ${JSON.stringify(competitorUrls)}
Competitor crawled details (if any):
${competitorAnalysis.map((c, idx) => `
Competitor #${idx+1}: ${c.url}
- Title: "${c.title}"
- Description: "${c.description}"
- Keywords: ${JSON.stringify(c.keywords)}
- Snippet: "${c.scrapedContentSnippet}"
`).join('\n')}

Based on this target website and its niche, please generate:
1. brandName: A clean, human-friendly brand name.
2. niche: A clean description of the website's industry niche (e.g. "NGO Education, Ecology, Sustainable Livelihood", "SaaS Productivity & Software Tools", "Eco-friendly Home Goods").
3. keywords: An array of 3-5 relevant focus keywords for SEO.
4. competitors: An array of 2-3 main competitor domain URLs (e.g. "competitor.com"). If competitors were already configured above, keep them or suggest additional ones.
5. suggestedTopics: An array of exactly 4 specific, engaging blog post topics. If competitors are present, identify content gaps and generate topics targeting those gaps.

Output a JSON object exactly matching this structure:
{
  "brandName": "detected brand name",
  "niche": "niche category description",
  "keywords": ["kw1", "kw2", "kw3"],
  "competitors": ["comp1.com", "comp2.com"],
  "suggestedTopics": ["topic1", "topic2", "topic3", "topic4"]
}

Do not include markdown styling or backticks. Return the raw JSON string only.`;

      const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          }
        }),
      }, 'scrape');

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text.trim());
          if (parsed) {
            if (parsed.brandName) detectedBrandName = String(parsed.brandName);
            if (parsed.niche) detectedNiche = String(parsed.niche);
            if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
              detectedKeywords = parsed.keywords.map((k: any) => String(k));
            }
            if (Array.isArray(parsed.competitors) && parsed.competitors.length > 0) {
              detectedCompetitors = parsed.competitors.map((c: any) => String(c));
            }
            if (Array.isArray(parsed.suggestedTopics) && parsed.suggestedTopics.length > 0) {
              suggestedTopics = parsed.suggestedTopics.map((t: any) => String(t));
            }
            addLog('scrape', `Gemini successfully auto-detected brand name, niche, keywords, competitors, and SEO topics.`);
          }
        }
      } else {
        addLog('scrape', `Gemini analysis request failed with status: ${res.status}. Using fallback heuristics.`);
      }
    } catch (err: any) {
      addLog('scrape', `Failed to run Gemini analysis: ${err.message || err}. Using fallback heuristics.`);
    }
  }

  addLog('scrape', `Crawl complete for ${url}. Resolved title: "${title}". Generated ${suggestedTopics.length} potential content vectors.`);

  return {
    title,
    description,
    keywords: detectedKeywords,
    suggestedTopics,
    scrapedContentSnippet,
    competitorAnalysis,
    detectedBrandName,
    detectedNiche,
    detectedKeywords,
    detectedCompetitors,
  };
}
