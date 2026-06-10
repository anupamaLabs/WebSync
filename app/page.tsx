'use client';

import React, { useState, useEffect } from 'react';
import { WebsiteModal } from '../components/website-modal';
import { SocialPreview } from '../components/social-preview';

interface Website {
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
  status: 'active' | 'paused';
}

interface Post {
  id: string;
  websiteId: string;
  blogTitle: string;
  blogSlug: string;
  blogExcerpt: string;
  blogContent: string;
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
  error: string | null;
  createdAt: string;
}

interface Settings {
  geminiApiKey: string;
  wordpressUrl: string;
  wordpressUsername: string;
  wordpressPassword: string;
  twitterMock: boolean;
  linkedinMock: boolean;
  wordpressMock: boolean;
  brandVoiceDescription: string;
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

interface Log {
  id: string;
  timestamp: string;
  type: 'scrape' | 'ai_generation' | 'publish' | 'scheduler' | 'error' | 'info';
  message: string;
  details?: string;
}

export default function DashboardPage() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'websites' | 'queue' | 'channels' | 'logs'>('dashboard');

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Data State
  const [websites, setWebsites] = useState<Website[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<Settings>({
    geminiApiKey: '',
    wordpressUrl: '',
    wordpressUsername: '',
    wordpressPassword: '',
    twitterMock: true,
    linkedinMock: true,
    wordpressMock: true,
    brandVoiceDescription: '',
  });
  const [logs, setLogs] = useState<Log[]>([]);

  // Modals & UI Actions
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<Website | undefined>(undefined);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false);
  
