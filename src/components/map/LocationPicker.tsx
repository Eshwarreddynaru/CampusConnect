'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CAMPUS_BOUNDS } from '@/lib/utils';

export interface SelectedLocation {
    lat: number;
    lng: number;
}

interface LocationPickerProps {
    selectedLocation: SelectedLocation | null;
    onLocationSelect: (location: SelectedLocation) => void;
    height?: string;
}

export default function LocationPicker({
    selectedLocation,
    onLocationSelect,
    height = '250px'
}: LocationPickerProps) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        // Initialize map
        mapRef.current = L.map(mapContainerRef.current, {
            center: [CAMPUS_BOUNDS.center.lat, CAMPUS_BOUNDS.center.lng],
            zoom: CAMPUS_BOUNDS.zoom.default,
            minZoom: CAMPUS_BOUNDS.zoom.min,
            maxZoom: CAMPUS_BOUNDS.zoom.max,
            maxBounds: [
                [CAMPUS_BOUNDS.bounds.south, CAMPUS_BOUNDS.bounds.west],
                [CAMPUS_BOUNDS.bounds.north, CAMPUS_BOUNDS.bounds.east],
            ],
            maxBoundsViscosity: 1.0,
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);

        // Handle click on map
        mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            onLocationSelect({ lat, lng });
        });

        setIsMapReady(true);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [onLocationSelect]);

    // Update marker when selectedLocation changes
    useEffect(() => {
        if (!mapRef.current || !isMapReady) return;

        // Remove existing marker
        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }

        // Add new marker if location is selected
        if (selectedLocation) {
            const iconHtml = `
                <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); transform: rotate(-45deg); box-shadow: 0 4px 12px -2px rgba(102, 126, 234, 0.5);">
                    <svg style="width: 20px; height: 20px; color: white; transform: rotate(45deg);" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                </div>
            `;

            const customIcon = L.divIcon({
                html: iconHtml,
                className: 'location-picker-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 40],
            });

            markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
                icon: customIcon,
                draggable: true
            }).addTo(mapRef.current);

            // Handle marker drag
            markerRef.current.on('dragend', (e: L.DragEndEvent) => {
                const marker = e.target as L.Marker;
                const position = marker.getLatLng();
                onLocationSelect({ lat: position.lat, lng: position.lng });
            });

            // Pan to the selected location
            mapRef.current.panTo([selectedLocation.lat, selectedLocation.lng]);
        }
    }, [selectedLocation, isMapReady, onLocationSelect]);

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                    .location-picker-marker {
                        background: transparent !important;
                        border: none !important;
                    }
                `
            }} />
            <div
                ref={mapContainerRef}
                className="w-full rounded-xl border border-border overflow-hidden"
                style={{ height }}
            />
        </>
    );
}
