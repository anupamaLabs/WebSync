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

import { ScrapedData } from './scraper';

export interface GeneratedContent {
  blogTitle: string;
  blogSlug: string;
  blogExcerpt: string;
  blogContent: string; // Markdown
  seoKeywords: string[];
  coverImagePrompt: string;
  socialTwitter: string;
  socialLinkedIn: string;
  socialFacebook: string;
}

const FALLBACK_POSTS: Record<string, Array<Omit<GeneratedContent, 'seoKeywords'>>> = {
  tech: [
    {
      blogTitle: 'Unlocking Developer Flow: The Cost of Context Switching',
      blogSlug: 'cost-context-switching-developer-flow',
      blogExcerpt: 'It takes an average of 23 minutes for a developer to refocus after a single notification. Here is how context switching is slowing down your engineering sprints.',
      blogContent: `# Unlocking Developer Flow: The Cost of Context Switching\n\nEvery time a developer is interrupted by a Slack ping, an unscheduled status sync, or an email, their flow state is shattered. Studies show it takes an average of **23 minutes and 15 seconds** to return to the original task after an interruption.\n\n### Why Context Switching is Expensive\n1. **Cognitive Load**: Codebases are highly complex structures that developers hold in their working memory. A single distraction clears that memory stack.\n2. **Fatigue**: Rebuilding mental models repeatedly throughout the day causes cognitive fatigue, leading to bugs and sub-optimal solutions.\n3. **Loss of Momentum**: Sprints drag on not because of bad code, but because developers are constantly yanked out of their focus zones.\n\n### How to Protect Flow State\n- **Establish Asynchronous Core Hours**: Restrict meetings to specific blocks (e.g., 2:00 PM to 4:00 PM).\n- **Implement Status Logs**: Replace daily standups with automated written status updates.\n- **Turn off Notifications**: Encorage devs to close chat applications for 90-minute deep-work blocks.\n\nFostering deep focus is the single highest-leverage operational improvement you can make for your tech company.`,
      coverImagePrompt: 'Abstract representation of human brain mapping connections, neon blue and violet neural networks, dark glowing background, modern minimal vector design, 3D render',
      socialTwitter: '🧠 Context switching is killing your engineering sprints. A single notification takes 23+ minutes to recover from! Learn how to establish a deep focus environment for your team: https://example.com/blog/cost-context-switching-developer-flow #DeveloperExperience #SaaS #Productivity',
      socialLinkedIn: 'Is your team\'s productivity suffering from chat fatigue? Research indicates that context switching costs developers upwards of 2 hours daily in lost momentum. \n\nProtecting engineering flow requires structured communication protocols, like async logs and notification-free deep work blocks.\n\nRead our operational breakdown here: https://example.com/blog/cost-context-switching-developer-flow\n\n#SoftwareEngineering #Management #DeveloperFlow #ProductivityTools',
      socialFacebook: 'Every Slack ping costs your developers 23 minutes of focus. Discover how context switching slows down engineering sprints and how to build a deep work culture.',
    },
    {
      blogTitle: 'Why Next.js App Router is the Future of Full-Stack React',
      blogSlug: 'why-nextjs-app-router-future-full-stack',
      blogExcerpt: 'Next.js App Router represents a paradigm shift. Learn how Server Components, streaming, and nested layouts optimize loading states and payload sizes.',
      blogContent: `# Why Next.js App Router is the Future of Full-Stack React\n\nReact applications have historically been heavy client-side bundles. Next.js App Router flips the script, using **React Server Components (RSC)** to render UI on the server by default. This change reduces client bundle sizes, improves SEO, and simplifies data fetching.\n\n### The Key Pillars of Next.js App Router\n\n1. **Server Components by Default**\nOnly components that require interactivity (using state or hooks) are sent to the client as JS. Static layout shells run purely on the server.\n\n2. **Nested Layouts & Streaming**\nNext.js lets you stream parts of the page as they load. Instead of waiting for a slow API call to load the entire page, users see the layout shell instantly while content streams in.\n\n3. **Colocated Data Fetching**\nFetch data directly inside your async server components. No more complex Redux pipelines or ` + "`" + `getServerSideProps` + "`" + ` setups.\n\nEmbracing React Server Components will improve your site load times and code maintainability.`,
      coverImagePrompt: 'Next.js geometric branding patterns, dark carbon fiber textures, bright white and gray accents, sleek developer dashboard aesthetic, glowing neon lights, 4k graphic design',
      socialTwitter: '⚡ Next.js App Router is changing the web. Smaller JS bundles, faster loading states, and direct server rendering. Learn why your team should migrate today: https://example.com/blog/why-nextjs-app-router-future-full-stack #ReactJS #NextJS #WebDev',
      socialLinkedIn: 'React Server Components are transforming client performance. In Next.js, pages load instantly by streaming data chunks and only downloading JavaScript for interactive elements.\n\nWe explain the core concepts of nested layouts, server rendering, and data colocation in our latest technical post.\n\n🔗 https://example.com/blog/why-nextjs-app-router-future-full-stack\n\n#WebPerformance #NextJS #ReactCanary #FrontEndCoding',
      socialFacebook: 'Smaller bundles, faster loads. Discover how the Next.js App Router uses Server Components to optimize web experiences for search engines and users alike.',
    }
  ],
  eco: [
    {
      blogTitle: '5 Simple Steps to Create a Zero-Waste Laundry Routine',
      blogSlug: '5-steps-zero-waste-laundry-routine',
      blogExcerpt: 'Plastic jugs, synthetic microfibers, and chemical dyes—our laundry rooms are hidden pollution hotspots. Swap to a clean, eco-friendly washing routine today.',
      blogContent: `# 5 Simple Steps to Create a Zero-Waste Laundry Routine\n\nTraditional laundry routines are heavily reliant on single-use plastics and petroleum-derived detergents. Fortunately, transitioning to an eco-friendly laundry system is straightforward and saves money.\n\n### 1. Ditch the Plastic Jugs\nLiquid detergent is up to 90% water, packed in thick plastic jugs. Switch to concentrated detergent sheets or powder in cardboard boxes.\n\n### 2. Swap Dryer Sheets for Wool Dryer Balls\nSingle-use dryer sheets contain synthetic fragrances and are discarded after one cycle. Reusable wool dryer balls soften clothes, reduce static, and cut drying time by 25%.\n\n### 3. Capture Microplastics\nEvery time we wash synthetic fabrics like polyester and nylon, they shed microplastics. Use a mesh washing bag designed to capture these microfibers before they enter our water supply.\n\n### 4. Wash in Cold Water\nUp to 90% of the energy consumed by a washing machine goes toward heating the water. Cold water cycles clean just as effectively while saving electricity.\n\n### 5. Hang Dry When Possible\nAir drying clothes extends fabric longevity and uses zero carbon. Setup a simple drying rack in a sunlit room.\n\nGreen living starts with small, daily habits. Start with one swap this weekend!`,
      coverImagePrompt: 'Cozy laundry room setup, sun streaming through window, organic cotton baskets, wooden drying rack, woolen white dryer balls in a glass jar, warm clean eco aesthetic',
      socialTwitter: '🌱 Traditional detergent jugs are 90% water! Switch to laundry sheets and Wool Dryer Balls to cut waste and energy costs. Read our 5-step guide to eco-friendly laundry: https://example.com/blog/5-steps-zero-waste-laundry-routine #ZeroWaste #EcoFriendly #Sustainability',
      socialLinkedIn: 'Is your household routine polluting our waterways? Every wash cycle with synthetic clothing sheds microplastics. By introducing micro-filter bags and washing in cold water, we can make a massive dent in household pollution.\n\nOur full eco-laundry guide details these zero-waste solutions:\n\n👉 https://example.com/blog/5-steps-zero-waste-laundry-routine\n\n#Sustainability #GreenTech #EcoFriendlyLiving #ZeroWaste',
      socialFacebook: 'Ready to green your laundry room? Discover 5 simple swaps—from cardboard laundry sheets to wool dryer balls—that reduce waste and save electricity.',
    }
  ],
  fashion: [
    {
      blogTitle: 'How to Build a Capsule Wardrobe for Sustainable Style',
      blogSlug: 'how-build-capsule-wardrobe-sustainable-style',
      blogExcerpt: 'Tired of having a closet full of clothes and nothing to wear? Learn how to curate a 30-piece capsule wardrobe that guarantees high-end, sustainable outfits.',
      blogContent: `# How to Build a Capsule Wardrobe for Sustainable Style\n\nA capsule wardrobe is a curated collection of high-quality, versatile items that can be mixed and matched to create dozens of outfits. By buying fewer but better garments, you bypass the fast-fashion cycle and invest in personal style that lasts.\n\n### The Capsule Core Elements\n- **Neutral Bases**: High-quality organic cotton t-shirts (black, white, heather grey).\n- **Tailored Layers**: A versatile trench coat, structured blazer, or linen utility jacket.\n- **Premium Denim**: Well-fitted jeans in dark indigo or classic blue.\n- **Footwear**: Minimalist white sneakers and a sleek pair of chelsea boots.\n\n### Benefits of a Capsule Wardrobe\n1. **Zero Decision Fatigue**: Getting dressed in the morning takes 30 seconds because everything pairs harmoniously.\n2. **Quality Over Quantity**: Investing in linen, wool, and organic cotton ensures garments hold their shape for years.\n3. **Lower Carbon Footprint**: Less waste means fewer clothes in landfill and cleaner textile manufacturing.\n\nSimplify your closet, elevate your personal style, and support the sustainable fashion movement.`,
      coverImagePrompt: 'Minimalist wooden wardrobe rack, boutique hangers, beige linen clothing, organic cotton shirts, high-end clean aesthetic, soft neutral warm lighting, architectural digest interior design, 8k',
      socialTwitter: '👔 Elevate your style and reduce decision fatigue with a 30-piece capsule wardrobe. Skip fast fashion and invest in organic linen/cotton essentials. Read our styling template: https://example.com/blog/how-build-capsule-wardrobe-sustainable-style #CapsuleWardrobe #SustainableFashion #StyleTips',
      socialLinkedIn: 'Fast fashion is responsible for massive textile waste and carbon emissions. Moving toward a "Capsule Wardrobe" focuses on high-quality, circular garments that can be combined interchangeably.\n\nHere is how we curate premium wardrobe bases to save time, money, and resources:\n\n🔗 https://example.com/blog/how-build-capsule-wardrobe-sustainable-style\n\n#SustainableDesign #RetailTrends #MinimalistLiving #CapsuleWardrobe',
      socialFacebook: 'Stop staring at a full closet with nothing to wear. Learn how to curate a minimalist capsule wardrobe with high-quality, sustainable fabrics.',
    }
  ],
  health: [
    {
      blogTitle: 'Science-Backed Habits to Optimize Deep Sleep for Brain Health',
      blogSlug: 'science-backed-habits-optimize-deep-sleep-brain',
      blogExcerpt: 'Deep sleep is when your brain flushes out toxins and consolidates memory. Explore 4 habits that enhance sleep architecture and boost daily cognitive bandwidth.',
      blogContent: `# Science-Backed Habits to Optimize Deep Sleep for Brain Health\n\nSleep is not passive downtime. It is an active biological process where your brain\'s glymphatic system washes away toxic wastes and consolidates information. Optimizing your **sleep architecture**—specifically deep sleep and REM—is critical for daytime mental performance.\n\n### 4 Habits for Optimal Sleep\n\n1. **View Sunlight in the Morning**\nGet 10-15 minutes of outdoor sunlight within an hour of waking. This triggers your cortisol peak and anchors your melatonin cycle for the night.\n\n2. **Avoid Blue Light 2 Hours Before Bed**\nScreens mimic daylight, suppressing melatonin secretion. Dim house lights and swap your phone for a paperback book.\n\n3. **Keep Your Bedroom Cool**\nYour core temperature needs to drop 2-3 degrees Fahrenheit to initiate deep sleep. Set your thermostat to 65–68°F (18–20°C).\n\n4. **No Caffeine 10 Hours Prior to Sleeping**\nCaffeine block adenosine receptors, preventing the build-up of sleep pressure. Give your liver time to clear it from your bloodstream.\n\nPrioritizing sleep is the ultimate biohack for productivity and cognitive performance.`,
      coverImagePrompt: 'Serene bedroom interior, dim warm lighting, cozy bed with linen sheets, plants on nightstand, soft dark shadows, tranquil peaceful mood, photographic style',
      socialTwitter: '💤 Sleep is the ultimate cognitive optimizer. Morning light, cooler rooms, and caffeine boundaries are simple adjustments with huge payoffs. Read our science-backed sleep guide: https://example.com/blog/science-backed-habits-optimize-deep-sleep-brain #Biohacking #SleepTips #HealthScience',
      socialLinkedIn: 'Cognitive bandwidth is determined by sleep quality. During deep sleep, the brain actively flushes metabolic waste. By adjusting light exposure and room temperature, you can optimize your sleep cycles for peak mental performance.\n\nRead the research and implementation tips:\n\n🔗 https://example.com/blog/science-backed-habits-optimize-deep-sleep-brain\n\n#BrainPerformance #HealthAndWellness #Biohacking #ProductivitySecrets',
      socialFacebook: 'Unlock your brain\'s full potential. Discover the science behind deep sleep optimization and how morning sun, cool temperatures, and caffeine limits can transform your mornings.',
    }
  ],
  generic: [
    {
      blogTitle: 'Maximizing Flow: A Beginner\'s Guide to Work Automation',
      blogSlug: 'maximizing-flow-guide-work-automation',
      blogExcerpt: 'Automation isn\'t about replacing humans—it is about freeing them up for high-level creative work. Learn how to audit your tasks and automate the boring stuff.',
      blogContent: `# Maximizing Flow: A Beginner\'s Guide to Work Automation\n\nMost of our workdays are spent on repetitive tasks: copying data, sending follow-up emails, scheduling appointments, and updating spreadsheets. Automation tools allow us to delegate these mundane actions so we can focus on strategic tasks.\n\n### The Task Audit Framework\nTo begin automating your work, list your daily tasks and look for three attributes:\n- **Repetitive**: Does it happen on a schedule or trigger?\n- **Rule-based**: Does it follow a clear "If X, then Y" logical flow?\n- **Low-cognition**: Does it require creative problem solving?\n\nIf a task matches all three, it is a prime candidate for automation.\n\n### Automation Tools to Start With\n1. **Zapier / Make**: Bridge data between web apps without coding.\n2. **AI Content Pipelines**: Automatically drafts copy from web feeds.\n3. **Calendar Schedulers**: Replaces email back-and-forth for booking meetings.\n\nDelegating administrative tasks allows you to direct your energy toward innovation and business growth.`,
      coverImagePrompt: 'Clean office workdesk, abstract holographic nodes connected in air above table, glowing flowcharts, high-tech professional productivity theme',
      socialTwitter: '⚙️ Stop wasting hours on repetitive administrative work. Audit your tasks, find the rule-based bottlenecks, and automate them! Read our beginner\'s guide: https://example.com/blog/maximizing-flow-guide-work-automation #Productivity #Automation #Workflows',
      socialLinkedIn: 'Automation isn\'t just for large software systems. Individual professionals can audit their calendars to delegate low-cognitive tasks like scheduling, file conversions, and draft writes.\n\nRead our guide on building high-leverage workflows:\n\n👉 https://example.com/blog/maximizing-flow-guide-work-automation\n\n#WorkplaceInnovation #AutomationTools #ProductivityHacks #CareerGrowth',
      socialFacebook: 'Reclaim your workday. Learn how to audit your daily tasks and automate repetitive administrative chores so you can focus on creative, high-value projects.',
    }
  ],
  marketing: [
    {
      blogTitle: 'Moving from Lead Generation to Demand Generation: The B2B Shift',
      blogSlug: 'lead-generation-to-demand-generation-b2b-shift',
      blogExcerpt: 'In 2026, capturing leads is no longer enough. Learn why building real demand and brand affinity is the key to sustainable B2B revenue growth.',
      blogContent: `# Moving from Lead Generation to Demand Generation: The B2B Shift\n\nFor years, B2B marketing was simple: gate some content, collect email addresses, and pass those "leads" to sales. But buyers have changed. They don't want to be hounded by sales reps just for downloading an ebook. Today, the winners are building brand trust and generating demand first.\n\n### The Difference Between Lead Gen and Demand Gen\n1. **Lead Generation**: Focuses on capturing contact info (MQLs) via gated forms. Often leads to cold calls and low conversion rates.\n2. **Demand Generation**: Focuses on educating the market and building intent. Buyers reach out to you when they are ready to buy.\n\n### How to Build a Demand Gen Engine\n- **Ungate Your Content**: Make your insights free and easy to share.\n- **Focus on Brand Authority**: Create high-quality, opinionated content that solves real buyer problems.\n- **Measure Pipeline, Not Clicks**: Optimize your marketing campaigns for qualified opportunities and revenue, not just form submissions.\n\nShifting from capturing contact details to creating genuine demand is the most sustainable way to scale your B2B sales pipeline.`,
      coverImagePrompt: 'Sleek modern business boardroom, abstract upward-trending light charts on a glass wall, elegant design, warm amber lighting, 3D render style',
      socialTwitter: '📈 The era of gated PDF leads is over. Modern B2B buyers want value first. Learn how shifting to a Demand Generation model can grow your pipeline: https://example.com/blog/lead-generation-to-demand-generation-b2b-shift #B2BMarketing #GrowthStrategy',
      socialLinkedIn: 'Is your marketing team still measuring success by the number of ebook downloads?\n\nMQLs are often a vanity metric. True demand generation focuses on educating your market so high-intent buyers reach out to your sales team directly.\n\nHere is how to structure your shift to demand gen:\n\n🔗 https://example.com/blog/lead-generation-to-demand-generation-b2b-shift\n\n#DemandGeneration #B2BMarketing #RevenueGrowth #SalesStrategy',
      socialFacebook: 'Form fills aren\'t revenue. Discover why top B2B companies are switching from lead generation to demand generation, and how to start building brand trust today.'
    }
  ]
};

