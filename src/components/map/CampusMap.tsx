'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CAMPUS_BOUNDS } from '@/lib/utils';

export interface MapMarker {
    id: string;
    type: 'lost' | 'found';
    lat: number;
    lng: number;
    title: string;
}

interface CampusMapProps {
    markers: MapMarker[];
    onMarkerClick?: (marker: MapMarker) => void;
}

export default function CampusMap({ markers, onMarkerClick }: CampusMapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);

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

        // Create markers layer
        markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Update markers when they change
    useEffect(() => {
        if (!markersLayerRef.current || !mapRef.current) return;

        // Clear existing markers
        markersLayerRef.current.clearLayers();

        // Add new markers
        markers.forEach((marker) => {
            const markerColor = marker.type === 'lost' ? '#ef4444' : '#10b981';

            const iconHtml = `
        <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: ${markerColor}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <svg style="width: 16px; height: 16px; color: white;" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `;

            const customIcon = L.divIcon({
                html: iconHtml,
                className: 'custom-marker',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
            });

            const leafletMarker = L.marker([marker.lat, marker.lng], { icon: customIcon })
                .addTo(markersLayerRef.current!);

            if (onMarkerClick) {
                leafletMarker.on('click', () => onMarkerClick(marker));
            }

            // Add popup
            leafletMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif;">
          <p style="font-weight: 500; font-size: 14px; margin: 0;">${marker.title}</p>
          <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0; text-transform: capitalize;">${marker.type}</p>
        </div>
      `);
        });
    }, [markers, onMarkerClick]);

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
      `}} />
            <div
                ref={mapContainerRef}
                className="w-full h-full rounded-xl"
            />
        </>
    );
}