  // Inline edit state for generated post
  const [editTitle, setEditTitle] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editLinkedIn, setEditLinkedIn] = useState('');
  const [editScheduledFor, setEditScheduledFor] = useState('');

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isTicking, setIsTicking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Theme sync effect
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  // Fetch Data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const saveToLocalStorage = (newWebsites: Website[], newPosts: Post[], newSettings: Settings, newLogs: Log[]) => {
    const db = { websites: newWebsites, posts: newPosts, settings: newSettings, logs: newLogs };
    localStorage.setItem('websync_db', JSON.stringify(db));
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Load from localStorage first to keep UI fast
      const localDbStr = localStorage.getItem('websync_db');
      let localDb = null;
      if (localDbStr) {
        localDb = JSON.parse(localDbStr);
        setWebsites(localDb.websites || []);
        setPosts(localDb.posts || []);
        if (localDb.posts && localDb.posts.length > 0 && !selectedPost) {
          setSelectedPost(localDb.posts[0]);
        }
        setSettings(localDb.settings || defaultSettings);
        setLogs(localDb.logs || []);
        setIsLoading(false);
      }

      // Sync local storage DB state to server container /tmp/data/db.json
      if (localDb) {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbState: localDb }),
        }).catch(() => {});
      }

      // Fetch fresh settings and sync check from server
      const settingsRes = await fetch('/api/settings', { cache: 'no-store' });
      if (settingsRes.ok) {
        const serverSettings = await settingsRes.json();
        setSettings(prev => {
          const updated = {
            ...prev,
            ...serverSettings,
            // Prioritize server-configured API key if client has none or server key is updated
            geminiApiKey: serverSettings.geminiApiKey || prev.geminiApiKey
          };
          if (localDbStr) {
            try {
              const dbObj = JSON.parse(localDbStr);
              dbObj.settings = updated;
              localStorage.setItem('websync_db', JSON.stringify(dbObj));
            } catch {}
          }
          return updated;
        });
      }

      // If local storage is empty, fetch all initial database stats from server
      if (!localDbStr) {
        const [webRes, postsRes, settingsRes, logsRes] = await Promise.all([
          fetch('/api/websites', { cache: 'no-store' }),
          fetch('/api/posts', { cache: 'no-store' }),
          fetch('/api/settings', { cache: 'no-store' }),
          fetch('/api/logs', { cache: 'no-store' }),
        ]);

        let webs = [];
        let psts = [];
        let sets = defaultSettings;
        let lgs = [];

        if (webRes.ok) webs = await webRes.json();
        if (postsRes.ok) {
          psts = await postsRes.json();
          if (psts.length > 0 && !selectedPost) {
            setSelectedPost(psts[0]);
          }
        }
        if (settingsRes.ok) sets = await settingsRes.json();
        if (logsRes.ok) lgs = await logsRes.json();

        setWebsites(webs);
        setPosts(psts);
        setSettings(sets);
        setLogs(lgs);

        saveToLocalStorage(webs, psts, sets, lgs);
        
        // Push initial database state to the sync endpoint
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbState: { websites: webs, posts: psts, settings: sets, logs: lgs } }),
        }).catch(() => {});
      }
    } catch (err) {
      showNotification('Failed to retrieve system status.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (text: string, type: 'success' | 'error' | 'info') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 5000);
  };

  // Website Save
  const handleSaveWebsite = async (siteData: any) => {
    const isEdit = !!siteData.id;
    const url = isEdit ? `/api/websites?id=${siteData.id}` : '/api/websites';
    const method = isEdit ? 'PUT' : 'POST';
    const dbState = { websites, posts, settings, logs };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...siteData, dbState }),
      });

      if (res.ok) {
        const { result: savedSite, dbState: returnedDb } = await res.json();
        
        setWebsites(returnedDb.websites);
        setPosts(returnedDb.posts);
        setSettings(returnedDb.settings);
        setLogs(returnedDb.logs);
        saveToLocalStorage(returnedDb.websites, returnedDb.posts, returnedDb.settings, returnedDb.logs);

        showNotification(
          isEdit ? 'Website credentials updated.' : 'Website synchronized successfully.',
          'success'
        );
        setIsWebsiteModalOpen(false);
        setEditingWebsite(undefined);
      } else {
        const data = await res.json();
        showNotification(data.error || 'Operation failed.', 'error');
      }
    } catch {
      showNotification('Communication error with website connector.', 'error');
    }
  };

  // Delete Website
  const handleDeleteWebsite = async (id: string) => {
    if (!confirm('Are you sure you want to delete this website connection? All scheduled drafts will be removed.')) return;
    const dbState = { websites, posts, settings, logs };

    try {
      const res = await fetch(`/api/websites?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbState }),
      });
      if (res.ok) {
        const { dbState: returnedDb } = await res.json();
        
        setWebsites(returnedDb.websites);
        setPosts(returnedDb.posts);
        setSettings(returnedDb.settings);
        setLogs(returnedDb.logs);
        saveToLocalStorage(returnedDb.websites, returnedDb.posts, returnedDb.settings, returnedDb.logs);

        if (selectedPost && selectedPost.websiteId === id) {
          setSelectedPost(null);
        }
        
        showNotification('Website disconnected successfully.', 'success');
      } else {
        showNotification('Failed to disconnect website.', 'error');
      }
    } catch {
      showNotification('Connection error.', 'error');
    }
  };

  // Trigger manual content generation for website
  const handleTriggerGenerate = async (websiteId: string) => {
    setIsGenerating(true);
    showNotification('AI content agent is analyzing website feeds and drafting articles...', 'info');
    const dbState = { websites, posts, settings, logs };

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId, dbState }),
      });
      if (res.ok) {
        const { result: newPost, dbState: returnedDb } = await res.json();
        
        setWebsites(returnedDb.websites);
        setPosts(returnedDb.posts);
        setSettings(returnedDb.settings);
        setLogs(returnedDb.logs);
        saveToLocalStorage(returnedDb.websites, returnedDb.posts, returnedDb.settings, returnedDb.logs);

        const matchedPost = returnedDb.posts.find((p: Post) => p.id === newPost.id) || newPost;
        setSelectedPost(matchedPost);
        showNotification(`Draft Generated: "${newPost.blogTitle}"`, 'success');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Content generation failed.', 'error');
      }
    } catch {
      showNotification('Failed to connect to AI engine.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger Scheduler Tick (checks schedules + publishes)
  const handleTriggerTick = async () => {
    setIsTicking(true);
    showNotification('Scheduler check initiated. Syncing feeds and processing scheduled posts...', 'info');
    const dbState = { websites, posts, settings, logs };

    try {
      const res = await fetch('/api/scheduler/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbState }),
      });
      if (res.ok) {
        const { result: summary, dbState: returnedDb } = await res.json();
        
        setWebsites(returnedDb.websites);
        setPosts(returnedDb.posts);
        setSettings(returnedDb.settings);
        setLogs(returnedDb.logs);
        saveToLocalStorage(returnedDb.websites, returnedDb.posts, returnedDb.settings, returnedDb.logs);

        if (returnedDb.posts.length > 0) {
          const stillExists = returnedDb.posts.find((p: Post) => selectedPost && p.id === selectedPost.id);
          setSelectedPost(stillExists || returnedDb.posts[0]);
        }
        
        const msg = `Scheduler sync complete. Scraped: ${summary.websitesScanned.length}, Created Drafts: ${summary.postsGenerated.length}, Published: ${summary.postsPublished.length}.`;
        showNotification(msg, 'success');
      } else {
        showNotification('Scheduler tick process failed.', 'error');
      }
    } catch {
      showNotification('Tick command network error.', 'error');
    } finally {
      setIsTicking(false);
    }
  };

  // Trigger Instant Post Publish
  const handlePublishNow = async (postId: string) => {
    setIsPublishing(true);
    showNotification('Post distribution pipeline triggered. Publishing to WordPress and socials...', 'info');
    const dbState = { websites, posts, settings, logs };

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, dbState }),
      });
      if (res.ok) {
        const { result: updatedPost, dbState: returnedDb } = await res.json();
        
        setWebsites(returnedDb.websites);
        setPosts(returnedDb.posts);
        setSettings(returnedDb.settings);
        setLogs(returnedDb.logs);
        saveToLocalStorage(returnedDb.websites, returnedDb.posts, returnedDb.settings, returnedDb.logs);

        const matchedPost = returnedDb.posts.find((p: Post) => p.id === postId) || updatedPost;
        setSelectedPost(matchedPost);
        showNotification('Post distributed successfully!', 'success');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Distribution pipeline failed.', 'error');
      }
    } catch {
      showNotification('Publish process network error.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Update Settings
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const dbState = { websites, posts, settings, logs };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, dbState }),
      });
      if (res.ok) {
        const { result: updatedSettings, dbState: returnedDb } = await res.json();
        
        setWebsites(returnedDb.websites);
        setPosts(returnedDb.posts);
        setSettings(returnedDb.settings);
        setLogs(returnedDb.logs);
        saveToLocalStorage(returnedDb.websites, returnedDb.posts, returnedDb.settings, returnedDb.logs);

        showNotification('Settings updated successfully.', 'success');
      } else {
        showNotification('Failed to save settings.', 'error');
      }
    } catch {
      showNotification('Settings API network error.', 'error');
    }
  };

  // Post Approval (schedule for publishing)
  const handleApprovePost = async (id: string, date?: string) => {
    const targetScheduledFor = date || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const dbState = { websites, posts, settings, logs };

    try {
      const res = await fetch(`/api/posts?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'scheduled',
          scheduledFor: targetScheduledFor,
          dbState
        }),
      });
      if (res.ok) {
        const { dbState: returnedDb } = await res.json();
        
        setWebsites(returnedDb.websites);
        setPosts(returnedDb.posts);
        setSettings(returnedDb.settings);
        setLogs(returnedDb.logs);
        saveToLocalStorage(returnedDb.websites, returnedDb.posts, returnedDb.settings, returnedDb.logs);

        const matchedPost = returnedDb.posts.find((p: Post) => p.id === id);
        if (matchedPost) {
          setSelectedPost(matchedPost);
        }
        
        showNotification('Post approved and added to active queue.', 'success');
      } else {
        showNotification('Failed to approve post.', 'error');
      }
    } catch {
      showNotification('Approve API network error.', 'error');
    }
  };

  // Delete Post
  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post draft?')) return;
    const dbState = { websites, posts, settings, logs };

    try {
      const res = await fetch(`/api/posts?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbState }),
      });
      if (res.ok) {
        const { dbState: returnedDb } = await res.json();
        
        setWebsites(returnedDb.websites);
        setPosts(returnedDb.posts);
        setSettings(returnedDb.settings);
        setLogs(returnedDb.logs);
        saveToLocalStorage(returnedDb.websites, returnedDb.posts, returnedDb.settings, returnedDb.logs);

        if (selectedPost && selectedPost.id === id) {
          setSelectedPost(returnedDb.posts[0] || null);
        }
        showNotification('Draft removed.', 'success');
      } else {
        showNotification('Failed to delete draft.', 'error');
      }
    } catch {
      showNotification('Delete API network error.', 'error');
    }
  };

  // Init inline edit post
  const handleStartEditPost = (post: Post) => {
    setEditTitle(post.blogTitle);
    setEditExcerpt(post.blogExcerpt);
    setEditContent(post.blogContent);
    setEditTwitter(post.socialTwitter);
    setEditLinkedIn(post.socialLinkedIn);
    setEditScheduledFor(new Date(post.scheduledFor).toISOString().slice(0, 16));
    setIsEditingPost(true);
  };

  // Save edited post
  const handleSaveEditPost = async () => {
    if (!selectedPost) return;
    const updatedData = {
      blogTitle: editTitle,
      blogExcerpt: editExcerpt,
      blogContent: editContent,
      socialTwitter: editTwitter,
      socialLinkedIn: editLinkedIn,
      scheduledFor: new Date(editScheduledFor).toISOString(),
    };
    const dbState = { websites, posts, settings, logs };

    try {
      const res = await fetch(`/api/posts?id=${selectedPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedData, dbState }),
      });

      if (res.ok) {
        const { dbState: returnedDb } = await res.json();
        
        setWebsites(returnedDb.websites);
        setPosts(returnedDb.posts);
        setSettings(returnedDb.settings);
        setLogs(returnedDb.logs);
        saveToLocalStorage(returnedDb.websites, returnedDb.posts, returnedDb.settings, returnedDb.logs);

        const matchedPost = returnedDb.posts.find((p: Post) => p.id === selectedPost.id);
        if (matchedPost) {
          setSelectedPost(matchedPost);
        }
        
        setIsEditingPost(false);
        showNotification('Post edits saved successfully.', 'success');
      } else {
        showNotification('Failed to save post edits.', 'error');
      }
    } catch {
      showNotification('Save post API network error.', 'error');
    }
  };

  const getWebsiteName = (id: string) => {
    return websites.find(w => w.id === id)?.name || 'Unknown Website';
  };

  const getWebsiteUrl = (id: string) => {
    return websites.find(w => w.id === id)?.url || 'https://example.com';
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col antialiased">
      
      {/* Toast Notification */}
      {actionMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-xl border shadow-2xl animate-slide-up max-w-lg text-center font-semibold text-xs uppercase tracking-wider bg-zinc-950/90 backdrop-blur-md transition-all border-[rgba(255,255,255,0.08)]">
          <span className={`w-2.5 h-2.5 rounded-full ${
            actionMessage.type === 'success' ? 'bg-emerald-500 animate-pulse' :
            actionMessage.type === 'error' ? 'bg-red-500 animate-pulse' : 'bg-indigo-500 animate-pulse'
          }`}></span>
          <span className="text-zinc-200">{actionMessage.text}</span>
        </div>
      )}

      {/* Main Header navigation */}
      <header className="glass-header sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              WebSync <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-400 text-xs font-bold px-1.5 py-0.5 rounded border border-indigo-500/30">AutoPost</span>
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Autonomous Content Pipeline</span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-[rgba(0,0,0,0.4)] px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.06)] text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow"></span>
            <span>Scheduler Online</span>
          </div>

          {/* Light/Dark Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.4)] hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-white"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464-4.95l.707-.707a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414zm2.12 8.486a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-5.464 5.657l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zM9 17a1 1 0 100-2H8a1 1 0 100 2h1zm-4.95-2.122a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 9a1 1 0 100-2H3a1 1 0 100 2h1zm1.343-5.657a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-indigo-500 fill-current" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
          
          <button
            onClick={handleTriggerTick}
            disabled={isTicking}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white px-4 py-2.5 rounded-lg transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 uppercase tracking-wider"
          >
            {isTicking ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
                </svg>
                <span>Trigger Sync Tick</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Workspace Inner */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-4 py-6 gap-6">
        
        {/* Navigation Sidebar Panel */}
        <aside className="w-full md:w-56 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[rgba(99,102,241,0.08)] text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            <span>Overview Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('websites')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'websites'
                ? 'bg-[rgba(99,102,241,0.08)] text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Websites & Crawler</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'queue'
                ? 'bg-[rgba(99,102,241,0.08)] text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span>Planner & Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'channels'
                ? 'bg-[rgba(99,102,241,0.08)] text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Publish Channels</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-[rgba(99,102,241,0.08)] text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Auditing Logs</span>
          </button>
        </aside>

        {/* Tab content area */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Main loader indicator */}
          {isLoading && (
            <div className="flex-1 flex flex-col gap-3 justify-center items-center h-96">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Syncing Database Workspace...</span>
            </div>
          )}

          {!isLoading && (
            <>
              {/* TAB 1: OVERVIEW DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  
                  {/* Headline */}
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-white">Overview Statistics</h2>
                    <p className="text-xs text-zinc-400">Real-time status of your linked websites and upcoming social distribution schedules.</p>
                  </div>

                  {/* Stat cards grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-panel p-5 flex flex-col gap-1 border-l-4 border-l-indigo-500">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Sites</span>
                      <span className="text-2xl font-bold text-white text-glow-primary">{websites.length}</span>
                      <span className="text-[10px] text-zinc-500 mt-1">Crawler tracking active</span>
                    </div>
                    <div className="glass-panel p-5 flex flex-col gap-1 border-l-4 border-l-yellow-500">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pending Queue</span>
                      <span className="text-2xl font-bold text-white">{posts.filter(p => p.status !== 'published').length}</span>
                      <span className="text-[10px] text-zinc-500 mt-1">Draft & Scheduled content</span>
                    </div>
                    <div className="glass-panel p-5 flex flex-col gap-1 border-l-4 border-l-emerald-500">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Published Posts</span>
                      <span className="text-2xl font-bold text-white text-glow-success">{posts.filter(p => p.status === 'published').length}</span>
                      <span className="text-[10px] text-zinc-500 mt-1">Successful platform runs</span>
                    </div>
                    <div className="glass-panel p-5 flex flex-col gap-1 border-l-4 border-l-indigo-400">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Scheduler Hits</span>
                      <span className="text-2xl font-bold text-white">{logs.filter(l => l.type === 'scheduler' || l.type === 'scrape').length}</span>
                      <span className="text-[10px] text-zinc-500 mt-1">Automated crawler checkups</span>
                    </div>
                  </div>

                  {/* Secondary info layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Active channels graph */}
                    <div className="glass-panel p-6 lg:col-span-2 flex flex-col gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Publication Distribution</span>
                        <span className="text-sm font-semibold text-zinc-300">Channels shares volume</span>
                      </div>
                      
                      <div className="space-y-4 py-4 text-xs font-semibold">
                        {/* WP bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-300">
                            <span>WordPress Blog</span>
                            <span>{posts.filter(p => p.status === 'published' && p.publishedUrls.wordpress).length} Posts</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-[rgba(255,255,255,0.04)]">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, (posts.filter(p => p.status === 'published').length * 20) || 10)}%` }}></div>
                          </div>
                        </div>
                        {/* Twitter bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-300">
                            <span>X / Twitter</span>
                            <span>{posts.filter(p => p.status === 'published' && p.publishedUrls.twitter).length} Tweets</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-[rgba(255,255,255,0.04)]">
                            <div className="bg-pink-500 h-full rounded-full" style={{ width: `${Math.min(100, (posts.filter(p => p.status === 'published').length * 20) || 10)}%` }}></div>
                          </div>
                        </div>
                        {/* LinkedIn bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-zinc-300">
                            <span>LinkedIn Shares</span>
                            <span>{posts.filter(p => p.status === 'published' && p.publishedUrls.linkedin).length} Posts</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-[rgba(255,255,255,0.04)]">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (posts.filter(p => p.status === 'published').length * 20) || 10)}%` }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-[rgba(255,255,255,0.06)] pt-4 mt-auto">
                        <button
                          onClick={() => setActiveTab('channels')}
                          className="text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1"
                        >
                          Configure Integration Keys &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Activity log summary */}
                    <div className="glass-panel p-6 lg:col-span-3 flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Live Activity Feed</span>
                          <span className="text-sm font-semibold text-zinc-300">Crawler & Publisher Transactions</span>
                        </div>
                        <button
                          onClick={() => setActiveTab('logs')}
                          className="text-xs font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider"
                        >
                          View All
                        </button>
                      </div>

                      <div className="flex-1 flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                        {logs.slice(0, 5).map((log) => (
                          <div key={log.id} className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.04)] p-2.5 rounded-lg flex items-start gap-2 text-xs">
                            <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                              log.type === 'error' ? 'bg-red-500' :
                              log.type === 'publish' ? 'bg-emerald-500' :
                              log.type === 'scrape' ? 'bg-sky-500' :
                              log.type === 'ai_generation' ? 'bg-purple-500' : 'bg-zinc-500'
                            }`}></span>
                            <div className="flex-1 flex flex-col">
                              <span className="text-zinc-300 font-medium">{log.message}</span>
                              <span className="text-[10px] text-zinc-500 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))}
                        {logs.length === 0 && (
                          <p className="text-zinc-500 italic text-center py-6">No records generated yet. Connect a site to start.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WEBSITES AND CRAWLER */}
              {activeTab === 'websites' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <h2 className="text-xl font-bold text-white">Websites & Crawlers</h2>
                      <p className="text-xs text-zinc-400">Manage connected domain sources, crawling configuration, scan settings, and tones.</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingWebsite(undefined);
                        setIsWebsiteModalOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 uppercase tracking-wider shadow-lg shadow-indigo-600/10"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Connect Website</span>
                    </button>
                  </div>

                  {/* Websites list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {websites.map(site => (
                      <div key={site.id} className="glass-panel p-5 flex flex-col gap-4 glow-card relative">
                        {/* Glow status dot */}
                        <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-[rgba(0,0,0,0.4)] px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.06)] text-[9px] uppercase tracking-wider font-bold">
                          <span className={`w-1.5 h-1.5 rounded-full ${site.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`}></span>
                          <span className={site.status === 'active' ? 'text-emerald-400' : 'text-zinc-500'}>
                            {site.status}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <h3 className="font-bold text-base text-white">{site.name}</h3>
                          <a 
                            href={site.url.startsWith('http') ? site.url : `https://${site.url}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            {site.url}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>

                        {/* Description niche */}
                        <div className="text-xs space-y-1.5 border-t border-[rgba(255,255,255,0.06)] pt-3 text-zinc-300">
                          <p><strong className="text-zinc-500">Niche:</strong> {site.niche}</p>
                          <p><strong className="text-zinc-500">Tone:</strong> <span className="uppercase tracking-widest text-[10px] font-bold bg-zinc-900 border border-[rgba(255,255,255,0.06)] text-indigo-300 px-1.5 py-0.5 rounded">{site.tone}</span></p>
                          <p><strong className="text-zinc-500">Interval:</strong> Scans every {site.intervalHours} hours</p>
                          <p><strong className="text-zinc-500">Next Sync:</strong> {new Date(site.nextScanAt).toLocaleString()}</p>
                          {site.competitors && site.competitors.length > 0 && (
                            <p><strong className="text-zinc-500">Competitors:</strong> {site.competitors.join(', ')}</p>
                          )}
                        </div>

                        {/* Tag list */}
                        <div className="flex flex-wrap gap-1">
                          {site.keywords.map((kw, i) => (
                            <span key={i} className="text-[9px] font-bold text-zinc-400 bg-zinc-900/60 px-2 py-0.5 rounded border border-[rgba(255,255,255,0.04)]">
                              #{kw}
                            </span>
                          ))}
                        </div>

                        {/* Card actions */}
                        <div className="flex gap-2 border-t border-[rgba(255,255,255,0.06)] pt-4 mt-auto">
                          <button
                            disabled={isGenerating}
                            onClick={() => handleTriggerGenerate(site.id)}
                            className="bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400 disabled:opacity-50 text-[10px] font-bold py-2 px-3 rounded-lg uppercase tracking-wider transition-all flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            Generate Content Draft
                          </button>
                          
                          <button
                            onClick={() => {
                              setEditingWebsite(site);
                              setIsWebsiteModalOpen(true);
                            }}
                            className="border border-[rgba(255,255,255,0.08)] hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold py-2 px-3 rounded-lg uppercase tracking-wider transition-colors"
                          >
                            Edit
                          </button>
                          
                          <button
                            onClick={() => handleDeleteWebsite(site.id)}
                            className="border border-red-900/40 hover:bg-red-950/20 text-red-400 text-[10px] font-bold py-2 px-3 rounded-lg uppercase tracking-wider transition-colors ml-auto"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}

                    {websites.length === 0 && (
                      <div className="col-span-2 glass-panel p-12 text-center flex flex-col items-center justify-center gap-3">
                        <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <h3 className="font-bold text-base text-zinc-300">No Web Feeds Linked</h3>
                        <p className="text-xs text-zinc-500 max-w-sm">Connect a website URL to start generating automatic content and syndicating blog entries.</p>
                        <button
                          onClick={() => setIsWebsiteModalOpen(true)}
                          className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white px-4 py-2.5 rounded-lg uppercase tracking-wider shadow-lg shadow-indigo-600/10"
                        >
                          Connect Your First Website
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PLANNER & QUEUE */}
              {activeTab === 'queue' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-white">Content Planner Queue</h2>
                    <p className="text-xs text-zinc-400">Review generated draft and scheduled posts, customize social captions, and manually execute distribution channels.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Posts List Column */}
                    <div className="lg:col-span-5 flex flex-col gap-3 max-h-[700px] overflow-y-auto pr-1">
                      {posts.map(post => (
                        <div
                          key={post.id}
                          onClick={() => {
                            setSelectedPost(post);
                            setIsEditingPost(false);
                          }}
                          className={`glass-panel p-4 flex flex-col gap-3 cursor-pointer text-left transition-all border ${
                            selectedPost?.id === post.id
                              ? 'border-indigo-500 bg-[rgba(99,102,241,0.05)] shadow-lg shadow-indigo-500/5'
                              : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              post.status === 'published' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' :
                              post.status === 'scheduled' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900/40' :
                              post.status === 'approved' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' :
                              'bg-zinc-900 text-zinc-400 border border-zinc-800'
                            }`}>
                              {post.status}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {post.status === 'published'
                                ? `Published: ${new Date(post.publishedAt!).toLocaleDateString()}`
                                : `Target: ${new Date(post.scheduledFor).toLocaleDateString()}`
                              }
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <h3 className="font-bold text-sm text-zinc-200 line-clamp-1 leading-snug">{post.blogTitle}</h3>
                            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{getWebsiteName(post.websiteId)}</span>
                          </div>

                          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                            {post.blogExcerpt}
                          </p>

                          {post.error && (
                            <span className="text-[10px] font-semibold text-red-400 bg-red-950/20 border border-red-900/30 p-1.5 rounded">
                              ⚠️ Error: {post.error}
                            </span>
                          )}
                        </div>
                      ))}

                      {posts.length === 0 && (
                        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center gap-2">
                          <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <h4 className="font-bold text-sm text-zinc-300">Planner Queue Empty</h4>
                          <p className="text-xs text-zinc-500">Wait for your scheduled crawler tasks or generate articles manually in the websites panel.</p>
                        </div>
                      )}
                    </div>

                    {/* Previews / Editor Column */}
                    <div className="lg:col-span-7">
                      {selectedPost ? (
                        <div className="flex flex-col gap-5">
                          
                          {/* Operations row */}
                          <div className="glass-panel px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active File:</span>
                              <span className="text-xs font-bold text-zinc-200 truncate max-w-[150px]">{selectedPost.blogSlug}.md</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Edit details */}
                              {!isEditingPost && selectedPost.status !== 'published' && (
                                <button
                                  onClick={() => handleStartEditPost(selectedPost)}
                                  className="border border-[rgba(255,255,255,0.08)] hover:bg-zinc-900 text-zinc-300 text-xs font-bold px-3 py-2 rounded-lg uppercase tracking-wider transition-colors flex items-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit Content
                                </button>
                              )}

                              {/* Action: Approve Draft */}
                              {selectedPost.status === 'draft' && (
                                <button
                                  onClick={() => handleApprovePost(selectedPost.id)}
                                  className="bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-400 text-xs font-bold px-3 py-2 rounded-lg uppercase tracking-wider transition-all"
                                >
                                  Approve Draft
                                </button>
                              )}

                              {/* Action: Publish Immediately */}
                              {selectedPost.status !== 'published' && (
                                <button
                                  disabled={isPublishing}
                                  onClick={() => handlePublishNow(selectedPost.id)}
                                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white px-4 py-2 rounded-lg uppercase tracking-wider shadow-lg shadow-indigo-600/10 transition-colors flex items-center gap-1"
                                >
                                  {isPublishing ? (
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                  ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                  )}
                                  <span>Publish Now</span>
                                </button>
                              )}

                              {/* Delete draft */}
                              <button
                                onClick={() => handleDeletePost(selectedPost.id)}
                                className="border border-red-900/40 hover:bg-red-950/20 text-red-400 p-2 rounded-lg transition-colors"
                                title="Delete Post Draft"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* 3a. Inline Edit interface */}
                          {isEditingPost ? (
                            <div className="glass-panel p-6 flex flex-col gap-4 text-xs">
                              <span className="text-sm font-bold text-white mb-2">Edit Generated Asset Content</span>
                              
                              <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-zinc-300">Blog Article Title</label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={e => setEditTitle(e.target.value)}
                                  className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-zinc-300">Short Summary Excerpt</label>
                                <textarea
                                  rows={2}
                                  value={editExcerpt}
                                  onChange={e => setEditExcerpt(e.target.value)}
                                  className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-zinc-300">Blog Markdown Body</label>
                                <textarea
                                  rows={8}
                                  value={editContent}
                                  onChange={e => setEditContent(e.target.value)}
                                  className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-zinc-300">X / Twitter Text</label>
                                <textarea
                                  rows={2}
                                  value={editTwitter}
                                  onChange={e => setEditTwitter(e.target.value)}
                                  className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-zinc-300">LinkedIn Post Text</label>
                                <textarea
                                  rows={3}
                                  value={editLinkedIn}
                                  onChange={e => setEditLinkedIn(e.target.value)}
                                  className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-zinc-300">Scheduled Posting Time</label>
                                <input
                                  type="datetime-local"
                                  value={editScheduledFor}
                                  onChange={e => setEditScheduledFor(e.target.value)}
                                  className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingPost(false)}
                                  className="border border-[rgba(255,255,255,0.08)] hover:bg-zinc-900 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveEditPost}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider"
                                >
                                  Save Edits
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* 3b. Interactive platform previewer */
                            <div className="flex flex-col gap-4">
                              
                              {/* Distribution details if published */}
                              {selectedPost.status === 'published' && (
                                <div className="glass-panel p-4 flex flex-col gap-2 bg-emerald-950/10 border-emerald-900/30 text-xs">
                                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Post Successfully Distributed</span>
                                  <div className="space-y-1.5 text-zinc-300 font-semibold mt-1">
                                    {selectedPost.publishedUrls.wordpress && (
                                      <p className="flex justify-between items-center bg-zinc-900/50 p-2 rounded">
                                        <span>WordPress Link</span>
                                        <a href={selectedPost.publishedUrls.wordpress} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Open Blog &rarr;</a>
                                      </p>
                                    )}
                                    {selectedPost.publishedUrls.twitter && (
                                      <p className="flex justify-between items-center bg-zinc-900/50 p-2 rounded">
                                        <span>X / Twitter Link</span>
                                        <a href={selectedPost.publishedUrls.twitter} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Open Tweet &rarr;</a>
                                      </p>
                                    )}
                                    {selectedPost.publishedUrls.linkedin && (
                                      <p className="flex justify-between items-center bg-zinc-900/50 p-2 rounded">
                                        <span>LinkedIn Link</span>
                                        <a href={selectedPost.publishedUrls.linkedin} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Open Share &rarr;</a>
                                      </p>
                                    )}

                                  </div>
                                </div>
                              )}

                              <SocialPreview
                                title={selectedPost.blogTitle}
                                excerpt={selectedPost.blogExcerpt}
                                content={selectedPost.blogContent}
                                twitterText={selectedPost.socialTwitter}
                                linkedinText={selectedPost.socialLinkedIn}
                                coverImagePrompt={selectedPost.coverImagePrompt}
                                websiteName={getWebsiteName(selectedPost.websiteId)}
                                websiteUrl={getWebsiteUrl(selectedPost.websiteId)}
                              />
                            </div>
                          )}

                        </div>
                      ) : (
                        <div className="glass-panel p-20 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                          <svg className="w-12 h-12 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                          </svg>
                          <h4 className="font-bold text-sm text-zinc-400 mt-2">No Post Selected</h4>
                          <p className="text-xs">Click a post card in the queue column to visualizes mock platform layouts.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PUBLISH CHANNELS & SETTINGS */}
              {activeTab === 'channels' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-white">Publishing Integration Channels</h2>
                    <p className="text-xs text-zinc-400">Setup credentials and settings for automated platforms and AI generations engines.</p>
                  </div>

                  <form onSubmit={handleUpdateSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                    
                    {/* Gemini Settings Card */}
                    <div className="glass-panel p-6 flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">G</span>
                        <h3 className="font-bold text-sm text-white">Google Gemini Generative AI</h3>
                      </div>
                      <p className="text-zinc-400">Specify an API key to allow live AI post and social caption generation. If empty, the engine defaults to static niches templates.</p>
                      
                      <div className="flex flex-col gap-1.5 mt-2">
                        <label className="font-semibold text-zinc-300">Gemini API Key</label>
                        <input
                          type="password"
                          placeholder="AIzaSy..."
                          value={settings.geminiApiKey}
                          onChange={e => setSettings({ ...settings, geminiApiKey: e.target.value })}
                          className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-zinc-300">Brand Voice / Directions Prompt</label>
                        <textarea
                          rows={3}
                          placeholder="e.g. Write in an informative tone, targeting software professionals."
                          value={settings.brandVoiceDescription}
                          onChange={e => setSettings({ ...settings, brandVoiceDescription: e.target.value })}
                          className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    {/* WordPress Credentials Card */}
                    <div className="glass-panel p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">W</span>
                          <h3 className="font-bold text-sm text-white">WordPress Integration</h3>
                        </div>
                        
                        <div className="flex bg-[rgba(0,0,0,0.4)] p-0.5 rounded border border-[rgba(255,255,255,0.06)] text-[10px]">
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, wordpressMock: false })}
                            className={`px-2 py-1 rounded font-bold transition-all ${
                              !settings.wordpressMock ? 'bg-indigo-600 text-white' : 'text-zinc-500'
                            }`}
                          >
                            Live
                          </button>
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, wordpressMock: true })}
                            className={`px-2 py-1 rounded font-bold transition-all ${
                              settings.wordpressMock ? 'bg-zinc-800 text-white' : 'text-zinc-500'
                            }`}
                          >
                            Mock
                          </button>
                        </div>
                      </div>
                      <p className="text-zinc-400">Post articles to WordPress REST API using Application Passwords. Supports custom blogs setups.</p>
                      
                      <div className="flex flex-col gap-1.5 mt-2">
                        <label className="font-semibold text-zinc-300">WordPress Base URL</label>
                        <input
                          type="text"
                          placeholder="https://mywebsite.com"
                          value={settings.wordpressUrl}
                          disabled={settings.wordpressMock}
                          onChange={e => setSettings({ ...settings, wordpressUrl: e.target.value })}
                          className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] disabled:opacity-50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-zinc-300">Username</label>
                          <input
                            type="text"
                            placeholder="admin"
                            value={settings.wordpressUsername}
                            disabled={settings.wordpressMock}
                            onChange={e => setSettings({ ...settings, wordpressUsername: e.target.value })}
                            className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] disabled:opacity-50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-zinc-300">Application Password</label>
                          <input
                            type="password"
                            placeholder="xxxx xxxx xxxx xxxx"
                            value={settings.wordpressPassword}
                            disabled={settings.wordpressMock}
                            onChange={e => setSettings({ ...settings, wordpressPassword: e.target.value })}
                            className="bg-zinc-900 border border-[rgba(255,255,255,0.08)] disabled:opacity-50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>


                    {/* Social networks mock configs */}
                    <div className="glass-panel p-6 flex flex-col gap-4 md:col-span-2">
                      <h3 className="font-bold text-sm text-white">Social Media Connectors</h3>
                      <p className="text-zinc-400">Configure OAuth and connections for automatic social postings. To keep setups quick, you can toggle simulated distribution loops.</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        
                        {/* Twitter card */}
                        <div className="bg-zinc-900/50 border border-[rgba(255,255,255,0.04)] p-4 rounded-xl flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-300">X / Twitter API Postings</span>
                            <span className="text-[10px] text-zinc-500">Post captions to developer timeline feed</span>
                          </div>
                          
                          <div className="flex bg-black p-0.5 rounded border border-[rgba(255,255,255,0.06)] text-[10px]">
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, twitterMock: false })}
                              className={`px-2 py-1 rounded font-bold transition-all ${
                                !settings.twitterMock ? 'bg-indigo-600 text-white' : 'text-zinc-550'
                              }`}
                            >
                              Live
                            </button>
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, twitterMock: true })}
                              className={`px-2 py-1 rounded font-bold transition-all ${
                                settings.twitterMock ? 'bg-zinc-800 text-white' : 'text-zinc-550'
                              }`}
                            >
                              Mock
                            </button>
                          </div>
                        </div>

                        {/* LinkedIn card */}
                        <div className="bg-zinc-900/50 border border-[rgba(255,255,255,0.04)] p-4 rounded-xl flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-300">LinkedIn Share Streams</span>
                            <span className="text-[10px] text-zinc-500">Post link cards on organizational feeds</span>
                          </div>

                          <div className="flex bg-black p-0.5 rounded border border-[rgba(255,255,255,0.06)] text-[10px]">
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, linkedinMock: false })}
                              className={`px-2 py-1 rounded font-bold transition-all ${
                                !settings.linkedinMock ? 'bg-indigo-600 text-white' : 'text-zinc-550'
                              }`}
                            >
                              Live
                            </button>
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, linkedinMock: true })}
                              className={`px-2 py-1 rounded font-bold transition-all ${
                                settings.linkedinMock ? 'bg-zinc-800 text-white' : 'text-zinc-550'
                              }`}
                            >
                              Mock
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Form Submit */}
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-3 rounded-lg uppercase tracking-wider shadow-lg shadow-indigo-600/10 transition-colors"
                      >
                        Save Configuration Keys
                      </button>
                    </div>

                  </form>
                </div>
              )}

              {/* TAB 5: AUDITING LOGS */}
              {activeTab === 'logs' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex flex-col">
                      <h2 className="text-xl font-bold text-white">System Logs & Audit Feed</h2>
                      <p className="text-xs text-zinc-400">Chronological transaction logs showing crawler parses, content creations, scheduling checks, and publication dispatches.</p>
                    </div>
                    
                    <button
                      onClick={fetchData}
                      className="border border-[rgba(255,255,255,0.08)] hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
                      </svg>
                      Refresh Logs
                    </button>
                  </div>

                  {/* Terminal Container */}
                  <div className="glass-panel p-6 bg-zinc-950/70 border border-zinc-850 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[600px] flex flex-col gap-3">
                    <div className="flex items-center gap-2 pb-3 border-b border-[rgba(255,255,255,0.06)] text-zinc-500 font-bold select-none text-xs">
                      <span>TERMINAL CONSOLE SYSTEM AUDIT REPORT</span>
                      <span className="w-1.5 h-3 bg-zinc-600 animate-pulse"></span>
                    </div>

                    <div className="space-y-2.5">
                      {logs.map(log => (
                        <div key={log.id} className="flex gap-4 items-start select-text border-b border-[rgba(255,255,255,0.02)] pb-2">
                          <span className="text-zinc-500 shrink-0 select-none">[{new Date(log.timestamp).toISOString()}]</span>
                          
                          <span className={`px-2 py-0.5 rounded text-[9px] shrink-0 font-bold uppercase tracking-wider select-none ${
                            log.type === 'error' ? 'bg-red-950/50 text-red-400 border border-red-900/30' :
                            log.type === 'publish' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' :
                            log.type === 'scrape' ? 'bg-sky-950/50 text-sky-400 border border-sky-900/30' :
                            log.type === 'ai_generation' ? 'bg-purple-950/50 text-purple-400 border border-purple-900/30' :
                            'bg-zinc-900 text-zinc-400 border border-zinc-800'
                          }`}>
                            {log.type}
                          </span>

                          <div className="flex-1 flex flex-col gap-1 text-zinc-300">
                            <span className="font-semibold">{log.message}</span>
                            {log.details && (
                              <p className="text-[10px] text-zinc-500 bg-black/40 p-2 rounded border border-[rgba(255,255,255,0.03)] font-mono max-w-full overflow-x-auto">
                                {log.details}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {logs.length === 0 && (
                        <p className="text-zinc-600 italic text-center py-12">No activity logged in database.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* Website Edit/Add Drawer sheet */}
      <WebsiteModal
        isOpen={isWebsiteModalOpen}
        initialData={editingWebsite}
        onClose={() => {
          setIsWebsiteModalOpen(false);
          setEditingWebsite(undefined);
        }}
        onSave={handleSaveWebsite}
      />

      <footer className="border-t border-[rgba(255,255,255,0.06)] bg-zinc-950/30 px-6 py-6 text-center text-xs text-zinc-500 font-semibold tracking-wide mt-auto">
        &copy; 2026 WebSync AutoPost • Powered by Google Gemini AI and Next.js Canary Engine.
      </footer>
    </div>
  );
}