export async function generateContent(
  websiteName: string,
  websiteUrl: string,
  topic: string,
  tone: string,
  niche: string,
  scrapedData?: ScrapedData
): Promise<GeneratedContent> {
  const settings = getSettings();
  const apiKey = settings.geminiApiKey;

  addLog('ai_generation', `Generating copy for: "${topic}" using tone "${tone}" (Niche: ${niche})...`);

  // Detect niche key for fallback
  let nicheKey = 'generic';
  const nicheLower = niche.toLowerCase() + ' ' + topic.toLowerCase();
  if (nicheLower.includes('tech') || nicheLower.includes('software') || nicheLower.includes('saas') || nicheLower.includes('code') || nicheLower.includes('dev')) {
    nicheKey = 'tech';
  } else if (nicheLower.includes('eco') || nicheLower.includes('green') || nicheLower.includes('sustain') || nicheLower.includes('organic') || nicheLower.includes('nature') || nicheLower.includes('waste')) {
    nicheKey = 'eco';
  } else if (nicheLower.includes('fashion') || nicheLower.includes('style') || nicheLower.includes('clothes') || nicheLower.includes('wear') || nicheLower.includes('retail')) {
    nicheKey = 'fashion';
  } else if (nicheLower.includes('health') || nicheLower.includes('fit') || nicheLower.includes('wellness') || nicheLower.includes('sleep') || nicheLower.includes('diet')) {
    nicheKey = 'health';
  } else if (nicheLower.includes('market') || nicheLower.includes('agency') || nicheLower.includes('adver') || nicheLower.includes('sales') || nicheLower.includes('seo') || nicheLower.includes('lead gen') || nicheLower.includes('business')) {
    nicheKey = 'marketing';
  }

  // Fallback posts list
  const fallbackList = FALLBACK_POSTS[nicheKey] || FALLBACK_POSTS.generic;

  // Format scraped SEO / competitor context if available
  let seoContextPromptSnippet = '';
  if (scrapedData) {
    seoContextPromptSnippet = `
Target Site SEO context:
- Title: "${scrapedData.title}"
- Description: "${scrapedData.description}"
- Keywords: ${JSON.stringify(scrapedData.keywords)}
- Existing Page Snippet: "${scrapedData.scrapedContentSnippet}"
`;

    if (scrapedData.competitorAnalysis && scrapedData.competitorAnalysis.length > 0) {
      seoContextPromptSnippet += `
Competitors SEO context to analyze:
${scrapedData.competitorAnalysis.map((c, idx) => `
Competitor #${idx+1}: ${c.url}
- Title: "${c.title}"
- Description: "${c.description}"
- Keywords: ${JSON.stringify(c.keywords)}
- Existing Snippet: "${c.scrapedContentSnippet}"
`).join('\n')}

INSTRUCTION: Please optimize the blog content specifically to address the content gaps between the target site and these competitors. Utilize relevant competitor keywords and differentiate from their topics in a professional, high-authority manner.
`;
    }
  }

  if (apiKey) {
    try {
      addLog('ai_generation', `Gemini API key detected. Connecting to API for generation...`);
      
      const prompt = `You are a professional, premium content writer.
Target Website: "${websiteName}" (${websiteUrl})
Niche: "${niche}"
Topic: "${topic}"
Tone of Voice: "${tone}"
Brand Voice Description: "${settings.brandVoiceDescription}"
${seoContextPromptSnippet}

Please write content for this website. You must output a JSON object EXACTLY matching this structure:
{
  "blogTitle": "Optimized title of the blog post",
  "blogSlug": "url-friendly-slug",
  "blogExcerpt": "A compelling 2-sentence summary/excerpt of the post",
  "blogContent": "A detailed, high-quality blog post formatted in Markdown (300-500 words). Include headings, bold text, bullet points or numbers, and a clear conclusion.",
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "coverImagePrompt": "A highly descriptive, high-quality prompt for generating a cover image using Midjourney/DALL-E matching the blog's topic. Focus on aesthetics, lighting, composition.",
  "socialTwitter": "Engaging Twitter post under 250 characters, including emojis, a hook, relevant hashtags, and a mockup URL to the blog (e.g. ${websiteUrl}/blog/blogSlug).",
  "socialLinkedIn": "A structured, highly engaging LinkedIn post with spaces, emojis, bullet points, a mockup link, and a question at the end to invite discussion.",
  "socialFacebook": "A friendly, conversational Facebook post outlining the key benefits and linking to the post."
}

Do not include markdown code blocks surrounding the JSON output. Output raw JSON only. Ensure values are escaped properly.`;

      const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          }
        }),
      }, 'ai_generation');

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text.trim()) as GeneratedContent;
          
          // Formulate actual URLs inside social text if templates are present
          const cleanSlug = parsed.blogSlug;
          const targetBlogUrl = `${websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl}/blog/${cleanSlug}`;
          parsed.socialTwitter = parsed.socialTwitter.replace(/https?:\/\/[^\s]+/g, targetBlogUrl);
          parsed.socialLinkedIn = parsed.socialLinkedIn.replace(/https?:\/\/[^\s]+/g, targetBlogUrl);
          parsed.socialFacebook = parsed.socialFacebook.replace(/https?:\/\/[^\s]+/g, targetBlogUrl);
          
          addLog('ai_generation', `Gemini content generation successful for "${parsed.blogTitle}".`);
          return parsed;
        }
      }
      addLog('ai_generation', `Gemini request failed (status: ${res.status}). Falling back to template builder.`);
    } catch (e: any) {
      addLog('ai_generation', `Gemini integration error (${e.message || e}). Falling back to template builder.`);
    }
  } else {
    addLog('ai_generation', `No Gemini API key provided. Activating template content builder...`);
  }

  // Deterministic Fallback Logic
  // Match closest fallback by finding title matching topic or just choose index
  const hash = topic.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const fallbackIndex = hash % fallbackList.length;
  const fallback = fallbackList[fallbackIndex];

  // Adjust placeholder links to actual website URL
  const targetBlogUrl = `${websiteUrl.startsWith('http') ? websiteUrl : 'https://' + websiteUrl}/blog/${fallback.blogSlug}`;
  const socialTwitter = fallback.socialTwitter.replace(/https?:\/\/[^\s]+/g, targetBlogUrl);
  const socialLinkedIn = fallback.socialLinkedIn.replace(/https?:\/\/[^\s]+/g, targetBlogUrl);
  const socialFacebook = fallback.socialFacebook.replace(/https?:\/\/[^\s]+/g, targetBlogUrl);

  const keywords = nicheKey === 'tech' ? ['automation', 'saas', 'productivity']
                 : nicheKey === 'eco' ? ['sustainability', 'zero-waste', 'organic']
                 : nicheKey === 'fashion' ? ['capsule-wardrobe', 'style', 'fashion']
                 : nicheKey === 'health' ? ['wellness', 'longevity', 'health']
                 : nicheKey === 'marketing' ? ['b2b marketing', 'lead generation', 'brand strategy']
                 : ['blog', 'writing', 'automation'];

  // Add customized elements based on the exact user-specified topic
  const blogTitle = topic;
  const blogSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const blogContent = fallback.blogContent.replace(/# .*\n/, `# ${topic}\n`);

  addLog('ai_generation', `Template generation successful for "${blogTitle}".`);

  return {
    blogTitle,
    blogSlug,
    blogExcerpt: fallback.blogExcerpt,
    blogContent,
    seoKeywords: keywords,
    coverImagePrompt: fallback.coverImagePrompt,
    socialTwitter,
    socialLinkedIn,
    socialFacebook,
  };
}
