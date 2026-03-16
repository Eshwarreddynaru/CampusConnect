'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import {
    Search,
    MessageSquare,
    User,
    ArrowRight,
    Eye,
    X,
    Filter,
    Shield,
    ChevronRight,
    Clock,
    Users,
    Flag,
    AlertTriangle,
    Ban,
    Trash2,
} from 'lucide-react';

interface ChatMessage {
    id: string;
    claim_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
}

interface CommunityMessage {
    id: string;
    user_id: string;
    register_number: string;
    content: string;
    created_at: string;
    is_flagged?: boolean;
    flag_count?: number;
}

interface ClaimChat {
    id: string;
    report_id: string;
    claimer_id: string;
    claimer_register_number: string;
    message: string | null;
    status: string;
    created_at: string;
    report: {
        id: string;
        type: string;
        title: string;
        report_code: string;
        register_number: string;
        user_id: string;
        status: string;
    };
    messageCount?: number;
    lastMessage?: string;
    lastMessageTime?: string;
}

export default function AdminChatsPage() {
    const [chats, setChats] = useState<ClaimChat[]>([]);
    const [filteredChats, setFilteredChats] = useState<ClaimChat[]>([]);
    const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
    const [filteredCommunityMessages, setFilteredCommunityMessages] = useState<CommunityMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChat, setSelectedChat] = useState<ClaimChat | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [activeTab, setActiveTab] = useState('private');
    const [communityStats, setCommunityStats] = useState({
        totalMessages: 0,
        flaggedMessages: 0,
        activeUsers: 0,
        messagesThisWeek: 0,
    });

    useEffect(() => {
        fetchChats();
        fetchCommunityMessages();
    }, []);

    useEffect(() => {
        if (activeTab === 'private') {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                setFilteredChats(chats.filter(c =>
                    c.claimer_register_number.toLowerCase().includes(q) ||
                    c.report?.title?.toLowerCase().includes(q) ||
                    c.report?.register_number?.toLowerCase().includes(q) ||
                    c.report?.report_code?.toLowerCase().includes(q)
                ));
            } else {
                setFilteredChats(chats);
            }
        } else {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                setFilteredCommunityMessages(communityMessages.filter(m =>
                    m.register_number.toLowerCase().includes(q) ||
                    m.content.toLowerCase().includes(q)
                ));
            } else {
                setFilteredCommunityMessages(communityMessages);
            }
        }
    }, [chats, communityMessages, searchQuery, activeTab]);

    const fetchCommunityMessages = async () => {
        const demoMessages: CommunityMessage[] = [
            {
                id: '1',
                user_id: 'user1',
                register_number: '99220041XXX',
                content: 'Has anyone seen a black calculator near the exam hall?',
                created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                is_flagged: false,
                flag_count: 0,
            },
            {
                id: '2',
                user_id: 'user2',
                register_number: '99220042XXX',
                content: 'I found one yesterday! Check the lost and found at security office.',
                created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
                is_flagged: false,
                flag_count: 0,
            },
            {
                id: '3',
                user_id: 'user3',
                register_number: '99220043XXX',
                content: 'This is inappropriate content that should be flagged',
                created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
                is_flagged: true,
                flag_count: 3,
            },
        ];

        setCommunityMessages(demoMessages);

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const stats = {
            totalMessages: demoMessages.length,
            flaggedMessages: demoMessages.filter(m => m.is_flagged).length,
            activeUsers: new Set(demoMessages.map(m => m.user_id)).size,
            messagesThisWeek: demoMessages.filter(m => new Date(m.created_at) >= oneWeekAgo).length,
        };

        setCommunityStats(stats);
    };

    const handleDeleteCommunityMessage = async (messageId: string) => {
        setCommunityMessages(prev => prev.filter(m => m.id !== messageId));
        setFilteredCommunityMessages(prev => prev.filter(m => m.id !== messageId));
    };

    const handleFlagMessage = async (messageId: string) => {
        setCommunityMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, is_flagged: true, flag_count: (m.flag_count || 0) + 1 } : m
        ));
        setFilteredCommunityMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, is_flagged: true, flag_count: (m.flag_count || 0) + 1 } : m
        ));
    };

    const fetchChats = async () => {
        const supabase = createClient();

        const { data: claimsData, error: claimsError } = await supabase
            .from('claims')
            .select(`
                *,
                report:reports (
                    id, type, title, report_code, register_number, user_id, status
                )
            `)
            .order('updated_at', { ascending: false });

        if (claimsError || !claimsData) {
            setIsLoading(false);
            return;
        }

        const { data: messagesData } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false });

        const messagesByClaimId: Record<string, ChatMessage[]> = {};
        (messagesData || []).forEach(msg => {
            if (!messagesByClaimId[msg.claim_id]) {
                messagesByClaimId[msg.claim_id] = [];
            }
            messagesByClaimId[msg.claim_id].push(msg);
        });

        const enrichedChats = claimsData.map(claim => ({
            ...claim,
            messageCount: messagesByClaimId[claim.id]?.length || 0,
            lastMessage: messagesByClaimId[claim.id]?.[0]?.content || null,
            lastMessageTime: messagesByClaimId[claim.id]?.[0]?.created_at || null,
        }));

        enrichedChats.sort((a, b) => {
            const aTime = a.lastMessageTime || a.created_at;
            const bTime = b.lastMessageTime || b.created_at;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        setChats(enrichedChats);
        setIsLoading(false);
    };

    const loadChatMessages = async (claim: ClaimChat) => {
        setSelectedChat(claim);
        setIsLoadingMessages(true);

        const supabase = createClient();
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('claim_id', claim.id)
            .order('created_at', { ascending: true });

        setChatMessages(data || []);
        setIsLoadingMessages(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-blue-600 text-white p-4">
                    <h1 className="text-xl font-semibold">Chat Monitoring</h1>
                </div>
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 shadow-sm">
                <div>
                    <h1 className="text-xl font-semibold">Chat Monitoring</h1>
                    <p className="text-blue-100 text-sm mt-1">
                        Monitor all conversations and community discussions for safety and compliance
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6 space-y-6">
                {/* Admin Oversight Banner */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-800">Admin Oversight</p>
                        <p className="text-xs text-blue-600 mt-1">
                            You can monitor all conversations to verify proper conduct and prevent abuse.
                        </p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-100 border border-gray-200">
                        <TabsTrigger value="private" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Private Chats ({chats.length})
                        </TabsTrigger>
                        <TabsTrigger value="community" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700">
                            <Users className="w-4 h-4 mr-2" />
                            Community Chat ({communityMessages.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Search */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder={activeTab === 'private' ? "Search private chats..." : "Search community messages..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 border-gray-300 text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Private Chats Tab */}
                    <TabsContent value="private" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[60vh]">
                            {/* Chat List */}
                            <div className="lg:col-span-2 space-y-2">
                                {filteredChats.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                                        <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No private chats found</p>
                                    </div>
                                ) : (
                                    filteredChats.map((chat) => (
                                        <div
                                            key={chat.id}
                                            className={`cursor-pointer transition-all rounded-lg border p-3 ${selectedChat?.id === chat.id
                                                ? 'bg-blue-50 border-blue-300 shadow-sm'
                                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                                }`}
                                            onClick={() => loadChatMessages(chat)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-100">
                                                    <MessageSquare className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {chat.report?.title || 'Unknown Item'}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <span>{chat.report?.register_number}</span>
                                                        <ArrowRight className="w-3 h-3 text-gray-400" />
                                                        <span>{chat.claimer_register_number}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] text-gray-400">
                                                        {formatRelativeTime(chat.lastMessageTime || chat.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Chat Detail Panel */}
                            <div className="lg:col-span-3">
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col min-h-[400px]">
                                    {selectedChat ? (
                                        <>
                                            <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                                                <p className="text-sm font-medium text-gray-900">{selectedChat.report?.title}</p>
                                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                    <span>{selectedChat.report?.register_number}</span>
                                                    <ArrowRight className="w-3 h-3 text-gray-400" />
                                                    <span>{selectedChat.claimer_register_number}</span>
                                                </div>
                                            </div>
                                            <ScrollArea className="flex-1 p-4">
                                                {isLoadingMessages ? (
                                                    <div className="space-y-3">
                                                        {Array.from({ length: 3 }).map((_, i) => (
                                                            <Skeleton key={i} className="h-12 bg-gray-100 rounded-xl" />
                                                        ))}
                                                    </div>
                                                ) : chatMessages.length === 0 ? (
                                                    <div className="text-center py-12">
                                                        <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                        <p className="text-sm text-gray-500">No messages yet</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {chatMessages.map((msg) => (
                                                            <div key={msg.id} className={`p-3 rounded-lg max-w-[80%] ${msg.sender_id === selectedChat.report?.user_id
                                                                    ? 'bg-blue-50 border border-blue-100 ml-auto'
                                                                    : 'bg-gray-100 border border-gray-200'
                                                                }`}>
                                                                <p className="text-sm text-gray-900">{msg.content}</p>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {formatRelativeTime(msg.created_at)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="text-center">
                                                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                <p className="text-sm text-gray-500">Select a conversation to view</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Community Chat Tab */}
                    <TabsContent value="community" className="space-y-4">
                        {/* Community Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <MessageSquare className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900">{communityStats.totalMessages}</p>
                                        <p className="text-xs text-gray-500">Total Messages</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                        <Flag className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900">{communityStats.flaggedMessages}</p>
                                        <p className="text-xs text-gray-500">Flagged Messages</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900">{communityStats.activeUsers}</p>
                                        <p className="text-xs text-gray-500">Active Users</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                        <Clock className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900">{communityStats.messagesThisWeek}</p>
                                        <p className="text-xs text-gray-500">This Week</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Community Messages List */}
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                            <div className="bg-blue-600 text-white px-4 py-3">
                                <h3 className="text-sm font-semibold">Community Messages</h3>
                                <p className="text-xs text-blue-100 mt-1">Monitor all public messages for inappropriate content</p>
                            </div>
                            <ScrollArea className="h-[500px]">
                                <div className="p-4 space-y-3">
                                    {filteredCommunityMessages.length === 0 ? (
                                        <div className="text-center py-12">
                                            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">No community messages found</p>
                                        </div>
                                    ) : (
                                        filteredCommunityMessages.map((message) => (
                                            <div key={message.id} className={`rounded-lg border p-3 ${message.is_flagged ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-bold text-blue-700">
                                                            {message.register_number.slice(0, 2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-medium text-gray-700">
                                                                {message.register_number}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                {formatRelativeTime(message.created_at)}
                                                            </span>
                                                            {message.is_flagged && (
                                                                <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]" variant="outline">
                                                                    <Flag className="w-2 h-2 mr-1" />
                                                                    Flagged ({message.flag_count})
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-900">{message.content}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {!message.is_flagged && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleFlagMessage(message.id)}
                                                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                            >
                                                                <Flag className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteCommunityMessage(message.id)}
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}