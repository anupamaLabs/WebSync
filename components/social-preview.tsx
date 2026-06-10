'use client';

import React, { useState } from 'react';

interface PostPreviewProps {
  title: string;
  excerpt: string;
  content: string;
  twitterText: string;
  linkedinText: string;
  coverImagePrompt: string;
  websiteName: string;
  websiteUrl: string;
}

export function SocialPreview({
  title,
  excerpt,
  content,
  twitterText,
  linkedinText,
  coverImagePrompt,
  websiteName,
  websiteUrl,
}: PostPreviewProps) {
  const [activePlatform, setActivePlatform] = useState<'twitter' | 'linkedin' | 'blog'>('blog');

  // Simple clean hostname helper
  const getHostName = (url: string) => {
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="glass-panel w-full flex flex-col overflow-hidden h-[540px]">
      {/* Header Selector */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[rgba(17,24,39,0.3)] px-6 py-4">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Live Preview Simulator</span>
          <span className="text-sm font-bold text-zinc-200">Cross-Platform Distribution Channel Preview</span>
        </div>
        
        <div className="flex bg-[rgba(0,0,0,0.4)] p-1 rounded-lg border border-[rgba(255,255,255,0.06)]">
          <button
            onClick={() => setActivePlatform('blog')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activePlatform === 'blog'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            WordPress Blog
          </button>
          <button
            onClick={() => setActivePlatform('twitter')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activePlatform === 'twitter'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            X / Twitter
          </button>
          <button
            onClick={() => setActivePlatform('linkedin')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activePlatform === 'linkedin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            LinkedIn
          </button>
        </div>
      </div>

      {/* Simulator Body */}
      <div className="flex-1 p-6 overflow-y-auto bg-[rgba(10,10,12,0.4)] flex justify-center items-start">
        
        {/* 1. Blog Preview */}
        {activePlatform === 'blog' && (
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-lg p-6 shadow-2xl animate-fade-in text-zinc-300">
            {/* Browser top-bar mockup */}
            <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-4 mb-6 text-zinc-600 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
              <span className="ml-4 bg-zinc-900 px-3 py-0.5 rounded border border-zinc-850 text-zinc-500 truncate w-72">
                {getHostName(websiteUrl)}/blog/preview
              </span>
            </div>

            <span className="inline-block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Featured Article</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">{title || 'Post Title Placeholder'}</h1>
            
            {/* Image Placeholder */}
            <div className="relative w-full h-40 rounded-lg bg-zinc-900 border border-zinc-850 flex flex-col items-center justify-center p-4 text-center mb-6 overflow-hidden">
              {/* Subtle background graphics */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/20 via-zinc-900/40 to-slate-900/10 z-0"></div>
              <svg className="w-8 h-8 text-zinc-600 mb-2 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider relative z-10">AI Generated Cover Image Concept</span>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed relative z-10 italic">
                "{coverImagePrompt || 'No cover image prompt defined.'}"
              </p>
            </div>

            <p className="text-sm font-semibold text-zinc-400 mb-6 italic leading-relaxed border-l-2 border-indigo-500 pl-3">
              {excerpt || 'No excerpt available.'}
            </p>

            <div className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed space-y-4">
              {content ? (
                content.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return null; // Already did title
                  if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-lg font-bold text-white mt-6 mb-2">{line.replace('## ', '')}</h2>;
                  }
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-base font-bold text-white mt-4 mb-1">{line.replace('### ', '')}</h3>;
                  }
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return <li key={i} className="ml-4 list-disc text-zinc-300">{line.substring(2)}</li>;
                  }
                  if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                    return <li key={i} className="ml-4 list-decimal text-zinc-300">{line.substring(3)}</li>;
                  }
                  if (line.trim() === '') return <div key={i} className="h-2" />;
                  
                  // Parse bold text **word**
                  let formattedLine = line;
                  const boldRegex = /\*\*(.*?)\*\*/g;
                  let match;
                  const parts = [];
                  let lastIndex = 0;
                  
                  while ((match = boldRegex.exec(line)) !== null) {
                    parts.push(line.substring(lastIndex, match.index));
                    parts.push(<strong key={match.index} className="font-bold text-zinc-100">{match[1]}</strong>);
                    lastIndex = boldRegex.lastIndex;
                  }
                  parts.push(line.substring(lastIndex));

                  return <p key={i}>{parts.length > 1 ? parts : formattedLine}</p>;
                })
              ) : (
                <p className="text-zinc-500 italic">No article body has been generated.</p>
              )}
            </div>
          </div>
        )}

        {/* 2. Twitter Preview */}
        {activePlatform === 'twitter' && (
          <div className="w-full max-w-md bg-black border border-zinc-800 rounded-2xl p-4 shadow-2xl animate-fade-in text-white text-sm font-sans">
            {/* Post Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Simulated Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white uppercase shadow-inner">
                  {websiteName.substring(0, 2)}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-white text-sm hover:underline cursor-pointer">{websiteName}</span>
                    <svg className="w-4 h-4 text-sky-500 fill-current" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <span className="text-zinc-500 text-xs">@{websiteName.toLowerCase().replace(/[^a-z]/g, '')} • Just now</span>
                </div>
              </div>
              <button className="text-zinc-500 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            </div>

            {/* Post Content */}
            <div className="pl-13 pr-2 mb-4 leading-relaxed whitespace-pre-wrap text-[15px]">
              {twitterText || 'No Twitter copy generated. This post will not contain a Twitter share.'}
            </div>

            {/* Simulated Link Card */}
            <div className="pl-13 pr-2 mb-4">
              <div className="border border-zinc-850 rounded-2xl overflow-hidden bg-zinc-900 cursor-pointer hover:bg-zinc-900/80 transition-colors">
                <div className="h-32 bg-zinc-950 flex flex-col items-center justify-center p-3 text-center border-b border-zinc-850">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Generated Card Preview</span>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 italic px-2">"{coverImagePrompt}"</p>
                </div>
                <div className="p-3 text-xs flex flex-col gap-0.5">
                  <span className="text-zinc-500 uppercase font-medium">{getHostName(websiteUrl)}</span>
                  <span className="font-semibold text-white line-clamp-1 text-[13px]">{title}</span>
                  <span className="text-zinc-400 line-clamp-1 text-[12px]">{excerpt}</span>
                </div>
              </div>
            </div>

            {/* Interactions Bar */}
            <div className="flex items-center justify-between pl-13 pr-10 text-zinc-500 text-xs border-t border-zinc-900 pt-3">
              <button className="flex items-center gap-1.5 hover:text-sky-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>0</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
                </svg>
                <span>0</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-rose-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>0</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-sky-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>0</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. LinkedIn Preview */}
        {activePlatform === 'linkedin' && (
          <div className="w-full max-w-lg bg-[#1d2226] border border-zinc-800 rounded-lg shadow-2xl animate-fade-in text-[rgb(224,226,229)] text-xs font-sans">
            {/* Header info */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-sm bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white uppercase text-base shadow-sm">
                  {websiteName.substring(0, 2)}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-white hover:underline hover:text-sky-400 cursor-pointer">{websiteName}</span>
                  <span className="text-zinc-400 text-[11px] mt-0.5">Automated Content Publishing Hub</span>
                  <span className="text-zinc-500 text-[10px] mt-0.5 flex items-center gap-1">
                    Just now • 🌐
                  </span>
                </div>
              </div>
              
              <button className="text-zinc-400 hover:text-white">
                <span className="text-lg font-bold">•••</span>
              </button>
            </div>

            {/* Post text content */}
            <div className="px-4 pb-3 text-[13px] leading-relaxed whitespace-pre-wrap font-light">
              {linkedinText || 'No LinkedIn copy generated.'}
            </div>

            {/* Big cover block */}
            <div className="border-y border-zinc-850 cursor-pointer">
              <div className="h-44 bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Visual Assets Preview</span>
                <p className="text-[11px] text-zinc-400 line-clamp-3 italic max-w-sm">"{coverImagePrompt}"</p>
              </div>
              <div className="p-3 bg-[#181d20] flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-zinc-300">{title}</span>
                <span className="text-[10px] text-zinc-400 truncate">{getHostName(websiteUrl)}</span>
              </div>
            </div>

            {/* Reactions summary */}
            <div className="px-4 py-2 border-b border-zinc-850 flex items-center text-zinc-400 text-[11px]">
              <span>👍 0 • 🚀 0</span>
            </div>

            {/* Actions Bar */}
            <div className="px-2 py-1 flex items-center justify-between text-zinc-400 font-semibold text-[13px] text-center">
              <button className="flex-1 py-2 rounded hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition-colors">
                <span>👍</span> Like
              </button>
              <button className="flex-1 py-2 rounded hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition-colors">
                <span>💬</span> Comment
              </button>
              <button className="flex-1 py-2 rounded hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition-colors">
                <span>🔁</span> Share
              </button>
              <button className="flex-1 py-2 rounded hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition-colors">
                <span>📤</span> Send
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
