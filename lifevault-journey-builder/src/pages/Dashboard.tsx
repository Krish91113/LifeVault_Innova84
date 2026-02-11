// file: src/pages/Dashboard.tsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMemories } from '@/hooks/useMemories';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { Timeline } from '@/components/dashboard/Timeline';
import { AddMemoryModal } from '@/components/dashboard/AddMemoryModal';
import { MemoryDetailModal } from '@/components/dashboard/MemoryDetailModal';
import { CreateStoryModal } from '@/components/story/CreateStoryModal';
import type { Memory } from '@/types';
import {
  Plus,
  Search,
  RefreshCw,
  Heart,
  Lock,
  ChevronRight,
  TrendingUp,
  Calendar,
  Filter,
  ArrowRight,
  Sparkles,
  Clock
} from 'lucide-react';
import { storyAPI } from '@/services/questApi';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'photo', label: 'Photos' },
  { value: 'document', label: 'Documents' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'other', label: 'Other' },
];

// ── Helper: extract stories array from any response shape ──
function extractStoriesArray(res: any): any[] {
  // Try every possible nesting the backend might return:
  // Shape 1: { data: { data: { stories: [...] } } }  (axios + wrapped)
  // Shape 2: { data: { data: [...] } }                (axios + flat)
  // Shape 3: { data: { stories: [...] } }             (axios + direct)
  // Shape 4: { data: [...] }                          (axios + raw array)

  const axiosData = res?.data; // unwrap axios

  if (!axiosData) return [];

  // If axios data itself is an array
  if (Array.isArray(axiosData)) return axiosData;

  // Check axiosData.data
  const innerData = axiosData.data;

  if (Array.isArray(innerData)) return innerData;

  // Check axiosData.data.stories
  if (innerData?.stories && Array.isArray(innerData.stories)) {
    return innerData.stories;
  }

  // Check axiosData.stories directly
  if (axiosData.stories && Array.isArray(axiosData.stories)) {
    return axiosData.stories;
  }

  // Last resort: if innerData is an object with keys, maybe it's a single story
  if (innerData && typeof innerData === 'object' && !Array.isArray(innerData)) {
    // Check if it looks like a stories wrapper
    const keys = Object.keys(innerData);
    for (const key of keys) {
      if (Array.isArray(innerData[key])) {
        return innerData[key];
      }
    }
  }

  return [];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    memories,
    loading,
    stats,
    pagination,
    fetchMemories,
    createMemory,
    deleteMemory,
    verifyMemory,
    refresh
  } = useMemories();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [myStories, setMyStories] = useState<any[]>([]);
  const [receivedStories, setReceivedStories] = useState<any[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);

  const safeStats = {
    totalMemories:
      stats?.totalMemories ||
      stats?.total ||
      pagination?.total ||
      memories?.length ||
      0,
    storageUsed: stats?.storageUsed || '0 MB',
    verifiedMemories:
      stats?.verifiedMemories ||
      stats?.verified ||
      memories?.filter((m) => m.isOnChain)?.length ||
      0,
    activeQuests: stats?.activeQuests || stats?.quests || 0,
  };

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('lifevault:refresh', handler);
    return () => window.removeEventListener('lifevault:refresh', handler);
  }, [refresh]);

  useEffect(() => {
    fetchStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    fetchMemories({ category: category === 'all' ? undefined : category });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories({ search: searchQuery });
  };

  // ── FIXED: robust story extraction ──
  const fetchStories = async () => {
    setLoadingStories(true);
    try {
      const [myRes, receivedRes] = await Promise.all([
        storyAPI.getMyStories().catch((err) => {
          console.warn('Failed to fetch my stories:', err);
          return null;
        }),
        storyAPI.getReceived().catch((err) => {
          console.warn('Failed to fetch received stories:', err);
          return null;
        }),
      ]);

      // ── Use the universal extractor ──
      const myData = extractStoriesArray(myRes);
      const receivedData = extractStoriesArray(receivedRes);

      console.log('📖 My stories loaded:', myData.length);
      console.log('📬 Received stories loaded:', receivedData.length);

      // Debug: log raw response shape if arrays are empty
      if (myData.length === 0 && myRes?.data) {
        console.log('📖 Raw my-stories response shape:', JSON.stringify(Object.keys(myRes.data)));
        if (myRes.data.data) {
          console.log('📖 Inner data shape:', JSON.stringify(
            typeof myRes.data.data === 'object'
              ? Object.keys(myRes.data.data)
              : typeof myRes.data.data
          ));
        }
      }

      setMyStories(myData);
      setReceivedStories(receivedData);
    } catch (e) {
      console.error('Failed to fetch stories:', e);
      setMyStories([]);
      setReceivedStories([]);
    }
    setLoadingStories(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen space-y-6 pb-12">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-40 -mb-40 blur-3xl"></div>

          <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-12">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span className="text-white/90 text-sm font-semibold tracking-wide">
                Dashboard Overview
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
              {getGreeting()}, <br className="sm:hidden" />
              <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                {user?.name?.split(' ')[0] || 'there'}
              </span>
            </h1>

            <p className="text-white/95 text-base sm:text-lg max-w-2xl mb-8 leading-relaxed">
              Your memories are safe and encrypted. Continue preserving your
              most precious moments.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="group flex items-center justify-center gap-2.5 px-7 py-3.5 bg-white text-indigo-700 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span>Add Memory</span>
              </button>

              <button
                onClick={() => setShowStoryModal(true)}
                className="group flex items-center justify-center gap-2.5 px-7 py-3.5 bg-white/10 backdrop-blur-md text-white border-2 border-white/30 rounded-xl font-bold hover:bg-white/20 hover:border-white/50 transition-all duration-200"
              >
                <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Create Story</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <section>
          <StatsCards stats={safeStats} />
        </section>

        {/* Quick Actions Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/memories')}
            className="group relative overflow-hidden bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-indigo-200 hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <p className="text-sm text-gray-500 font-semibold mb-1">
                Total Memories
              </p>
              <p className="text-3xl font-black text-gray-900 mb-2">
                {safeStats.totalMemories}
              </p>
              <ArrowRight className="w-5 h-5 text-indigo-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button
            onClick={() => navigate('/quests')}
            className="group relative overflow-hidden bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-purple-200 hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <p className="text-sm text-gray-500 font-semibold mb-1">
                Active Quests
              </p>
              <p className="text-3xl font-black text-gray-900 mb-2">
                {safeStats.activeQuests}
              </p>
              <TrendingUp className="w-5 h-5 text-purple-600 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all" />
            </div>
          </button>

          <button
            onClick={() => navigate('/stories')}
            className="group relative overflow-hidden bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-pink-200 hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <p className="text-sm text-gray-500 font-semibold mb-1">
                Your Stories
              </p>
              <p className="text-3xl font-black text-gray-900 mb-2">
                {myStories.length}
              </p>
              <Heart className="w-5 h-5 text-pink-600 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            </div>
          </button>

          <button
            onClick={refresh}
            className="group relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-6 hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-200 hover:shadow-xl transition-all duration-300"
          >
            <div className="relative">
              <p className="text-sm text-gray-500 font-semibold mb-1">
                Last Sync
              </p>
              <p className="text-sm font-bold text-gray-700 mb-2">Just now</p>
              <RefreshCw
                className={`w-5 h-5 text-indigo-600 ${
                  loading ? 'animate-spin' : 'group-hover:rotate-180'
                } transition-all duration-500`}
              />
            </div>
          </button>
        </section>

        {/* Stories Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <BookmarkIcon />
                Your Stories
              </h2>
              <p className="text-gray-500 mt-1 font-medium">
                Time-locked memories for special moments
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Stories Card */}
            <div className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden hover:border-indigo-100 hover:shadow-2xl transition-all duration-300">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    My Stories
                  </h3>
                  <button
                    onClick={fetchStories}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-white ${
                        loadingStories ? 'animate-spin' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {loadingStories ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-gray-400 font-medium">
                      Loading stories...
                    </p>
                  </div>
                ) : myStories.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gradient-to-br from-gray-50 to-white">
                    <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-600 mb-1">
                      No stories yet
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      Create your first story to get started
                    </p>
                    <button
                      onClick={() => setShowStoryModal(true)}
                      className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 hover:scale-105 transition-all"
                    >
                      Create Story
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myStories.slice(0, 3).map((story) => {
                      const storyId = story._id || story.id;
                      const chapterCount =
                        story.totalChapters ||
                        story.chapters?.length ||
                        0;

                      return (
                        <button
                          key={storyId}
                          onClick={() => navigate(`/stories/${storyId}`)}
                          className="group w-full text-left p-4 rounded-2xl border-2 border-gray-100 bg-gradient-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-200 hover:shadow-lg transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors pr-2 flex-1 text-base">
                              {story.title}
                            </p>
                            <span
                              className={`flex-shrink-0 text-[10px] uppercase font-black px-3 py-1 rounded-full ${
                                story.status === 'active'
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : story.status === 'draft'
                                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                            >
                              {story.status || 'draft'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-gray-500 font-semibold">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {chapterCount} chapter
                                {chapterCount !== 1 ? 's' : ''}
                              </span>
                              {story.recipients?.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3.5 h-3.5 text-pink-400" />
                                  {story.recipients.length} recipient
                                  {story.recipients.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </button>
                      );
                    })}
                    {myStories.length > 3 && (
                      <button
                        onClick={() => navigate('/stories')}
                        className="w-full text-center py-3 text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors"
                      >
                        View all {myStories.length} stories →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Received Stories Card */}
            <div className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden hover:border-amber-100 hover:shadow-2xl transition-all duration-300">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Received Stories
                  </h3>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-xs font-black text-white">
                    <Lock className="w-3 h-3" />
                    <span>{receivedStories.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loadingStories ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-gray-400 font-medium">
                      Checking stories...
                    </p>
                  </div>
                ) : receivedStories.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gradient-to-br from-gray-50 to-white">
                    <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-600 mb-1">
                      No received stories
                    </p>
                    <p className="text-xs text-gray-400">
                      Stories shared with you will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedStories.slice(0, 3).map((story) => {
                      const storyId = story._id || story.id;
                      const progress = story.progress || {};
                      const progressPct =
                        progress.totalChapters > 0
                          ? Math.round(
                              ((progress.currentChapter || 0) /
                                progress.totalChapters) *
                                100
                            )
                          : 0;

                      return (
                        <button
                          key={storyId}
                          onClick={() => navigate(`/stories/${storyId}`)}
                          className="group w-full text-left p-4 rounded-2xl border-2 border-gray-100 bg-gradient-to-br from-white to-gray-50 hover:from-amber-50 hover:to-orange-50 hover:border-amber-200 hover:shadow-lg transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors pr-2 flex-1 text-base">
                              {story.title}
                            </p>
                            <span className="flex-shrink-0 text-xs font-black text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1 rounded-full">
                              {progressPct}%
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(progressPct, 2)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5" />
                              {progress.currentChapter || 0}/
                              {progress.totalChapters || '?'} unlocked
                            </p>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </button>
                      );
                    })}
                    {receivedStories.length > 3 && (
                      <button
                        onClick={() => navigate('/stories')}
                        className="w-full text-center py-3 text-sm font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
                      >
                        View all {receivedStories.length} stories →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
                Memory Timeline
              </h2>
              <p className="text-gray-500 mt-2 font-medium">
                Browse through your cherished moments
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories..."
                  className="w-full sm:w-80 h-12 pl-12 pr-4 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm hover:border-gray-300"
                />
              </form>
            </div>
          </div>

          {/* Category Filters */}
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Filter className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-sm font-black text-gray-700 uppercase tracking-wider">
                Filter by type
              </span>
            </div>

            <div className="flex overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-3 min-w-max">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => handleCategoryChange(cat.value)}
                      className={`flex-shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 border-2 ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 scale-105'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-shadow duration-300">
            <Timeline
              memories={memories}
              loading={loading}
              onMemoryClick={setSelectedMemory}
              onAddClick={() => setShowAddModal(true)}
            />
          </div>
        </section>

        {/* Modals */}
        <AddMemoryModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={createMemory}
        />
        <CreateStoryModal
          isOpen={showStoryModal}
          onClose={() => setShowStoryModal(false)}
          onCreated={fetchStories}
        />
        <MemoryDetailModal
          isOpen={!!selectedMemory}
          onClose={() => setSelectedMemory(null)}
          memory={selectedMemory}
          onDelete={deleteMemory}
          onVerify={verifyMemory}
        />
      </div>
    </DashboardLayout>
  );
};

const BookmarkIcon = () => (
  <svg
    className="w-6 h-6 text-indigo-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
    />
  </svg>
);

export default Dashboard;