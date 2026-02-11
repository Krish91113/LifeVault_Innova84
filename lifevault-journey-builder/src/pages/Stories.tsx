/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateStoryModal } from '@/components/story/CreateStoryModal';
import { storyAPI } from '@/services/questApi';
import {
  Heart,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  Clock,
  MapPin,
  ChevronRight,
  Search,
  Inbox,
  Send,
  Eye,
  Loader2,
  Sparkles,
  ArrowLeft,
  Calendar,
  Users,
  Filter,
  X,
  AlertCircle,
  CheckCircle,
  Navigation,
  Image as ImageIcon,
} from 'lucide-react';

type Tab = 'my-stories' | 'received';

// ── Universal extractor (same as Dashboard) ──
function extractStoriesArray(res: any): any[] {
  const axiosData = res?.data;
  if (!axiosData) return [];
  if (Array.isArray(axiosData)) return axiosData;
  const innerData = axiosData.data;
  if (Array.isArray(innerData)) return innerData;
  if (innerData?.stories && Array.isArray(innerData.stories)) return innerData.stories;
  if (axiosData.stories && Array.isArray(axiosData.stories)) return axiosData.stories;
  if (innerData && typeof innerData === 'object') {
    for (const key of Object.keys(innerData)) {
      if (Array.isArray(innerData[key])) return innerData[key];
    }
  }
  return [];
}

