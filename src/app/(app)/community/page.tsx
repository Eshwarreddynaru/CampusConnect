'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeTime } from '@/lib/utils';
import {
    Send,
    MoreVertical,
    Flag,
    Info,
    Users
} from 'lucide-react';

interface Message {
    id: string;
    userId: string;
    registerNumber: string;
    content: string;
    createdAt: string;
    isOwn?: boolean;
}

// Generate demo messages only on the client side to avoid hydration mismatch
function getDemoMessages(): Message[] {
    const now = Date.now();
    return [
        {
            id: '1',
            userId: '1',
            registerNumber: '99220041XXX',
            content: 'Has anyone seen a black calculator near the exam hall?',
            createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
        },
        {
            id: '2',
            userId: '2',
            registerNumber: '99220042XXX',
            content: 'I found one yesterday! Check the lost and found at security office.',
            createdAt: new Date(now - 25 * 60 * 1000).toISOString(),
        },
        {
            id: '3',
            userId: '3',
            registerNumber: '99220043XXX',
            content: 'Thanks! I\'ll check there.',
            createdAt: new Date(now - 20 * 60 * 1000).toISOString(),
            isOwn: true,
        },
        {
            id: '4',
            userId: '4',
            registerNumber: '99220044XXX',
            content: 'Anyone lost a water bottle in Block C? Found one on the 3rd floor.',
            createdAt: new Date(now - 15 * 60 * 1000).toISOString(),
        },
        {
            id: '5',
            userId: '5',
            registerNumber: '99220045XXX',
            content: 'What color is it?',
            createdAt: new Date(now - 10 * 60 * 1000).toISOString(),
        },
        {
            id: '6',
            userId: '4',
            registerNumber: '99220044XXX',
            content: 'It\'s blue with a black cap. Has some stickers on it.',
            createdAt: new Date(now - 5 * 60 * 1000).toISOString(),
        },
    ];
}

export default function CommunityPage() {
    const [messages, setMessages] = useState<Message[]>(() => getDemoMessages());
    const [newMessage, setNewMessage] = useState('');
    const [isOnline] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!newMessage.trim()) return;

        const message: Message = {
            id: Date.now().toString(),
            userId: 'current',
            registerNumber: '99220043XXX',
            content: newMessage.trim(),
            createdAt: new Date().toISOString(),
            isOwn: true,
        };

        setMessages(prev => [...prev, message]);
        setNewMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-7rem)] md:h-screen">
            {/* Header */}
            <div className="border-b px-4 py-3 flex items-center justify-between bg-card">
                <div>
                    <h1 className="font-semibold">Community Chat</h1>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>Campus-wide discussion</span>
                        {isOnline && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Online
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <Button variant="ghost" size="icon">
                    <Info className="w-5 h-5" />
                </Button>
            </div>

            {/* Guidelines Banner */}
            <Card className="m-4 mb-0 bg-primary/5 border-primary/20">
                <CardContent className="p-3 flex items-start gap-3">
                    <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                        This is a moderated community chat. Be respectful and only discuss lost/found items.
                        Your register number is visible to others.
                        <button className="text-primary ml-1 hover:underline">Report abuse</button>
                    </p>
                </CardContent>
            </Card>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex gap-3 ${message.isOwn ? 'flex-row-reverse' : ''}`}
                        >
                            {!message.isOwn && (
                                <Avatar className="w-8 h-8 shrink-0">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                        {message.registerNumber.slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                            <div className={`max-w-[75%] ${message.isOwn ? 'text-right' : ''}`}>
                                {!message.isOwn && (
                                    <p className="text-xs text-muted-foreground mb-1">
                                        {message.registerNumber}
                                    </p>
                                )}
                                <div className={`inline-flex items-end gap-1 ${message.isOwn ? 'flex-row-reverse' : ''}`}>
                                    <div
                                        className={`px-4 py-2 rounded-2xl ${message.isOwn
                                            ? 'bg-primary text-primary-foreground rounded-br-md'
                                            : 'bg-muted rounded-bl-md'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                    {!message.isOwn && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground">
                                                    <MoreVertical className="w-3 h-3" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                <DropdownMenuItem className="text-destructive">
                                                    <Flag className="w-4 h-4 mr-2" />
                                                    Report Message
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {formatRelativeTime(message.createdAt)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4 bg-card">
                <div className="flex gap-2">
                    <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="text-white hover:opacity-90" style={{ background: '#1a5c6b' }}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Messages are visible to all campus members
                </p>
            </div>
        </div>
    );
}
