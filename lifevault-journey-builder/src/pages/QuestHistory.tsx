/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { questAPI, badgeAPI } from '@/services/questApi';
import {
    Clock, CheckCircle2, XCircle, Trophy, Award,
    Loader2, ChevronRight, History, Medal, Target
} from 'lucide-react';

const QuestHistory: React.FC = () => {
    const navigate = useNavigate();
    const [completions, setCompletions] = useState<any[]>([]);
    const [badges, setBadges] = useState<any[]>([]); // Initialize as empty array
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'history' | 'badges'>('history');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch history
            let completionsData: any[] = [];
            try {
                const historyRes = await questAPI.getHistory({ limit: 50 });
                const rawCompletions = historyRes.data?.data?.completions || historyRes.data?.data || [];
                completionsData = Array.isArray(rawCompletions) ? rawCompletions : [];
            } catch (err) {
                console.error('Failed to fetch history:', err);
                completionsData = [];
            }

            // Fetch badges
            let badgesData: any[] = [];
            try {
                const badgesRes = await badgeAPI.getMyBadges();
                // Handle different response structures
                const rawBadges = badgesRes.data?.data?.badges ||
                    badgesRes.data?.data ||
                    badgesRes.data?.badges ||
                    badgesRes.data ||
                    [];
                badgesData = Array.isArray(rawBadges) ? rawBadges : [];
            } catch (err) {
                console.error('Failed to fetch badges:', err);
                badgesData = [];
            }

            setCompletions(completionsData);
            setBadges(badgesData);
        } catch (err) {
            console.error('Failed to load data:', err);
            setCompletions([]);
            setBadges([]);
        }
        setLoading(false);
    };

    // ALWAYS ensure these are arrays before using .filter() or .map()
    const safeCompletions: any[] = Array.isArray(completions) ? completions : [];
    const safeBadges: any[] = Array.isArray(badges) ? badges : [];

    const filteredCompletions = statusFilter === 'all'
        ? safeCompletions
        : safeCompletions.filter(c => c?.status === statusFilter);

    const completedCount = safeCompletions.filter(c => c?.status === 'completed').length;
    const failedCount = safeCompletions.filter(c => c?.status === 'failed').length;
    const totalPoints = safeCompletions
        .filter(c => c?.status === 'completed')
        .reduce((sum, c) => sum + (c?.rewardsEarned?.points || 0), 0);

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-50 border-green-200';
            case 'failed': return 'text-red-600 bg-red-50 border-red-200';
            case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'verifying': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
            default: return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    const getRarityStyles = (rarity?: string) => {
        switch (rarity?.toLowerCase()) {
            case 'legendary': return 'from-amber-400 to-orange-500';
            case 'epic': return 'from-purple-500 to-pink-500';
            case 'rare': return 'from-blue-500 to-cyan-500';
            default: return 'from-green-500 to-emerald-500';
        }
    };

    const getRarityTextColor = (rarity?: string) => {
        switch (rarity?.toLowerCase()) {
            case 'legendary': return 'text-amber-600';
            case 'epic': return 'text-purple-600';
            case 'rare': return 'text-blue-600';
            default: return 'text-green-600';
        }
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen space-y-6 pb-8">

                {/* Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-40 -mb-40 blur-3xl"></div>

                    <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
                        <div className="flex items-center gap-2 mb-3">
                            <History className="w-5 h-5 text-yellow-300" />
                            <span className="text-white/90 text-sm font-semibold tracking-wide">Quest History</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
                            Your Journey <br className="sm:hidden" />
                            <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                                So Far
                            </span>
                        </h1>

                        <p className="text-white/90 text-base sm:text-lg max-w-2xl leading-relaxed">
                            Track your quest completions and earned badges.
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-indigo-100 rounded-xl">
                                <Target className="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{safeCompletions.length}</p>
                        <p className="text-sm text-gray-500 font-medium">Total Attempts</p>
                    </div>

                    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-green-100 rounded-xl">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{completedCount}</p>
                        <p className="text-sm text-gray-500 font-medium">Completed</p>
                    </div>

                    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-red-100 rounded-xl">
                                <XCircle className="w-5 h-5 text-red-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{failedCount}</p>
                        <p className="text-sm text-gray-500 font-medium">Failed</p>
                    </div>

                    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-amber-100 rounded-xl">
                                <Trophy className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{totalPoints}</p>
                        <p className="text-sm text-gray-500 font-medium">Points Earned</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'history'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <History className="w-4 h-4" />
                        History
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'history' ? 'bg-white/20' : 'bg-gray-100'
                            }`}>
                            {safeCompletions.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('badges')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'badges'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Medal className="w-4 h-4" />
                        Badges
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'badges' ? 'bg-white/20' : 'bg-gray-100'
                            }`}>
                            {safeBadges.length}
                        </span>
                    </button>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading...</p>
                    </div>
                )}

                {/* History Tab */}
                {!loading && activeTab === 'history' && (
                    <div className="space-y-4">
                        {/* Status Filter */}
                        <div className="flex flex-wrap gap-2">
                            {['all', 'completed', 'failed', 'pending'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${statusFilter === status
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {/* Empty State */}
                        {filteredCompletions.length === 0 ? (
                            <div className="text-center py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <History className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">No quest history yet</h3>
                                <p className="text-gray-500 text-sm mb-4">Start completing quests to see your history</p>
                                <button
                                    onClick={() => navigate('/quests')}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
                                >
                                    Find Quests
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredCompletions.map((completion, index) => (
                                    <div
                                        key={completion?._id || `completion-${index}`}
                                        onClick={() => completion?.questId?._id && navigate(`/quests/${completion.questId._id}`)}
                                        className="group bg-white border-2 border-gray-100 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-gray-200 hover:shadow-lg transition-all"
                                    >
                                        {/* Status Icon */}
                                        <div className={`p-2.5 rounded-xl flex-shrink-0 ${completion?.status === 'completed' ? 'bg-green-100' :
                                            completion?.status === 'failed' ? 'bg-red-100' :
                                                completion?.status === 'pending' ? 'bg-amber-100' : 'bg-gray-100'
                                            }`}>
                                            {getStatusIcon(completion?.status)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 mb-1 truncate">
                                                {completion?.questId?.title || 'Unknown Quest'}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold capitalize border ${getStatusColor(completion?.status)}`}>
                                                    {completion?.status || 'unknown'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {completion?.createdAt ? new Date(completion.createdAt).toLocaleDateString() : 'Unknown date'}
                                                </span>
                                                {(completion?.rewardsEarned?.points || 0) > 0 && (
                                                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                                        <Trophy className="w-3 h-3" />
                                                        +{completion.rewardsEarned.points} pts
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Badges Tab */}
                {!loading && activeTab === 'badges' && (
                    <div>
                        {safeBadges.length === 0 ? (
                            <div className="text-center py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Medal className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">No badges earned yet</h3>
                                <p className="text-gray-500 text-sm">Complete quests to earn badges</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {safeBadges.map((badge, index) => (
                                    <div
                                        key={badge?._id || `badge-${index}`}
                                        className="group bg-white border-2 border-gray-100 rounded-2xl p-5 text-center hover:border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all"
                                    >
                                        {/* Badge Icon */}
                                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 bg-gradient-to-br ${getRarityStyles(badge?.rarity)} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                            {badge?.imageUrl ? (
                                                <img
                                                    src={badge.imageUrl}
                                                    alt={badge?.name || 'Badge'}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                    onError={(e) => {
                                                        // Fallback if image fails to load
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <Award className="w-8 h-8 text-white" />
                                            )}
                                        </div>

                                        {/* Badge Info */}
                                        <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">
                                            {badge?.name || 'Unknown Badge'}
                                        </h3>
                                        <span className={`text-xs font-bold uppercase ${getRarityTextColor(badge?.rarity)}`}>
                                            {badge?.rarity || 'common'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default QuestHistory;