'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Layers,
    Filter,
    X,
    MapPin,
    Info
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

// Marker type definition
interface MapMarker {
    id: string;
    type: 'lost' | 'found';
    lat: number;
    lng: number;
    title: string;
}

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(
    () => import('@/components/map/CampusMap'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex items-center justify-center bg-muted">
                <Skeleton className="w-full h-full" />
            </div>
        )
    }
);

// Demo markers with explicit type
const demoMarkers: MapMarker[] = [
    { id: '1', type: 'lost', lat: 9.5745, lng: 77.6755, title: 'Black Laptop Charger' },
    { id: '2', type: 'found', lat: 9.5738, lng: 77.6770, title: 'Student ID Card' },
    { id: '3', type: 'lost', lat: 9.5750, lng: 77.6765, title: 'Blue Backpack' },
];

export default function MapPage() {
    const [selectedType, setSelectedType] = useState<'all' | 'lost' | 'found'>('all');
    const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

    const filteredMarkers = selectedType === 'all'
        ? demoMarkers
        : demoMarkers.filter(m => m.type === selectedType);

    return (
        <div className="h-[calc(100vh-7rem)] md:h-screen relative">
            {/* Map */}
            <MapComponent
                markers={filteredMarkers}
                onMarkerClick={(marker) => setSelectedMarker(marker)}
            />

            {/* Top Controls */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center gap-2">
                <div className="flex-1 flex gap-2">
                    <Badge
                        variant={selectedType === 'all' ? 'default' : 'secondary'}
                        className="cursor-pointer bg-white shadow-sm"
                        onClick={() => setSelectedType('all')}
                    >
                        All ({demoMarkers.length})
                    </Badge>
                    <Badge
                        variant={selectedType === 'lost' ? 'default' : 'secondary'}
                        className="cursor-pointer bg-white shadow-sm badge-lost"
                        onClick={() => setSelectedType('lost')}
                    >
                        🔴 Lost ({demoMarkers.filter(m => m.type === 'lost').length})
                    </Badge>
                    <Badge
                        variant={selectedType === 'found' ? 'default' : 'secondary'}
                        className="cursor-pointer bg-white shadow-sm badge-found"
                        onClick={() => setSelectedType('found')}
                    >
                        🟢 Found ({demoMarkers.filter(m => m.type === 'found').length})
                    </Badge>
                </div>

                <Sheet>
                    <SheetTrigger asChild>
                        <Button size="icon" variant="secondary" className="bg-white shadow-sm shrink-0">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Map Filters</SheetTitle>
                        </SheetHeader>
                        <div className="mt-6 space-y-6">
                            <div>
                                <p className="text-sm font-medium mb-3">Show on Map</p>
                                <div className="space-y-2">
                                    {(['all', 'lost', 'found'] as const).map((type) => (
                                        <Button
                                            key={type}
                                            variant={selectedType === type ? 'default' : 'outline'}
                                            className="w-full justify-start capitalize"
                                            onClick={() => setSelectedType(type)}
                                        >
                                            {type === 'all' ? 'All Items' : type}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Legend */}
            <Card className="absolute bottom-4 left-4 z-[1000] bg-white shadow-sm">
                <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-xs">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Legend:</span>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-destructive" />
                            <span>Lost</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span>Found</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Selected Marker Info */}
            {selectedMarker && (
                <Card className="absolute bottom-4 right-4 z-[1000] bg-white shadow-sm max-w-xs animate-slide-up">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 w-3 h-3 rounded-full shrink-0 ${selectedMarker.type === 'lost' ? 'bg-destructive' : 'bg-emerald-500'
                                    }`} />
                                <div>
                                    <p className="text-sm font-medium">{selectedMarker.title}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{selectedMarker.type}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMarker(null)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <Button size="sm" className="w-full mt-3" variant="outline">
                            <Info className="w-4 h-4 mr-2" />
                            View Details
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Campus Info */}
            <Card className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white shadow-sm md:hidden">
                <CardContent className="py-2 px-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>Kalasalingam University Campus</span>
                </CardContent>
            </Card>
        </div>
    );
}
