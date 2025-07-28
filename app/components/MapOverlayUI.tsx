"use client";

import { useState } from "react";

interface MapInfo {
  zoom: number;
  center: { lat: number; lng: number } | null;
  markers: number;
  downloadedTiles: number;
  debugInfo: string;
}

interface MapOverlayUIProps {
  mapInfo: MapInfo;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  showTileNumbers: boolean;
  onToggleTileNumbers: () => void;
}

export default function MapOverlayUI({
  mapInfo,
  onZoomIn,
  onZoomOut,
  onResetView,
  showTileNumbers,
  onToggleTileNumbers,
}: MapOverlayUIProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
      {/* 메인 정보 패널 */}
      <div className="mb-4 pointer-events-auto">
        <div className="bg-white/98 backdrop-blur-md rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden ring-1 ring-black/5">
          {/* 헤더 */}
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🗺️</span>
              <span className="font-medium">지도 정보</span>
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-white hover:text-blue-200 transition-colors"
              title={isCollapsed ? "정보 표시" : "정보 숨김"}
            >
              {isCollapsed ? "📊" : "➖"}
            </button>
          </div>

          {/* 정보 내용 */}
          {!isCollapsed && (
            <div className="p-4 space-y-3">
              {/* 현재 위치 정보 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-blue-600">🎯</span>
                  <span className="font-medium">줌 레벨:</span>
                  <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono">
                    {Math.round(mapInfo.zoom)}
                  </span>
                </div>

                {mapInfo.center && (
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">📍</span>
                      <span className="font-medium">중심 좌표:</span>
                    </div>
                    <div className="ml-6 font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                      <div>위도: {mapInfo.center.lat.toFixed(6)}</div>
                      <div>경도: {mapInfo.center.lng.toFixed(6)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 통계 정보 */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-purple-600">📌</span>
                    <span>마커 개수:</span>
                  </span>
                  <span className="bg-purple-100 px-2 py-1 rounded text-purple-800 font-medium">
                    {mapInfo.markers}개
                  </span>
                </div>

                {mapInfo.downloadedTiles > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-orange-600">💾</span>
                      <span>저장된 타일:</span>
                    </span>
                    <span className="bg-orange-100 px-2 py-1 rounded text-orange-800 font-medium">
                      {mapInfo.downloadedTiles}개
                    </span>
                  </div>
                )}

                {mapInfo.debugInfo && (
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    🔍 {mapInfo.debugInfo}
                  </div>
                )}

                {Math.round(mapInfo.zoom) === 18 && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded border-l-4 border-red-500">
                    <strong>🎯 줌 18 활성</strong>
                    <br />
                    이동 시 F12 콘솔에서 타일 상태 확인 가능
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 빠른 컨트롤 패널 */}
      <div className="pointer-events-auto">
        <div className="bg-white/98 backdrop-blur-md rounded-lg shadow-2xl border-2 border-gray-300 p-3 ring-1 ring-black/5">
          <div className="text-xs text-gray-600 mb-2 text-center font-medium">
            빠른 제어
          </div>
          <div className="flex flex-col gap-2">
            {/* 줌 컨트롤 */}
            <div className="flex gap-1">
              <button
                onClick={onZoomIn}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-medium transition-colors"
                title="확대"
              >
                🔍+
              </button>
              <button
                onClick={onZoomOut}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-sm font-medium transition-colors"
                title="축소"
              >
                🔍-
              </button>
            </div>

            {/* 기타 컨트롤 */}
            <button
              onClick={onResetView}
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded text-sm font-medium transition-colors"
              title="전체 보기"
            >
              🏠 전체 보기
            </button>

            <button
              onClick={onToggleTileNumbers}
              className={`p-2 rounded text-sm font-medium transition-colors ${
                showTileNumbers
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : "bg-gray-500 hover:bg-gray-600 text-white"
              }`}
              title={showTileNumbers ? "타일 번호 숨김" : "타일 번호 표시"}
            >
              {showTileNumbers ? "🔢 숨김" : "🔢 표시"}
            </button>
          </div>
        </div>
      </div>

      {/* 미니 상태 표시기 (항상 표시) */}
      <div className="mt-4 pointer-events-none">
        <div className="bg-black/90 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md shadow-lg border border-white/20">
          Z{Math.round(mapInfo.zoom)} | M{mapInfo.markers}
          {mapInfo.downloadedTiles > 0 && ` | T${mapInfo.downloadedTiles}`}
        </div>
      </div>
    </div>
  );
}
