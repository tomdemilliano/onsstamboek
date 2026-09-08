"use client";

import { useEffect, useRef } from "react";
import { colors } from "@/lib/theme";

const BELGIE_CENTER: [number, number] = [50.85, 4.35];

export default function LocationPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const lastEmitted = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  function maakIcon(L: typeof import("leaflet")) {
    return L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${colors.campfire};border:2px solid ${colors.paper};box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 18],
    });
  }

  function plaatsMarker(L: typeof import("leaflet"), map: import("leaflet").Map, la: number, ln: number) {
    if (markerRef.current) {
      markerRef.current.setLatLng([la, ln]);
    } else {
      markerRef.current = L.marker([la, ln], { icon: maakIcon(L), draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        lastEmitted.current = { lat: pos.lat, lng: pos.lng };
        onPick(pos.lat, pos.lng);
      });
    }
  }

  // Kaart eenmalig initialiseren
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      const start: [number, number] = lat != null && lng != null ? [lat, lng] : BELGIE_CENTER;
      const map = L.map(containerRef.current).setView(start, lat != null ? 13 : 8);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap-bijdragers",
        maxZoom: 19,
      }).addTo(map);

      if (lat != null && lng != null) {
        plaatsMarker(L, map, lat, lng);
      }

      map.on("click", (e) => {
        const { lat: la, lng: ln } = e.latlng;
        plaatsMarker(L, map, la, ln);
        lastEmitted.current = { lat: la, lng: ln };
        onPick(la, ln);
      });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Als lat/lng van buitenaf veranderen (bv. na een adres-zoekopdracht of
  // manuele invoer), marker + kaartweergave meebewegen -- maar niet als de
  // wijziging zelf van deze kaart kwam (voorkomt een lus).
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || lat == null || lng == null) return;
    if (lastEmitted.current.lat === lat && lastEmitted.current.lng === lng) return;
    plaatsMarker(L, map, lat, lng);
    map.flyTo([lat, lng], Math.max(map.getZoom(), 12));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return <div ref={containerRef} style={{ width: "100%", height: 280, borderRadius: 4 }} />;
}
