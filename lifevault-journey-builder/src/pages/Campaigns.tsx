/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { campaignAPI } from '@/services/questApi';
import {
    Trophy, Users, ChevronRight, Loader2, Target, Gift, Zap,
    CheckCircle2, Clock, Sparkles
} from 'lucide-react';

interface Campaign {
    _id: string;
    name: string;
    description?: string;
    brandName?: string;
    coverImage?: string;
    status: string;
    rewards?: {
        grandPrize?: {
            aptAmount?: number;
            description?: string;
        };
    };
    quests?: any[];
    questCount?: number;
    stats?: {
        totalParticipants?: number;
        totalCompletions?: number;
    };
    userProgress?: {
        completedQuests?: number;
        totalQuests?: number;
        isCompleted?: boolean;
    };
}

const Campaigns: React.FC = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [joinedCampaigns, setJoinedCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'discover' | 'joined'>('discover');
    const [joiningId, setJoiningId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allRes, joinedRes] = await Promise.all([
                campaignAPI.getAll(),
                campaignAPI.getJoined().catch(() => ({ data: { data: [] } }))
            ]);
            setCampaigns(allRes.data?.data?.campaigns || allRes.data?.data || []);
            setJoinedCampaigns(joinedRes.data?.data?.campaigns || joinedRes.data?.data || []);
        } catch (err) {
            console.error('Failed to load campaigns:', err);
        }
        setLoading(false);
    };

    const handleJoin = async (campaignId: string) => {
        setJoiningId(campaignId);
        try {
            await campaignAPI.join(campaignId);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to join campaign');
        }
        setJoiningId(null);
    };

    const handleCheckCompletion = async (campaignId: string) => {
        try {
            const res = await campaignAPI.checkCompletion(campaignId);
            if (res.data?.data?.isCompleted) {
                alert('Congratulations! You have completed all quests in this campaign!');
                fetchData();
            } else {
                alert(`You've completed ${res.data?.data?.completedQuests || 0} / ${res.data?.data?.totalQuests || 0} quests.`);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to check completion');
        }
    };

    const displayCampaigns = activeTab === 'joined' ? joinedCampaigns : campaigns;

    const getProgressPercent = (campaign: Campaign) => {
        if (campaign.userProgress) {
            const { completedQuests = 0, totalQuests = 1 } = campaign.userProgress;
            return Math.round((completedQuests / totalQuests) * 100);
        }
        return 0;
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
                            <Trophy className="w-5 h-5 text-yellow-300" />
                            <span className="text-white/90 text-sm font-semibold tracking-wide">Brand Campaigns</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
                            Complete Quests, <br className="sm:hidden" />
                            <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                                Win Prizes
                            </span>
                        </h1>

                        <p className="text-white/90 text-base sm:text-lg max-w-2xl leading-relaxed">
                            Join brand campaigns, visit locations, and complete all quests to earn exclusive rewards.
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-indigo-100 rounded-xl">
                                <Sparkles className="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{campaigns.length}</p>
                        <p className="text-sm text-gray-500 font-medium">Available</p>
                    </div>

                    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-purple-100 rounded-xl">
                                <Target className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{joinedCampaigns.length}</p>
                        <p className="text-sm text-gray-500 font-medium">Joined</p>
                    </div>

                    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-green-100 rounded-xl">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">
                            {joinedCampaigns.filter(c => c.userProgress?.isCompleted).length}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">Completed</p>
                    </div>

                    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-amber-100 rounded-xl">
                                <Gift className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-gray-900">
                            {campaigns.reduce((acc, c) => acc + (c.rewards?.grandPrize?.aptAmount || 0), 0)}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">APT in Prizes</p>
                    </div>
                </div>

                {/* How it Works */}
                <div className="bg-white border-2 border-gray-100 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">How it Works</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                                1
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">Join Campaign</p>
                                <p className="text-xs text-gray-500">Pick a brand campaign</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                                2
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">Visit Locations</p>
                                <p className="text-xs text-gray-500">Go to each quest spot</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                                3
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">Upload Photos</p>
                                <p className="text-xs text-gray-500">Take photos for proof</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                                <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">Win Prizes</p>
                                <p className="text-xs text-gray-500">Earn rewards</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('discover')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'discover'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        Discover
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'discover' ? 'bg-white/20' : 'bg-gray-100'
                            }`}>
                            {campaigns.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('joined')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'joined'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        My Campaigns
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'joined' ? 'bg-white/20' : 'bg-gray-100'
                            }`}>
                            {joinedCampaigns.length}
                        </span>
                    </button>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading campaigns...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && displayCampaigns.length === 0 && (
                    <div className="text-center py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trophy className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {activeTab === 'joined' ? 'No campaigns joined yet' : 'No campaigns available'}
                        </h3>
                        <p className="text-gray-500 text-sm mb-4">
                            {activeTab === 'joined'
                                ? 'Join a campaign to start earning prizes'
                                : 'Check back later for new campaigns'}
                        </p>
                        {activeTab === 'joined' && (
                            <button
                                onClick={() => setActiveTab('discover')}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
                            >
                                Discover Campaigns
                            </button>
                        )}
                    </div>
                )}

                {/* Campaign Cards */}
                {!loading && displayCampaigns.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {displayCampaigns.map((campaign) => {
                            const progress = getProgressPercent(campaign);
                            const isJoined = joinedCampaigns.some(jc => jc._id === campaign._id);
                            const isCompleted = campaign.userProgress?.isCompleted;

                            return (
                                <div
                                    key={campaign._id}
                                    className="group bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300"
                                >
                                    {/* Image Header */}
                                    <div
                                        className="h-36 relative"
                                        style={{
                                            background: campaign.coverImage
                                                ? `url(${campaign.coverImage}) center/cover`
                                                : 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                                        {/* Status Badge */}
                                        {isCompleted && (
                                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-green-500 text-white rounded-lg text-xs font-bold">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Completed
                                            </div>
                                        )}

                                        {isJoined && !isCompleted && (
                                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-indigo-500 text-white rounded-lg text-xs font-bold">
                                                <Clock className="w-3 h-3" />
                                                In Progress
                                            </div>
                                        )}

                                        {/* Title */}
                                        <div className="absolute bottom-3 left-4 right-4">
                                            <h3 className="text-lg font-bold text-white line-clamp-2">
                                                {campaign.name}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                                            {campaign.description?.substring(0, 100) || 'Complete all quests to win prizes'}
                                            {(campaign.description?.length || 0) > 100 ? '...' : ''}
                                        </p>

                                        {/* Stats */}
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <Target className="w-4 h-4 text-indigo-500" />
                                                <span className="font-semibold">{campaign.questCount || campaign.quests?.length || 0} Quests</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <Users className="w-4 h-4 text-purple-500" />
                                                <span className="font-semibold">{campaign.stats?.totalParticipants || 0} Joined</span>
                                            </div>
                                        </div>

                                        {/* Prize */}
                                        {campaign.rewards?.grandPrize && (
                                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Trophy className="w-5 h-5 text-amber-600" />
                                                    <div>
                                                        <p className="text-xs text-amber-700 font-semibold">Grand Prize</p>
                                                        <p className="text-sm font-bold text-amber-900">
                                                            {campaign.rewards.grandPrize.description || `${campaign.rewards.grandPrize.aptAmount} APT`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Progress */}
                                        {isJoined && campaign.userProgress && (
                                            <div className="mb-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-semibold text-gray-500">Progress</span>
                                                    <span className={`text-sm font-bold ${progress >= 100 ? 'text-green-600' : 'text-indigo-600'}`}>
                                                        {campaign.userProgress.completedQuests || 0}/{campaign.userProgress.totalQuests || 0}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : 'bg-indigo-600'
                                                            }`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {isJoined ? (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/campaigns/${campaign._id}`)}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-black transition-colors"
                                                    >
                                                        View Quests
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCheckCompletion(campaign._id)}
                                                        className="px-4 py-2.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-xl font-semibold text-sm hover:bg-amber-200 transition-colors"
                                                        title="Check Completion"
                                                    >
                                                        <Trophy className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleJoin(campaign._id)}
                                                    disabled={joiningId === campaign._id}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    {joiningId === campaign._id ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Joining...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Zap className="w-4 h-4" />
                                                            Join Campaign
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Campaigns;