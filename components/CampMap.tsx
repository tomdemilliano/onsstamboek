"use client";

import { useEffect, useRef } from "react";
import { colors } from "@/lib/theme";

const NORMALE_GROOTTE = 16;
const GEMARKEERDE_GROOTTE = 28;

function maakIconHtml(kleur: string, groot: boolean) {
  const grootte = groot ? GEMARKEERDE_GROOTTE : NORMALE_GROOTTE;
  return `<div style="width:${grootte}px;height:${grootte}px;border-radius:50%;background:${kleur};border:3px solid ${colors.paper};box-shadow:0 1px ${groot ? 7 : 3}px rgba(0,0,0,${groot ? 0.45 : 0.3});"></div>`;
}

export interface CampMapPin {
  naam: string;
  lat: number;
  lng: number;
  kleur?: string;
  popupHtml?: string;
  count?: number;
}

/**
 * gemarkeerd: naam van de pin die uitgelicht moet worden (groter icoon,
 * bovenop de andere pins, kaart pant er zachtjes naartoe) -- of null.
 * kleur en popupHtml zijn optioneel -- standaard kampvuur-oranje en een
 * simpele naam-popup.
 */
export default function CampMap({ pins, gemarkeerd }: { pins: CampMapPin[]; gemarkeerd: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<{ pin: CampMapPin; marker: import("leaflet").Marker }[]>([]);

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      // voorkom dubbele init bij snelle re-renders (bv. React strict mode)
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, { scrollWheelZoom: false });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap-bijdragers",
        maxZoom: 18,
      }).addTo(map);

      const maakIcon = (kleur: string, groot: boolean) =>
        L.divIcon({
          className: "",
          html: maakIconHtml(kleur, groot),
          iconSize: [groot ? GEMARKEERDE_GROOTTE : NORMALE_GROOTTE, groot ? GEMARKEERDE_GROOTTE : NORMALE_GROOTTE],
          iconAnchor: [
            (groot ? GEMARKEERDE_GROOTTE : NORMALE_GROOTTE) / 2,
            (groot ? GEMARKEERDE_GROOTTE : NORMALE_GROOTTE) / 2,
          ],
        });

      const bounds: [number, number][] = [];
      const markers: { pin: CampMapPin; marker: import("leaflet").Marker }[] = [];
      pins.forEach((pin) => {
        const groot = Boolean(gemarkeerd && pin.naam === gemarkeerd);
        const marker = L.marker([pin.lat, pin.lng], { icon: maakIcon(pin.kleur || colors.campfire, groot) }).addTo(map);
        marker.bindPopup(
          pin.popupHtml || `<strong>${pin.naam}</strong>${pin.count ? `<br/>${pin.count} vermelding${pin.count === 1 ? "" : "en"}` : ""}`
        );
        if (groot) marker.setZIndexOffset(1000);
        bounds.push([pin.lat, pin.lng]);
        markers.push({ pin, marker });
      });
      markersRef.current = markers;

      if (bounds.length === 1) {
        map.setView(bounds[0], 9);
      } else {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  // Enkel het icoon van de gemarkeerde pin aanpassen -- geen volledige
  // herbouw van de kaart nodig, dus geen "flikkering" bij het klikken.
  useEffect(() => {
    if (!markersRef.current.length) return;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled) return;
      markersRef.current.forEach(({ pin, marker }) => {
        const groot = Boolean(gemarkeerd && pin.naam === gemarkeerd);
        const grootte = groot ? GEMARKEERDE_GROOTTE : NORMALE_GROOTTE;
        marker.setIcon(
          L.divIcon({
            className: "",
            html: maakIconHtml(pin.kleur || colors.campfire, groot),
            iconSize: [grootte, grootte],
            iconAnchor: [grootte / 2, grootte / 2],
          })
        );
        marker.setZIndexOffset(groot ? 1000 : 0);
        if (groot) {
          marker.openPopup();
          if (mapRef.current) mapRef.current.panTo([pin.lat, pin.lng]);
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [gemarkeerd]);

  if (pins.length === 0) return null;

  return <div ref={containerRef} style={{ width: "100%", height: 360, borderRadius: 4 }} />;
}
