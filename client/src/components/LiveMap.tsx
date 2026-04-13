import { useEffect, useRef } from "react";
import L from "leaflet";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LiveMapProps {
  lat: number;
  lon: number;
  zoom?: number;
  height?: string;
  className?: string;
}

export default function LiveMap({ lat, lon, zoom = 13, height = "160px", className = "" }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [lat, lon], zoom,
      zoomControl: true, scrollWheelZoom: false, attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    L.marker([lat, lon]).addTo(map).bindPopup("Session location").openPopup();
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (mapRef.current) mapRef.current.setView([lat, lon], zoom);
  }, [lat, lon, zoom]);

  return (
    <div ref={containerRef} style={{ height }}
      className={`w-full rounded-xl overflow-hidden border border-gray-200 z-0 ${className}`}
    />
  );
}