// ── Haversine distance ──
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const Stories: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('my-stories');
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any | null>(null);

  // Search / filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Unlock state
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Search by code
  const [searchCode, setSearchCode] = useState('');
  const [searchCodeLoading, setSearchCodeLoading] = useState(false);
  const [searchCodeError, setSearchCodeError] = useState<string | null>(null);

  // ── Fetch stories ──
  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        tab === 'my-stories'
          ? await storyAPI.getMyStories()
          : await storyAPI.getReceived();

      const data = extractStoriesArray(res);
      console.log(`📖 ${tab} loaded:`, data.length);
      setStories(data);
    } catch (err: any) {
      console.error('Fetch stories error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load stories');
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // ── Filter & search ──
  const filteredStories = stories.filter((story) => {
    // Status filter
    if (statusFilter !== 'all' && story.status !== statusFilter) return false;
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = story.title?.toLowerCase().includes(q);
      const descMatch = story.description?.toLowerCase().includes(q);
      const codeMatch = story.shortCode?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !codeMatch) return false;
    }
    return true;
  });

  // ── Search by code ──
  const handleSearchByCode = async () => {
    if (!searchCode.trim()) return;
    setSearchCodeLoading(true);
    setSearchCodeError(null);
    try {
      const res = await storyAPI.getByCode(searchCode.trim());
      const story =
        res.data?.data?.story || res.data?.data || res.data?.story || res.data;
      if (story && (story._id || story.id)) {
        setSelectedStory(story);
      } else {
        setSearchCodeError('Story not found with that code.');
      }
    } catch (err: any) {
      setSearchCodeError(
        err.response?.data?.message || 'Story not found.'
      );
    } finally {
      setSearchCodeLoading(false);
    }
  };

  // ── Get current location ──
  const getCurrentLocation = (): Promise<{ lat: number; lon: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserLocation(loc);
          resolve(loc);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

  // ── Unlock a chapter ──
  const handleUnlockChapter = async (story: any, chapter: any) => {
    const storyId = story._id || story.id;
    if (!storyId) return;

    setUnlocking(true);
    setUnlockError(null);
    setUnlockSuccess(false);

    try {
      // Pre-check time
      const timeCond = chapter.unlockConditions?.time;
      if (timeCond?.enabled && timeCond?.unlockAt) {
        if (new Date() < new Date(timeCond.unlockAt)) {
          throw new Error(
            `Too early! Unlocks on ${new Date(timeCond.unlockAt).toLocaleString()}.`
          );
        }
      }

      // Pre-check location
      let locationPayload: { latitude?: number; longitude?: number } = {};
      const locCond = chapter.unlockConditions?.location;

      if (locCond?.enabled) {
        let loc = userLocation;
        if (!loc) {
          try {
            loc = await getCurrentLocation();
          } catch {
            throw new Error('Location required. Please enable GPS.');
          }
        }

        if (locCond.coordinates?.coordinates) {
          const [targetLon, targetLat] = locCond.coordinates.coordinates;
          const dist = getDistanceMeters(loc.lat, loc.lon, targetLat, targetLon);
          const radius = locCond.radiusMeters || 80;
          if (dist > radius) {
            throw new Error(
              `You're ${Math.round(dist)}m away. Need to be within ${radius}m of "${locCond.name || 'the location'}".`
            );
          }
        }
        locationPayload = { latitude: loc.lat, longitude: loc.lon };
      }

      const chapterNum = chapter.chapterNumber || chapter.order || 1;
      await storyAPI.unlockChapter(storyId, chapterNum, locationPayload);

      setUnlockSuccess(true);

      // Refresh the story data
      try {
        const freshRes = await storyAPI.getOne(storyId);
        const freshStory =
          freshRes.data?.data?.story || freshRes.data?.data || freshRes.data;
        if (freshStory) {
          setSelectedStory(freshStory);
          // Also update in list
          setStories((prev) =>
            prev.map((s) =>
              (s._id || s.id) === storyId ? { ...s, ...freshStory } : s
            )
          );
        }
      } catch {
        // Refresh list instead
        fetchStories();
      }
    } catch (err: any) {
      setUnlockError(
        err.response?.data?.message || err.message || 'Unlock failed.'
      );
    } finally {
      setUnlocking(false);
    }
  };

  // ── Format helpers ──
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatTimeRemaining = (dateStr: string): string => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return 'Ready now';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  // ── Check grace period ──
  const isInGracePeriod = (story: any): boolean => {
    try {
      const graceList = JSON.parse(localStorage.getItem('storyGracePeriods') || '[]');
      const entry = graceList.find((g: any) => g.storyId === (story._id || story.id));
      if (entry && new Date() < new Date(entry.creatorAccessUntil)) return true;
    } catch { /* ignore */ }

    const until = story.settings?.creatorAccessUntil;
    if (until && new Date() < new Date(until)) return true;
    return false;
  };

  const getGracePreview = (storyId: string): string | null => {
    try {
      const graceList = JSON.parse(localStorage.getItem('storyGracePeriods') || '[]');
      const entry = graceList.find((g: any) => g.storyId === storyId);
      if (entry && new Date() < new Date(entry.creatorAccessUntil)) {
        return entry.previewBase64;
      }
    } catch { /* ignore */ }
    return null;
  };

  const isCreator = (story: any) => {
    const creatorId = story.creator?._id || story.creator?.id || story.creatorId?._id || story.creatorId;
    const userId = user?.id || user?._id;
    return creatorId && userId && creatorId.toString() === userId.toString();
  };

  // ── Story Detail View ──
  const renderStoryDetail = () => {
    if (!selectedStory) return null;

    const storyId = selectedStory._id || selectedStory.id;
    const chapters = selectedStory.chapters || [];
    const creator = isCreator(selectedStory);
    const gracePeriod = creator && isInGracePeriod(selectedStory);
    const gracePreview = storyId ? getGracePreview(storyId) : null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setSelectedStory(null);
            setUnlockError(null);
            setUnlockSuccess(false);
          }}
        />

        <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-pink-100 rounded-xl shrink-0">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-gray-900 truncate">
                  {selectedStory.title}
                </h2>
                {selectedStory.shortCode && (
                  <p className="text-xs text-gray-400 font-mono">
                    Code: {selectedStory.shortCode}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedStory(null);
                setUnlockError(null);
                setUnlockSuccess(false);
              }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Description */}
            {selectedStory.description && (
              <p className="text-gray-600 text-sm leading-relaxed">
                {selectedStory.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap gap-3">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  selectedStory.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {selectedStory.status || 'draft'}
              </span>
              {creator && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700">
                  You created this
                </span>
              )}
              {gracePeriod && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Preview active
                </span>
              )}
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Recipients */}
            {creator && selectedStory.recipients?.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Recipients
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedStory.recipients.map((r: any, i: number) => (
                    <span
                      key={i}
                      className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-700"
                    >
                      {r.email || r.name || 'Unknown'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts */}
            {unlockError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{unlockError}</span>
              </div>
            )}

            {unlockSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Chapter unlocked successfully!
              </div>
            )}

            {/* Chapters */}
            {chapters.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">
                  Chapters
                </h3>

                {chapters.map((chapter: any, idx: number) => {
                  const isUnlocked = chapter.isUnlocked;
                  const timeCond = chapter.unlockConditions?.time;
                  const locCond = chapter.unlockConditions?.location;
                  const timeReady =
                    !timeCond?.enabled ||
                    !timeCond?.unlockAt ||
                    new Date() >= new Date(timeCond.unlockAt);

                  const showGraceContent =
                    !isUnlocked && creator && gracePeriod && gracePreview;

                  return (
                    <div
                      key={chapter._id || idx}
                      className={`rounded-2xl border-2 overflow-hidden transition-all ${
                        isUnlocked
                          ? 'border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/30'
                          : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white'
                      }`}
                    >
                      {/* Chapter header */}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              isUnlocked
                                ? 'bg-green-100'
                                : 'bg-orange-100'
                            }`}
                          >
                            {isUnlocked ? (
                              <Unlock className="w-4 h-4 text-green-600" />
                            ) : (
                              <Lock className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">
                              {chapter.title || `Chapter ${idx + 1}`}
                            </p>
                            {chapter.subtitle && (
                              <p className="text-xs text-gray-500">
                                {chapter.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${
                            isUnlocked
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {isUnlocked ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>

                      {/* Unlocked content */}
                      {isUnlocked && chapter.content && (
                        <div className="px-4 pb-4">
                          {(chapter.content.mediaUrl || chapter.content.mediaData) && (
                            <img
                              src={chapter.content.mediaUrl || chapter.content.mediaData}
                              alt={chapter.title}
                              className="w-full h-56 object-cover rounded-xl mb-3 shadow-sm"
                            />
                          )}
                          {chapter.content.caption && (
                            <p className="text-gray-600 text-sm italic bg-white/50 p-3 rounded-lg border border-gray-100">
                              "{chapter.content.caption}"
                            </p>
                          )}
                          {chapter.unlockedAt && (
                            <p className="text-xs text-gray-400 mt-2">
                              Unlocked {formatDateTime(chapter.unlockedAt)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Grace period preview */}
                      {showGraceContent && (
                        <div className="px-4 pb-4">
                          <div className="relative">
                            <img
                              src={gracePreview!}
                              alt="Creator preview"
                              className="w-full h-56 object-cover rounded-xl shadow-sm"
                            />
                            <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                              Creator preview
                            </div>
                          </div>
                          <p className="text-xs text-blue-600 mt-2 font-medium">
                            Only you can see this during the grace period.
                          </p>
                        </div>
                      )}

                      {/* Lock conditions + unlock button */}
                      {!isUnlocked && (
                        <div className="px-4 pb-4 space-y-3">
                          {/* Time condition */}
                          {timeCond?.enabled && timeCond?.unlockAt && (
                            <div
                              className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                                timeReady
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-orange-50 text-orange-700 border border-orange-200'
                              }`}
                            >
                              <Clock className="w-4 h-4 shrink-0" />
                              <div>
                                <p className="font-bold">
                                  {timeReady ? '✓ Time ready' : 'Unlocks on'}
                                </p>
                                <p className="text-xs mt-0.5">
                                  {formatDateTime(timeCond.unlockAt)}
                                </p>
                                {!timeReady && (
                                  <p className="text-xs font-medium mt-0.5">
                                    {formatTimeRemaining(timeCond.unlockAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Location condition */}
                          {locCond?.enabled && (
                            <div className="flex items-center gap-3 p-3 rounded-xl text-sm bg-blue-50 text-blue-700 border border-blue-200">
                              <MapPin className="w-4 h-4 shrink-0" />
                              <div>
                                <p className="font-bold">
                                  {locCond.name || 'Geo-locked location'}
                                </p>
                                <p className="text-xs mt-0.5">
                                  Must be within {locCond.radiusMeters || 80}m
                                </p>
                                {locCond.coordinates?.coordinates && (
                                  <p className="text-xs text-blue-500 mt-0.5 font-mono">
                                    📍{' '}
                                    {locCond.coordinates.coordinates[1]?.toFixed(4)},{' '}
                                    {locCond.coordinates.coordinates[0]?.toFixed(4)}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Hint */}
                          {chapter.hint?.text && (
                            <p className="text-xs text-gray-500 italic px-1">
                              💡 {chapter.hint.text}
                            </p>
                          )}

                          {/* Unlock button */}
                          <button
                            onClick={() => handleUnlockChapter(selectedStory, chapter)}
                            disabled={unlocking || !timeReady}
                            className={`w-full py-3.5 rounded-xl text-sm font-bold
                              flex items-center justify-center gap-2 transition-all duration-200
                              ${
                                timeReady
                                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl hover:scale-[1.02]'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              } disabled:opacity-50 disabled:hover:scale-100`}
                          >
                            {unlocking ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Checking conditions…
                              </>
                            ) : timeReady ? (
                              <>
                                <Unlock className="w-4 h-4" />
                                Attempt Unlock
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4" />
                                {formatTimeRemaining(timeCond!.unlockAt!)}
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No chapters yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-4 flex justify-end">
            <button
              onClick={() => {
                setSelectedStory(null);
                setUnlockError(null);
                setUnlockSuccess(false);
              }}
              className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen space-y-6 pb-12">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-pink-600 via-rose-600 to-orange-500 rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-40 -mb-40 blur-3xl"></div>

          <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-12">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span className="text-white/90 text-sm font-semibold tracking-wide">
                Stories
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              Your{' '}
              <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                Stories
              </span>
            </h1>
            <p className="text-white/90 text-base max-w-2xl mb-6">
              Create time-locked and geo-locked memories. Share them with people
              who matter most.
            </p>

            <button
              onClick={() => setShowCreateModal(true)}
              className="group flex items-center gap-2.5 px-7 py-3.5 bg-white text-pink-700 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              Create New Story
            </button>
          </div>
        </div>

        {/* Search by code */}
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            Open a story by code
          </p>
          <div className="flex gap-3">
            <input
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium
                         focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400
                         placeholder:text-gray-400 uppercase tracking-wider"
              placeholder="Enter story code..."
              value={searchCode}
              onChange={(e) => {
                setSearchCode(e.target.value.toUpperCase());
                setSearchCodeError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchByCode()}
            />
            <button
              onClick={handleSearchByCode}
              disabled={searchCodeLoading || !searchCode.trim()}
              className="px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl
                         text-sm font-bold hover:from-pink-700 hover:to-rose-700
                         disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
            >
              {searchCodeLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Open'
              )}
            </button>
          </div>
          {searchCodeError && (
            <p className="text-red-500 text-xs mt-2 font-medium">
              {searchCodeError}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setTab('my-stories')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm
                        font-bold transition-all duration-200 ${
                          tab === 'my-stories'
                            ? 'bg-white text-gray-900 shadow-md'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
          >
            <Send className="w-4 h-4" />
            My Stories
            {tab === 'my-stories' && stories.length > 0 && (
              <span className="bg-pink-100 text-pink-700 text-xs font-black px-2 py-0.5 rounded-full">
                {stories.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('received')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm
                        font-bold transition-all duration-200 ${
                          tab === 'received'
                            ? 'bg-white text-gray-900 shadow-md'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
          >
            <Inbox className="w-4 h-4" />
            Received
            {tab === 'received' && stories.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-full">
                {stories.length}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm
                         font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/30
                         focus:border-pink-400 placeholder:text-gray-400"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium
                         focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400
                         bg-white"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            <button
              onClick={fetchStories}
              disabled={loading}
              className="p-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50
                         transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-gray-400 font-medium">Loading stories…</p>
          </div>
        )}

        {/* Stories grid */}
        {!loading && filteredStories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStories.map((story) => {
              const storyId = story._id || story.id;
              const chapters = story.chapters || [];
              const unlockedCount = chapters.filter((c: any) => c.isUnlocked).length;
              const totalChapters = story.totalChapters || chapters.length || 0;
              const firstChapter = chapters[0];
              const timeCond = firstChapter?.unlockConditions?.time;
              const locCond = firstChapter?.unlockConditions?.location;

              const progress = story.progress;
              const progressPct =
                progress?.totalChapters > 0
                  ? Math.round(
                      ((progress.currentChapter || 0) / progress.totalChapters) * 100
                    )
                  : totalChapters > 0
                    ? Math.round((unlockedCount / totalChapters) * 100)
                    : 0;

              const creator = isCreator(story);
              const grace = creator && isInGracePeriod(story);

              return (
                <button
                  key={storyId}
                  onClick={() => setSelectedStory(story)}
                  className="group w-full text-left bg-white border-2 border-gray-100 rounded-2xl
                             overflow-hidden hover:border-pink-200 hover:shadow-xl
                             transition-all duration-300"
                >
                  {/* Color bar */}
                  <div
                    className={`h-1.5 ${
                      unlockedCount === totalChapters && totalChapters > 0
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-pink-500 to-orange-500'
                    }`}
                    style={{
                      width: `${Math.max(progressPct, 3)}%`,
                    }}
                  />

                  <div className="p-5">
                    {/* Title row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Heart className="w-4 h-4 text-pink-500 shrink-0" />
                        <h3 className="font-bold text-gray-900 group-hover:text-pink-700 transition-colors truncate">
                          {story.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {grace && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            PREVIEW
                          </span>
                        )}
                        <span
                          className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${
                            story.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {story.status || 'draft'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {story.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                        {story.description}
                      </p>
                    )}

                    {/* Conditions badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {timeCond?.enabled && timeCond?.unlockAt && (
                        <span
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${
                            new Date() >= new Date(timeCond.unlockAt)
                              ? 'bg-green-50 text-green-600 border border-green-200'
                              : 'bg-orange-50 text-orange-600 border border-orange-200'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {new Date() >= new Date(timeCond.unlockAt)
                            ? 'Time ✓'
                            : formatDate(timeCond.unlockAt)}
                        </span>
                      )}
                      {locCond?.enabled && (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                          <MapPin className="w-3 h-3" />
                          {locCond.name || 'Geo-locked'}{' '}
                          ({locCond.radiusMeters || 80}m)
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-xs text-gray-400 font-semibold">
                        <span className="flex items-center gap-1">
                          {unlockedCount === totalChapters && totalChapters > 0 ? (
                            <Unlock className="w-3 h-3 text-green-500" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          {unlockedCount}/{totalChapters} unlocked
                        </span>
                        {story.recipients?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {story.recipients.length}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-pink-600 group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* Short code */}
                    {story.shortCode && (
                      <p className="text-[10px] text-gray-300 font-mono mt-2">
                        {story.shortCode}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredStories.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <Heart className="w-10 h-10 text-pink-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">
              {searchQuery || statusFilter !== 'all'
                ? 'No stories match your filters'
                : tab === 'my-stories'
                  ? 'No stories created yet'
                  : 'No stories received yet'}
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
              {tab === 'my-stories'
                ? 'Create your first time-locked story and share it with someone special.'
                : 'When someone shares a story with you, it will appear here.'}
            </p>
            {tab === 'my-stories' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm
                           font-bold rounded-xl hover:from-pink-700 hover:to-rose-700
                           shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                Create Your First Story
              </button>
            )}
          </div>
        )}

        {/* Story detail modal */}
        {selectedStory && renderStoryDetail()}

        {/* Create story modal */}
        <CreateStoryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            fetchStories();
            setShowCreateModal(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default Stories;