'use client';

import React, { useState, useEffect } from 'react';

interface WebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: {
    id?: string;
    name: string;
    url: string;
    niche: string;
    tone: 'professional' | 'witty' | 'casual' | 'informative' | 'hype';
    keywords: string[];
    competitors: string[];
    intervalHours: number;
    status: 'active' | 'paused';
  };
}

export function WebsiteModal({ isOpen, onClose, onSave, initialData }: WebsiteModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [niche, setNiche] = useState('SaaS Productivity & Software Tools');
  const [tone, setTone] = useState<'professional' | 'witty' | 'casual' | 'informative' | 'hype'>('informative');
  const [keywords, setKeywords] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [intervalHours, setIntervalHours] = useState(24);
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedPreview, setScrapedPreview] = useState<any>(null);
  const [scrapeError, setScrapeError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setUrl(initialData.url || '');
      setNiche(initialData.niche || 'SaaS Productivity & Software Tools');
      setTone(initialData.tone || 'informative');
      setKeywords(initialData.keywords ? initialData.keywords.join(', ') : '');
      setCompetitors(initialData.competitors ? initialData.competitors.join(', ') : '');
      setIntervalHours(initialData.intervalHours || 24);
      setStatus(initialData.status || 'active');
      setScrapedPreview(null);
      setScrapeError('');
    } else {
      setName('');
      setUrl('');
      setNiche('SaaS Productivity & Software Tools');
      setTone('informative');
      setKeywords('automation, software, product, startup');
      setCompetitors('');
      setIntervalHours(24);
      setStatus('active');
      setScrapedPreview(null);
      setScrapeError('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    const cleanKeywords = keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const cleanCompetitors = competitors
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    onSave({
      id: initialData?.id,
      name,
      url,
      niche,
      tone,
      keywords: cleanKeywords,
      competitors: cleanCompetitors,
      intervalHours: Number(intervalHours),
      status,
    });
  };

  const handleTestScrape = async () => {
    if (!url) {
      setScrapeError('Please enter a website URL first');
      return;
    }

    setIsScraping(true);
    setScrapeError('');
    setScrapedPreview(null);

    try {
      const res = await fetch('/api/websites/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          niche, 
          competitors: competitors.split(',').map(c => c.trim()).filter(c => c.length > 0) 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setScrapedPreview(data);
        // Auto fill brand settings fields with detected metrics
        if (data.detectedBrandName) {
          setName(data.detectedBrandName);
        } else if (data.title) {
          setName(data.title.split(/[|:-]/)[0].trim());
        }
        
        if (data.detectedNiche) {
          setNiche(data.detectedNiche);
        }
        if (data.detectedKeywords && data.detectedKeywords.length > 0) {
          setKeywords(data.detectedKeywords.join(', '));
        }
        if (data.detectedCompetitors && data.detectedCompetitors.length > 0) {
          setCompetitors(data.detectedCompetitors.join(', '));
        }
      } else {
        setScrapeError(data.error || 'Failed to crawl website.');
      }
    } catch (err) {
      setScrapeError('Network error connecting to crawler service.');
    } finally {
      setIsScraping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden animate-fade-in bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      
      <div className="relative w-full max-w-lg h-full flex flex-col bg-zinc-950 border-l border-[rgba(255,255,255,0.08)] shadow-2xl p-6 overflow-y-auto z-10 animate-slide-up">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-white mb-1">
          {initialData ? 'Edit Connected Website' : 'Connect New Website'}
        </h2>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Link a website to synchronize content pipelines. The scheduler scans feeds and generates micro-content at custom intervals.
        </p>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 text-sm">
          {/* Target Website URL */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-300">Website URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="flex-1 bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                disabled={isScraping}
                onClick={handleTestScrape}
                className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] hover:bg-zinc-800 disabled:opacity-50 text-xs font-bold text-indigo-400 px-4 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isScraping ? (
                  <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>Test Scan</span>
                )}
              </button>
            </div>
          </div>

          {/* Test Scraper Preview Panel */}
          {scrapedPreview && (
            <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-4 animate-fade-in flex flex-col gap-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Metadata Scan Success</span>
              <div className="text-xs space-y-1.5 text-zinc-300">
                <p><strong className="text-zinc-400">Title:</strong> {scrapedPreview.title}</p>
                <p className="line-clamp-2"><strong className="text-zinc-400">Desc:</strong> {scrapedPreview.description}</p>
                <p><strong className="text-zinc-400">Topics found:</strong></p>
                <ul className="list-disc pl-4 text-zinc-400 space-y-0.5">
                  {scrapedPreview.suggestedTopics.slice(0, 3).map((t: string, i: number) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
                {scrapedPreview.competitorAnalysis && scrapedPreview.competitorAnalysis.length > 0 && (
                  <div className="border-t border-indigo-900/40 pt-2 mt-2">
                    <p className="font-semibold text-zinc-400">Competitors Analyzed ({scrapedPreview.competitorAnalysis.length}):</p>
                    <ul className="list-disc pl-4 text-zinc-400 space-y-0.5 mt-1">
                      {scrapedPreview.competitorAnalysis.map((c: any, i: number) => (
                        <li key={i}>
                          <span className="text-zinc-300 font-medium">{c.url}</span>: {c.title || 'Scraped successfully'} 
                          {c.keywords && c.keywords.length > 0 && ` (${c.keywords.slice(0, 3).join(', ')})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {scrapeError && (
            <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 text-xs text-red-400 animate-fade-in">
              ⚠️ {scrapeError}
            </div>
          )}

          {/* Connected Site Name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-300">Brand / Website Name</label>
            <input
              type="text"
              required
              placeholder="e.g. MyTech Blog"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Niche Classification */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-300">Industry Niche / Category</label>
            <input
              type="text"
              required
              placeholder="e.g. SaaS Productivity & Software Tools"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Tone & Style */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-300">AI Tone of Voice</label>
            <div className="grid grid-cols-3 gap-2">
              {(['informative', 'professional', 'witty', 'casual', 'hype'] as const).map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTone(t)}
                  className={`border py-2 px-1 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                    tone === t
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : 'bg-zinc-900 border-[rgba(255,255,255,0.06)] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Scheduler Settings */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-300 flex justify-between">
              <span>Scan Scheduler Sync Interval</span>
              <span className="text-indigo-400 font-bold">Every {intervalHours} Hours</span>
            </label>
            <input
              type="range"
              min="1"
              max="72"
              value={intervalHours}
              onChange={e => setIntervalHours(Number(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-bold px-1">
              <span>1 Hour</span>
              <span>12h</span>
              <span>24h (Daily)</span>
              <span>48h</span>
              <span>72h (3 Days)</span>
            </div>
          </div>

          {/* Core Keywords */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-300">Core Brand Keywords (Comma Separated)</label>
            <input
              type="text"
              placeholder="automation, software, technology"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Competitors */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-300">Competitor website URLs (Comma Separated)</label>
            <input
              type="text"
              placeholder="competitor1.com, competitor2.com"
              value={competitors}
              onChange={e => setCompetitors(e.target.value)}
              className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] pt-4 mt-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-300">Automation Engine Status</span>
              <span className="text-[10px] text-zinc-500">Toggle whether to sync automatically</span>
            </div>
            
            <div className="flex bg-[rgba(0,0,0,0.4)] p-1 rounded-lg border border-[rgba(255,255,255,0.06)]">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  status === 'active'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus('paused')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  status === 'paused'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Paused
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end mt-auto pt-6 border-t border-[rgba(255,255,255,0.08)]">
            <button
              type="button"
              onClick={onClose}
              className="border border-[rgba(255,255,255,0.08)] hover:bg-zinc-900 text-zinc-300 px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/10 transition-colors"
            >
              Save Connection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
