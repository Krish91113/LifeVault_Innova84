/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { questAPI } from '@/services/questApi';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Filter, ChevronRight, Loader2, Crosshair, Trophy, Zap, Target, Map } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Fix leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom quest marker icons
const createQuestIcon = (category: string, difficulty: string) => {
    const colors: Record<string, string> = {
        adventure: '#f59e0b',
        food: '#ef4444',
        culture: '#8b5cf6',
        shopping: '#3b82f6',
        nature: '#22c55e',
        entertainment: '#ec4899',
        sports: '#f97316',
        education: '#06b6d4',
        other: '#6b7280',
    };
    const color = colors[category || 'other'] || colors.other;
    const safeDifficulty = difficulty || 'easy';

    return L.divIcon({
        className: 'custom-quest-marker',
        html: `<div style="
      width: 40px; height: 40px; 
      background: ${color}; 
      border: 3px solid white; 
      border-radius: 50% 50% 50% 0; 
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    ">
      <span style="transform: rotate(45deg); color: white; font-size: 14px; font-weight: bold;">
        ${safeDifficulty === 'easy' ? '★' : safeDifficulty === 'medium' ? '★★' : '★★★'}
      </span>
    </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
    });
};

// User location icon
const userIcon = L.divIcon({
    className: 'user-location-marker',
    html: `<div style="
    width: 20px; height: 20px; 
    background: #3b82f6; 
    border: 4px solid white; 
    border-radius: 50%; 
    box-shadow: 0 0 0 8px rgba(59,130,246,0.25), 0 4px 12px rgba(0,0,0,0.3);
  "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// Recenter map component
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        if (map && lat && lng) {
            map.setView([lat, lng], 14);
        }
    }, [lat, lng, map]);
    return null;
}

interface Quest {
    _id: string;
    title: string;
    description: string;
    questType: string;
    category: string;
    difficulty: string;
    status: string;
    location?: {
        name?: string;
        address?: string;
        coordinates?: {
            type: string;
            coordinates: [number, number];
        };
        radiusMeters?: number;
    };
    rewards?: {
        aptAmount?: number;
        points?: number;
    };
    stats?: {
        totalCompletions: number;
        totalAttempts: number;
    };
    coverImage?: string;
    tags?: string[];
    creatorId?: any;
    userCompleted?: boolean;
}

