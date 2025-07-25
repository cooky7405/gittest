"use client";

import { useEffect, useState } from "react";

export default function Map() {
  const [isClient, setIsClient] = useState(false);
  const [zoom, setZoom] = useState(13);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && typeof window !== "undefined") {
      // 동적으로 Leaflet 로드
      const loadMap = async () => {
        const L = (await import("leaflet")).default;

        // Leaflet 아이콘 문제 해결
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        const mapContainer = document.getElementById("map");
        if (mapContainer && !map) {
          const leafletMap = L.map("map").setView([37.5665, 126.978], zoom);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(leafletMap);

          // 테스트용 마커 추가
          const testMarkers = [
            { position: [37.5665, 126.978], title: "서울 중심" },
            { position: [37.5755, 126.9769], title: "광화문" },
            { position: [37.5662, 126.9779], title: "명동" },
            { position: [37.5717, 126.9895], title: "동대문" },
          ];

          testMarkers.forEach((marker) => {
            L.marker(marker.position as [number, number])
              .addTo(leafletMap)
              .bindPopup(
                `<b>${marker.title}</b><br>위도: ${marker.position[0]}<br>경도: ${marker.position[1]}`
              );
          });

          setMap(leafletMap);
        }
      };

      loadMap();
    }

    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, zoom]);

  const handleZoomIn = () => {
    if (map) {
      const newZoom = Math.min(zoom + 1, 18);
      setZoom(newZoom);
      map.setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const newZoom = Math.max(zoom - 1, 1);
      setZoom(newZoom);
      map.setZoom(newZoom);
    }
  };

  if (!isClient) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-lg">지도를 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <div className="bg-white p-4 shadow-md z-10 relative">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          지도 컨트롤 패널
        </h1>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">줌 레벨:</label>
            <span className="bg-blue-100 px-2 py-1 rounded text-sm">
              {zoom}
            </span>
          </div>
          <button
            onClick={handleZoomIn}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            확대 (+)
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            축소 (-)
          </button>
        </div>
      </div>

      <div
        id="map"
        className="w-full h-[calc(100vh-120px)]"
        style={{ minHeight: "500px" }}
      />
    </div>
  );
}
