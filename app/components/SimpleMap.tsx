"use client";

import { useEffect, useRef, useState } from "react";

export default function SimpleMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(13);
  const [isLoaded, setIsLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    // Leaflet CSS와 JS를 동적으로 로드
    const loadLeaflet = async () => {
      // CSS 로드
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // 이미 로드되었는지 확인
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== "undefined" && !(window as any).L) {
        // JS 로드
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      setIsLoaded(true);
    };

    loadLeaflet();
  }, []);

  useEffect(() => {
    if (isLoaded && mapRef.current && !map && typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;

      // 지도 생성
      const leafletMap = L.map(mapRef.current).setView(
        [37.5665, 126.978],
        zoom
      );

      // 타일 레이어 추가
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
        L.marker(marker.position)
          .addTo(leafletMap)
          .bindPopup(
            `<b>${marker.title}</b><br>위도: ${marker.position[0]}<br>경도: ${marker.position[1]}`
          );
      });

      setMap(leafletMap);
    }

    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, zoom]);

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

  if (!isLoaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">지도를 로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <div className="bg-white p-4 shadow-md z-10 relative border-b">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          🗺️ 지도 컨트롤 패널
        </h1>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">줌 레벨:</label>
            <span className="bg-blue-100 px-3 py-1 rounded-full text-sm font-medium">
              {zoom}
            </span>
          </div>
          <button
            onClick={handleZoomIn}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔍 확대 (+)
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔍 축소 (-)
          </button>
          <div className="text-sm text-gray-500">
            마우스 휠로도 확대/축소 가능
          </div>
        </div>
      </div>

      <div
        ref={mapRef}
        className="w-full h-[calc(100vh-140px)]"
        style={{ minHeight: "500px" }}
      />
    </div>
  );
}