const CATEGORIES = [
    { value: 'all', label: 'All', emoji: '🗺️' },
    { value: 'adventure', label: 'Adventure', emoji: '🏔️' },
    { value: 'food', label: 'Food', emoji: '🍕' },
    { value: 'culture', label: 'Culture', emoji: '🏛️' },
    { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
    { value: 'nature', label: 'Nature', emoji: '🌿' },
    { value: 'entertainment', label: 'Fun', emoji: '🎯' },
    { value: 'sports', label: 'Sports', emoji: '⚽' },
    { value: 'education', label: 'Learn', emoji: '📚' },
];

const DIFFICULTIES = [
    { value: 'all', label: 'All Levels' },
    { value: 'easy', label: '⭐ Easy' },
    { value: 'medium', label: '⭐⭐ Medium' },
    { value: 'hard', label: '⭐⭐⭐ Hard' },
];

const QuestMap: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeDifficulty, setActiveDifficulty] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 20.5937, lng: 78.9629 });
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<any>(null);

    // Get user location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(loc);
                    setMapCenter(loc);
                },
                () => {
                    console.warn('Location access denied, using default');
                },
                { enableHighAccuracy: true }
            );
        }
    }, []);

    // Fetch quests
    useEffect(() => {
        fetchQuests();
    }, [activeCategory, activeDifficulty]);

    const fetchQuests = async () => {
        setLoading(true);
        try {
            const params: any = { status: 'all', limit: 100 };
            if (activeCategory !== 'all') params.category = activeCategory;
            if (activeDifficulty !== 'all') params.difficulty = activeDifficulty;
            if (searchQuery) params.search = searchQuery;

            const res = await questAPI.getAll(params);
            const data = res.data?.data?.quests || res.data?.data || [];
            setQuests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch quests:', err);
            setQuests([]);
        }
        setLoading(false);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchQuests();
    };

    const questsWithLocation = quests.filter(
        (q) => q.location?.coordinates?.coordinates?.length === 2
    );

    const questsListView = quests;

    // Safe helper functions with null checks
    const getDifficultyColor = (d?: string) => {
        switch (d?.toLowerCase()) {
            case 'easy': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            case 'expert': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    const getDifficultyLabel = (d?: string) => {
        return d?.toUpperCase() || 'UNKNOWN';
    };

    const getCategoryEmoji = (category?: string) => {
        return CATEGORIES.find(c => c.value === category)?.emoji || '🗺️';
    };

    const centerOnUser = () => {
        if (userLocation) {
            setMapCenter({ ...userLocation });
        }
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen space-y-6 pb-8">

                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl shadow-2xl">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-40 -mb-40 blur-3xl"></div>

                    <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
                        <div className="flex items-center gap-2 mb-3">
                            <Map className="w-5 h-5 text-yellow-300" />
                            <span className="text-white/90 text-sm font-semibold tracking-wide">Quest Explorer</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
                            Discover Quests <br className="sm:hidden" />
                            <span className="bg-gradient-to-r from-yellow-200 to-emerald-200 bg-clip-text text-transparent">
                                Near You
                            </span>
                        </h1>

                        <p className="text-white/90 text-base sm:text-lg max-w-2xl leading-relaxed">
                            Explore exciting quests in your area, complete challenges, and earn rewards.
                        </p>
                    </div>
                </div>

                {/* Level Progress Card */}
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700/50">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Level Info */}
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                    <span className="text-2xl sm:text-3xl font-black text-white">
                                        {user?.level?.current || 1}
                                    </span>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-gray-900">
                                    <Zap className="w-3 h-3 text-gray-900" />
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wider">Your Level</p>
                                <p className="text-white text-xl sm:text-2xl font-bold mt-0.5">
                                    Level {user?.level?.current || 1}
                                </p>
                                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                                    {user?.questStats?.totalCompleted || 0} quests completed
                                </p>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mx-auto mb-1" />
                                <p className="text-white font-bold text-lg sm:text-xl">{user?.points?.current || 0}</p>
                                <p className="text-gray-400 text-[10px] sm:text-xs font-medium">Points</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mx-auto mb-1" />
                                <p className="text-white font-bold text-lg sm:text-xl">{user?.questStats?.totalCompleted || 0}</p>
                                <p className="text-gray-400 text-[10px] sm:text-xs font-medium">Completed</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mx-auto mb-1" />
                                <p className="text-white font-bold text-lg sm:text-xl">{user?.level?.xp || 0}</p>
                                <p className="text-gray-400 text-[10px] sm:text-xs font-medium">XP</p>
                            </div>
                        </div>

                        {/* XP Progress */}
                        <div className="lg:min-w-[220px]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">XP Progress</span>
                                <span className="text-white text-sm font-bold">
                                    {Math.round(((user?.level?.xp || 0) / (user?.level?.xpToNextLevel || 100)) * 100)}%
                                </span>
                            </div>
                            <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.round(((user?.level?.xp || 0) / (user?.level?.xpToNextLevel || 100)) * 100))}%` }}
                                />
                            </div>
                            <p className="text-gray-400 text-xs mt-2">
                                {user?.level?.xp || 0} / {user?.level?.xpToNextLevel || 100} XP to next level
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex-1">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search quests by name, location..."
                                    className="w-full h-12 pl-12 pr-4 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm hover:border-gray-300"
                                />
                            </div>
                        </form>

                        {/* Filter Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center justify-center gap-2 px-5 h-12 rounded-xl font-semibold text-sm transition-all border-2 ${showFilters
                                    ? 'bg-gray-900 text-white border-gray-900 shadow-lg'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                <span className="hidden sm:inline">Filters</span>
                            </button>

                            {userLocation && (
                                <button
                                    onClick={centerOnUser}
                                    className="flex items-center justify-center gap-2 px-5 h-12 bg-white text-emerald-600 border-2 border-emerald-200 rounded-xl font-semibold text-sm hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                                >
                                    <Crosshair className="w-4 h-4" />
                                    <span className="hidden sm:inline">My Location</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Expanded Filters */}
                    {showFilters && (
                        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                            {/* Categories */}
                            <div className="mb-5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.value}
                                            onClick={() => setActiveCategory(cat.value)}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${activeCategory === cat.value
                                                ? 'bg-gray-900 text-white border-gray-900 shadow-md scale-105'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {cat.emoji} {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Difficulty */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Difficulty</label>
                                <div className="flex flex-wrap gap-2">
                                    {DIFFICULTIES.map((d) => (
                                        <button
                                            key={d.value}
                                            onClick={() => setActiveDifficulty(d.value)}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${activeDifficulty === d.value
                                                ? 'bg-gray-900 text-white border-gray-900 shadow-md scale-105'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Map Container */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg bg-white">
                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 z-[1000] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-600 font-medium">Loading quests...</p>
                        </div>
                    )}

                    {/* Map */}
                    <MapContainer
                        center={[mapCenter.lat, mapCenter.lng]}
                        zoom={13}
                        style={{ height: '450px', width: '100%' }}
                        ref={mapRef}
                        className="z-0"
                        whenReady={() => setMapReady(true)}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {mapReady && <RecenterMap lat={mapCenter.lat} lng={mapCenter.lng} />}

                        {/* User location */}
                        {userLocation && mapReady && (
                            <>
                                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                                    <Popup>
                                        <div className="text-center p-2">
                                            <p className="font-bold text-gray-900">📍 You are here</p>
                                        </div>
                                    </Popup>
                                </Marker>
                                <Circle
                                    center={[userLocation.lat, userLocation.lng]}
                                    radius={200}
                                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2 }}
                                />
                            </>
                        )}

                        {/* Quest markers */}
                        {mapReady && questsWithLocation.map((quest) => {
                            const [lng, lat] = quest.location!.coordinates!.coordinates;
                            return (
                                <Marker
                                    key={quest._id}
                                    position={[lat, lng]}
                                    icon={createQuestIcon(quest.category || 'other', quest.difficulty || 'easy')}
                                    eventHandlers={{
                                        click: () => setSelectedQuest(quest),
                                    }}
                                >
                                    <Popup>
                                        <div className="min-w-[220px] p-1">
                                            <h3 className="font-bold text-gray-900 text-base mb-1">{quest.title || 'Untitled Quest'}</h3>
                                            <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                                                {quest.description?.substring(0, 80) || 'No description'}...
                                            </p>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <span
                                                    className="px-2 py-1 rounded-lg text-[10px] font-bold border"
                                                    style={{
                                                        backgroundColor: getDifficultyColor(quest.difficulty) + '20',
                                                        color: getDifficultyColor(quest.difficulty),
                                                        borderColor: getDifficultyColor(quest.difficulty) + '40'
                                                    }}
                                                >
                                                    {getDifficultyLabel(quest.difficulty)}
                                                </span>
                                                <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                                    {quest.category || 'other'}
                                                </span>
                                            </div>
                                            {quest.rewards?.points && (
                                                <div className="flex items-center gap-1 text-amber-600 font-bold text-sm mb-3">
                                                    <Trophy className="w-4 h-4" />
                                                    {quest.rewards.points} pts
                                                    {quest.rewards.aptAmount ? ` + ${quest.rewards.aptAmount} APT` : ''}
                                                </div>
                                            )}
                                            <button
                                                onClick={() => navigate(`/quests/${quest._id}`)}
                                                className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black transition-colors"
                                            >
                                                View Quest →
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>

                    {/* Map Stats Overlay */}
                    <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-200">
                        <p className="text-sm font-semibold text-gray-900">
                            {questsWithLocation.length} quests on map
                        </p>
                    </div>
                </div>

                {/* Quest List Section */}
                <div className="space-y-5">
                    {/* Section Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900">
                                Available Quests ({questsListView.length})
                            </h2>
                            <p className="text-gray-500 font-medium mt-1">
                                Tap a quest to view details and start your adventure
                            </p>
                        </div>
                    </div>

                    {/* Empty State */}
                    {questsListView.length === 0 && !loading ? (
                        <div className="text-center py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No quests found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">
                                Try changing your filters or search query to discover more quests
                            </p>
                        </div>
                    ) : (
                        /* Quest Cards Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                            {questsListView.map((quest) => (
                                <div
                                    key={quest._id}
                                    onClick={() => navigate(`/quests/${quest._id}`)}
                                    className="group bg-white border-2 border-gray-100 rounded-2xl overflow-hidden cursor-pointer hover:border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                >
                                    {/* Card Header */}
                                    <div
                                        className="h-24 sm:h-28 flex items-center justify-center relative"
                                        style={{
                                            background: `linear-gradient(135deg, ${getDifficultyColor(quest.difficulty)}25, ${getDifficultyColor(quest.difficulty)}10)`
                                        }}
                                    >
                                        <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-300">
                                            {getCategoryEmoji(quest.category)}
                                        </span>

                                        {/* Completed Badge */}
                                        {quest.userCompleted && (
                                            <div className="absolute top-3 right-3 px-2.5 py-1 bg-green-500 text-white rounded-lg text-[10px] font-bold shadow-sm">
                                                ✓ DONE
                                            </div>
                                        )}

                                        {/* Difficulty Badge */}
                                        <div
                                            className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm"
                                            style={{ backgroundColor: getDifficultyColor(quest.difficulty) }}
                                        >
                                            {getDifficultyLabel(quest.difficulty)}
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4 sm:p-5">
                                        <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                            {quest.title || 'Untitled Quest'}
                                        </h3>
                                        <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                                            {quest.description?.substring(0, 80) || 'No description available'}{quest.description && quest.description.length > 80 ? '...' : ''}
                                        </p>

                                        {/* Card Footer */}
                                        <div className="flex items-center justify-between">
                                            {quest.location?.name ? (
                                                <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium truncate max-w-[60%]">
                                                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                                    <span className="truncate">{quest.location.name}</span>
                                                </span>
                                            ) : (
                                                <span></span>
                                            )}
                                            <div className="flex items-center gap-2">
                                                {quest.rewards?.points && (
                                                    <span className="flex items-center gap-1 text-amber-600 font-bold text-sm">
                                                        <Trophy className="w-4 h-4" />
                                                        {quest.rewards.points}
                                                    </span>
                                                )}
                                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default QuestMap;