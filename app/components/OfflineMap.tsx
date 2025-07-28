"use client";

import { useEffect, useRef, useState } from "react";
import MapOverlayUI from "./MapOverlayUI";

interface Marker {
  id: number;
  position: [number, number];
  title: string;
  description: string;
  category: string;
}

interface MapData {
  markers: Marker[];
  mapConfig: {
    center: [number, number];
    defaultZoom: number;
    minZoom: number;
    maxZoom: number;
  };
}

export default function OfflineMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(13);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>("");
  const [downloadedTiles, setDownloadedTiles] = useState(0);
  const [currentCenter, setCurrentCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [showTileNumbers, setShowTileNumbers] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [map, setMap] = useState<any>(null);

  // JSON 데이터 로딩
  useEffect(() => {
    const loadMapData = async () => {
      try {
        const response = await fetch("/data/markers.json");
        const data: MapData = await response.json();
        setMapData(data);
        setZoom(data.mapConfig.defaultZoom);
      } catch (error) {
        console.error("Failed to load map data:", error);
        // 기본 데이터 설정
        setMapData({
          markers: [
            {
              id: 1,
              position: [36.1871, 127.1167],
              title: "논산 훈련소",
              description: "대한민국 육군 훈련소",
              category: "military",
            },
          ],
          mapConfig: {
            center: [36.1871, 127.1167],
            defaultZoom: 13,
            minZoom: 10,
            maxZoom: 18,
          },
        });
      }
    };

    loadMapData();
  }, []);

  // Leaflet 라이브러리 로딩
  useEffect(() => {
    const loadLeaflet = async () => {
      // CSS 로드
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // JS 로드
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== "undefined" && !(window as any).L) {
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

  // 지도 생성
  useEffect(() => {
    if (
      isLoaded &&
      mapRef.current &&
      !map &&
      mapData &&
      typeof window !== "undefined"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;

      // 지도 생성 - 타일 안정성 최우선 설정
      const leafletMap = L.map(mapRef.current, {
        center: mapData.mapConfig.center,
        zoom: mapData.mapConfig.defaultZoom,
        zoomControl: false, // 기본 줌 컨트롤 비활성화
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true,
        zoomSnap: 1, // 타일 데이터에 맞춰 정수 단위로 조정
        zoomDelta: 1,

        // 타일 안정성을 위한 설정
        maxBoundsViscosity: 0.5, // 적당한 경계 저항
        preferCanvas: false, // SVG 렌더링으로 타일 안정성 향상

        // 부드러운 애니메이션 (타일 유지)
        zoomAnimation: true,
        fadeAnimation: false, // 페이드 애니메이션 비활성화로 타일 깜빡임 방지
        markerZoomAnimation: true,

        // 타일 로딩 최적화
        worldCopyJump: false, // 월드 카피 비활성화
        wheelDebounceTime: 60, // 마우스 휠 디바운스 증가
        wheelPxPerZoomLevel: 120, // 정수 줌에 맞춰 마우스 휠 조정

        // 타일 렌더링 안정성
        renderer: null, // 기본 렌더러 사용
      });

      // 줌 컨트롤을 오른쪽 상단에 추가
      L.control
        .zoom({
          position: "topright",
        })
        .addTo(leafletMap);

      // 온라인 타일 레이어 (기본) - 오프라인과 동일한 안정성 설정
      const onlineTileLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: mapData.mapConfig.maxZoom,
          minZoom: mapData.mapConfig.minZoom,

          // 오프라인과 동일한 안정성 설정
          tileSize: 256,
          zoomOffset: 0,
          keepBuffer: 5, // 줌 18 대응으로 더 많은 타일 버퍼
          updateWhenZooming: false, // 줌 중 업데이트 방지
          updateWhenIdle: true, // 안정된 상태에서만 업데이트

          // 타일 경계 안정성
          noWrap: false,
          bounds: null,
          maxBounds: null,

          // 렌더링 안정성
          opacity: 1.0,
          detectRetina: false,
          crossOrigin: true,

          // 타일 로딩 안정성
          reuseTiles: true,
          unloadInvisibleTiles: false, // 보이지 않는 타일도 유지
          updateInterval: 150,

          // 줌 18 지원 강화
          maxNativeZoom: 18, // 네이티브 줌 18까지 지원
        }
      );

      // 로컬 타일 레이어 (오프라인) - 안정성 최우선 설정
      const localTileLayer = L.tileLayer("/tiles/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap (로컬 캐시)",
        maxZoom: mapData.mapConfig.maxZoom,
        minZoom: mapData.mapConfig.minZoom,
        errorTileUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",

        // 타일 안정성을 위한 최적화된 설정
        tileSize: 256,
        zoomOffset: 0,
        keepBuffer: 5, // 줌 18 대응으로 더 많은 타일 버퍼
        updateWhenZooming: false, // 줌 중 업데이트 방지
        updateWhenIdle: true, // 안정된 상태에서만 업데이트

        // 타일 경계 안정성
        noWrap: false,
        bounds: null,
        maxBounds: null,

        // 렌더링 안정성
        opacity: 1.0,
        detectRetina: false,
        crossOrigin: true,

        // 타일 로딩 안정성
        reuseTiles: true, // 타일 재사용으로 안정성 향상
        unloadInvisibleTiles: false, // 보이지 않는 타일도 유지
        updateInterval: 150, // 업데이트 간격 조정

        // 에러 처리 강화
        retryOnError: true,
        maxRetries: 3,

        // 줌 18 지원 강화
        maxNativeZoom: 18, // 네이티브 줌 18까지 지원
      });

      // 안정적인 하이브리드 타일 시스템
      // 온라인 타일을 백그라운드로 추가
      onlineTileLayer.addTo(leafletMap);
      // 로컬 타일을 오버레이로 추가 (우선순위)
      localTileLayer.addTo(leafletMap);

      // 타일 레이어 안정성 이벤트 처리
      let isLoading = false;

      localTileLayer.on("loading", () => {
        isLoading = true;
        console.log("로컬 타일 로딩 시작");
      });

      localTileLayer.on("load", () => {
        isLoading = false;
        console.log("로컬 타일 로딩 완료");
        // 안정적인 지도 크기 조정 (타일 유지)
        setTimeout(() => {
          if (!isLoading) {
            leafletMap.invalidateSize({ pan: false, animate: false });
          }
        }, 200);
      });

      onlineTileLayer.on("loading", () => {
        console.log("온라인 타일 로딩 시작");
      });

      onlineTileLayer.on("load", () => {
        console.log("온라인 타일 로딩 완료");
      });

      // 타일 에러 처리 - 사용자 친화적 개선
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      localTileLayer.on("tileerror", (e: any) => {
        const currentZoom = leafletMap.getZoom();
        const roundedZoom = Math.round(currentZoom);

        // 타일 URL에서 좌표 추출
        const urlParts = e.tile.src.split("/");
        const z = urlParts[urlParts.length - 3];
        const x = urlParts[urlParts.length - 2];
        const y = urlParts[urlParts.length - 1].split(".")[0];

        // 개발 환경에서만 상세 로그 출력
        if (process.env.NODE_ENV === "development") {
          console.log(
            `❌ 오프라인 타일 없음 (줌 ${roundedZoom}): ${z}/${x}/${y}`
          );

          if (roundedZoom === 18) {
            console.log(`🔍 줌 18 타일 경로: /tiles/${z}/${x}/${y}.png`);
            console.log(
              `📍 현재 위치에서 줌 18 타일이 다운로드되지 않았습니다.`
            );
          }
        }

        // 에러 타일을 투명하게 처리하여 온라인 타일이 보이도록
        e.tile.style.opacity = "0";

        // 첫 번째 타일 에러 시에만 사용자에게 안내
        if (!sessionStorage.getItem("tile_error_shown")) {
          sessionStorage.setItem("tile_error_shown", "true");

          // 사용자 친화적 안내 메시지
          const notification = document.createElement("div");
          notification.style.cssText = `
            position: fixed; top: 80px; right: 20px; z-index: 10000;
            background: #fbbf24; color: #92400e; padding: 12px 16px;
            border-radius: 8px; border: 1px solid #f59e0b;
            font-size: 14px; max-width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          `;
          notification.innerHTML = `
            <strong>🗺️ 오프라인 타일 안내</strong><br>
            일부 지도 타일이 오프라인에 저장되지 않았습니다.<br>
            <small>💾 다운로드 버튼을 눌러 타일을 저장하세요.</small>
          `;

          document.body.appendChild(notification);

          // 5초 후 자동 제거
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 5000);
        }
      });

      // 타일 로드 성공 로깅
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      localTileLayer.on("tileload", (e: any) => {
        const currentZoom = leafletMap.getZoom();
        const roundedZoom = Math.round(currentZoom);

        if (roundedZoom === 18) {
          const urlParts = e.tile.src.split("/");
          const z = urlParts[urlParts.length - 3];
          const x = urlParts[urlParts.length - 2];
          const y = urlParts[urlParts.length - 1].split(".")[0];
          console.log(`✅ 줌 18 타일 로드 성공: ${z}/${x}/${y}`);
        }
      });

      // 레이어 컨트롤 추가
      const baseLayers = {
        "하이브리드 (온라인+로컬)": L.layerGroup([
          onlineTileLayer,
          localTileLayer,
        ]),
        온라인만: onlineTileLayer,
        로컬만: localTileLayer,
      };
      L.control
        .layers(baseLayers, null, {
          position: "topleft",
        })
        .addTo(leafletMap);

      // 줌 이벤트 핸들러 - 화면 최대 활용
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      leafletMap.on("zoomstart", () => {
        leafletMap.getContainer().style.cursor = "grabbing";
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      leafletMap.on("zoomend", (e: any) => {
        const currentZoom = e.target.getZoom();
        const center = e.target.getCenter();
        const roundedZoom = Math.round(currentZoom);
        setZoom(roundedZoom);
        setCurrentCenter({ lat: center.lat, lng: center.lng });
        setDebugInfo(
          `줌: ${roundedZoom}, 중심: ${center.lat.toFixed(
            6
          )}, ${center.lng.toFixed(6)}`
        );
        leafletMap.getContainer().style.cursor = "grab";

        // 타일 번호 오버레이 업데이트
        if (showTileNumbers) {
          setTimeout(() => createTileNumberOverlay(), 100);
        }

        // 줌 18에서 타일 버퍼 동적 조정
        if (roundedZoom === 18) {
          console.log("🔍 줌 18: 타일 버퍼 증가로 빈 공간 방지");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          leafletMap.eachLayer((layer: any) => {
            if (layer._url) {
              layer.options.keepBuffer = 8; // 줌 18에서 매우 많은 버퍼
              layer.options.updateWhenIdle = false; // 즉시 업데이트
              layer.redraw();
            }
          });
        } else if (roundedZoom >= 16) {
          // 줌 16-17에서 중간 정도 버퍼
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          leafletMap.eachLayer((layer: any) => {
            if (layer._url) {
              layer.options.keepBuffer = 6;
              layer.options.updateWhenIdle = true;
            }
          });
        } else {
          // 낮은 줌에서는 기본 버퍼
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          leafletMap.eachLayer((layer: any) => {
            if (layer._url) {
              layer.options.keepBuffer = 5;
              layer.options.updateWhenIdle = true;
            }
          });
        }

        // 화면 크기 재조정 및 타일 새로고침
        setTimeout(() => {
          leafletMap.invalidateSize();

          // 레이어 새로고침으로 타일 다시 로드
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          leafletMap.eachLayer((layer: any) => {
            if (layer._url) {
              layer.redraw();
            }
          });
        }, 50);
      });

      // 이동 완료 시 안정적인 처리
      leafletMap.on("moveend", () => {
        const center = leafletMap.getCenter();
        const zoom = leafletMap.getZoom();
        setCurrentCenter({ lat: center.lat, lng: center.lng });
        setDebugInfo(
          `이동 완료: 줌 ${Math.round(zoom)}, 중심: ${center.lat.toFixed(
            6
          )}, ${center.lng.toFixed(6)}`
        );

        // 타일 번호 오버레이 업데이트
        if (showTileNumbers) {
          setTimeout(() => createTileNumberOverlay(), 100);
        }

        // 안정적인 지도 크기 조정만 수행 (타일 강제 새로고침 제거)
        setTimeout(() => {
          if (!isLoading) {
            leafletMap.invalidateSize({ pan: false, animate: false });
          }
        }, 100);
      });

      // 드래그 이벤트 핸들러
      leafletMap.on("dragstart", () => {
        leafletMap.getContainer().style.cursor = "grabbing";
      });

      leafletMap.on("dragend", () => {
        leafletMap.getContainer().style.cursor = "grab";
      });

      // 타일 로드 완료 이벤트
      leafletMap.on("load", () => {
        setTimeout(() => {
          leafletMap.invalidateSize();
        }, 100);
      });

      // 마커 추가
      mapData.markers.forEach((marker) => {
        const getMarkerIcon = (category: string) => {
          switch (category) {
            case "landmark":
              return "🏛️";
            case "historic":
              return "🏯";
            case "shopping":
              return "🛍️";
            case "culture":
              return "🎭";
            case "tourism":
              return "🏞️";
            case "transport":
              return "🚆";
            case "government":
              return "🏛️";
            case "military":
              return "🪖";
            default:
              return "📍";
          }
        };

        const customIcon = L.divIcon({
          html: `<div style="font-size: 24px;">${getMarkerIcon(
            marker.category
          )}</div>`,
          iconSize: [30, 30],
          className: "custom-marker",
        });

        L.marker(marker.position, { icon: customIcon }).addTo(leafletMap)
          .bindPopup(`
            <div style="min-width: 200px;">
              <h3 style="margin: 0 0 8px 0;"><strong>${
                marker.title
              }</strong></h3>
              <p style="margin: 0 0 8px 0; color: #666;">${
                marker.description
              }</p>
              <small style="color: #999;">
                ${marker.position[0].toFixed(4)}, ${marker.position[1].toFixed(
          4
        )}
              </small>
            </div>
          `);
      });

      // 초기 중심점 설정
      setCurrentCenter({
        lat: mapData.mapConfig.center[0],
        lng: mapData.mapConfig.center[1],
      });
      setDebugInfo(
        `초기 로드: 줌 ${
          mapData.mapConfig.defaultZoom
        }, 중심: ${mapData.mapConfig.center[0].toFixed(
          6
        )}, ${mapData.mapConfig.center[1].toFixed(6)}`
      );

      setMap(leafletMap);

      // 창 크기 변경 시 안정적인 지도 크기 재조정
      const handleResize = () => {
        setTimeout(() => {
          if (!isLoading) {
            leafletMap.invalidateSize({ pan: false, animate: false });
          }
        }, 200);
      };
      window.addEventListener("resize", handleResize);

      // 초기 화면 맞춤
      setTimeout(() => {
        leafletMap.invalidateSize({ pan: false, animate: false });
      }, 500);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, mapData]);

  // 타일 번호 표시 상태 변경 시 오버레이 업데이트
  useEffect(() => {
    if (map && showTileNumbers) {
      setTimeout(() => createTileNumberOverlay(), 100);
    } else if (map && !showTileNumbers) {
      // 타일 번호 오버레이 제거
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.eachLayer((layer: any) => {
        if (layer._tileNumberOverlay) {
          map.removeLayer(layer);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTileNumbers, map]);

  // 타일 좌표 계산 함수
  const deg2num = (lat: number, lon: number, zoom: number) => {
    const lat_rad = (lat * Math.PI) / 180;
    const n = Math.pow(2, zoom);

    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor(
      ((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) /
        2) *
        n
    );

    return { x, y };
  };

  // 타일 번호 오버레이 생성 함수
  const createTileNumberOverlay = () => {
    if (!map || !showTileNumbers) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    // 기존 오버레이 제거
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.eachLayer((layer: any) => {
      if (layer._tileNumberOverlay) {
        map.removeLayer(layer);
      }
    });

    const currentZoom = Math.round(map.getZoom());
    const bounds = map.getBounds();

    // 화면에 보이는 타일 범위 계산
    const topLeft = deg2num(bounds.getNorth(), bounds.getWest(), currentZoom);
    const bottomRight = deg2num(
      bounds.getSouth(),
      bounds.getEast(),
      currentZoom
    );

    // 타일 번호 오버레이 생성
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        // 타일의 중심점 계산
        const tileCenter = {
          lat:
            bounds.getNorth() -
            ((y - topLeft.y + 0.5) * (bounds.getNorth() - bounds.getSouth())) /
              (bottomRight.y - topLeft.y + 1),
          lng:
            bounds.getWest() +
            ((x - topLeft.x + 0.5) * (bounds.getEast() - bounds.getWest())) /
              (bottomRight.x - topLeft.x + 1),
        };

        // 타일 번호 표시
        const tileNumber = L.divIcon({
          className: "tile-number-overlay",
          html: `<div style="
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
            pointer-events: none;
            z-index: 1000;
          ">${currentZoom}/${x}/${y}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10],
        });

        const marker = L.marker([tileCenter.lat, tileCenter.lng], {
          icon: tileNumber,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (marker as any)._tileNumberOverlay = true;
        marker.addTo(map);
      }
    }
  };

  // 타일 번호 표시 토글 함수
  const toggleTileNumbers = () => {
    setShowTileNumbers(!showTileNumbers);
  };

  // 타일 다운로드 함수
  const downloadTiles = async () => {
    if (!mapData || !map) return;

    setIsDownloading(true);
    setDownloadStatus("현재 지도 영역 타일 다운로드 시작...");

    try {
      const currentZoom = map.getZoom();
      const currentCenter = map.getCenter();

      const response = await fetch("/api/download-tiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: currentCenter.lat, // 현재 지도 중심 사용
          lng: currentCenter.lng, // 현재 지도 중심 사용
          startZoom: Math.max(currentZoom - 1, mapData.mapConfig.minZoom),
          endZoom: Math.min(currentZoom + 1, mapData.mapConfig.maxZoom),
          radius: 2, // 5x5 타일 영역
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDownloadedTiles((prev) => prev + result.downloaded);
        setDownloadStatus(
          `다운로드 완료! ${result.downloaded}개 새 타일 저장됨 (총 ${result.totalTiles}개 중)`
        );

        // 지도 새로고침
        setTimeout(() => {
          map.invalidateSize();
        }, 500);
      } else {
        setDownloadStatus("다운로드 실패: " + result.error);
      }
    } catch (error) {
      console.error("Download error:", error);
      setDownloadStatus("다운로드 중 오류 발생: " + error);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(""), 6000);
    }
  };

  // 고해상도 타일 다운로드 함수 (줌 16-18)
  const downloadHighResolutionTiles = async () => {
    if (!mapData || !map) return;

    setIsDownloading(true);
    setDownloadStatus("고해상도 타일 다운로드 시작 (줌 16-18)...");

    try {
      const currentCenter = map.getCenter();

      const response = await fetch("/api/download-tiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: currentCenter.lat,
          lng: currentCenter.lng,
          startZoom: 16, // 고해상도 시작
          endZoom: 18, // 최대 줌 레벨
          radius: 1, // 3x3 영역 (고해상도는 타일 개수가 많아서)
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDownloadedTiles((prev) => prev + result.downloaded);
        setDownloadStatus(
          `고해상도 다운로드 완료! ${result.downloaded}개 새 타일 저장됨 (줌 16-18)`
        );

        // 지도 새로고침
        setTimeout(() => {
          map.invalidateSize();
        }, 500);
      } else {
        setDownloadStatus("고해상도 다운로드 실패: " + result.error);
      }
    } catch (error) {
      console.error("High-res download error:", error);
      setDownloadStatus("고해상도 다운로드 중 오류 발생: " + error);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(""), 8000);
    }
  };

  // 현재 화면 영역 줌 18 타일 다운로드
  const downloadCurrentViewZoom18 = async () => {
    if (!mapData || !map) return;

    const currentZoom = map.getZoom();
    if (Math.round(currentZoom) !== 18) {
      alert(
        "줌 18에서만 사용할 수 있는 기능입니다. 먼저 줌 18로 확대해주세요."
      );
      return;
    }

    setIsDownloading(true);
    setDownloadStatus("🔍 현재 화면 줌 18 타일 다운로드 중...");

    try {
      const currentCenter = map.getCenter();

      const response = await fetch("/api/download-tiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: currentCenter.lat,
          lng: currentCenter.lng,
          startZoom: 18,
          endZoom: 18,
          radius: 3, // 현재 화면 + 주변 영역 포함
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDownloadedTiles((prev) => prev + result.downloaded);
        setDownloadStatus(
          `✅ 현재 화면 줌 18 다운로드 완료! ${result.downloaded}개 새 타일 추가`
        );

        // 타일 새로고침으로 바로 적용
        setTimeout(() => {
          map.invalidateSize();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.eachLayer((layer: any) => {
            if (layer._url && layer._url.includes("/tiles/")) {
              layer.redraw();
            }
          });
        }, 500);
      } else {
        setDownloadStatus("❌ 현재 화면 다운로드 실패: " + result.error);
      }
    } catch (error) {
      console.error("Current view download error:", error);
      setDownloadStatus("❌ 현재 화면 다운로드 중 오류 발생: " + error);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(""), 8000);
    }
  };

  // 전체 영역 다운로드 함수 (줌 10-18)
  const downloadFullRange = async () => {
    if (!mapData || !map) return;

    setIsDownloading(true);
    setDownloadStatus("전체 줌 레벨 다운로드 시작 (10-18)...");

    try {
      const currentCenter = map.getCenter();

      const response = await fetch("/api/download-tiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: currentCenter.lat,
          lng: currentCenter.lng,
          startZoom: 10, // 최소 줌
          endZoom: 18, // 최대 줌
          radius: 2, // 5x5 영역
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDownloadedTiles((prev) => prev + result.downloaded);
        setDownloadStatus(
          `전체 영역 다운로드 완료! ${result.downloaded}개 새 타일 저장됨 (줌 10-18)`
        );

        // 지도 새로고침
        setTimeout(() => {
          map.invalidateSize();
        }, 500);
      } else {
        setDownloadStatus("전체 영역 다운로드 실패: " + result.error);
      }
    } catch (error) {
      console.error("Full range download error:", error);
      setDownloadStatus("전체 영역 다운로드 중 오류 발생: " + error);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(""), 10000);
    }
  };

  // 서울 전체 지역 완전 다운로드
  const downloadSeoulComplete = async () => {
    if (!mapData) return;

    // 확인 메시지
    const confirmDownload = window.confirm(
      "🏙️ 서울 전체 지역의 모든 줌 레벨(10-18) 타일을 다운로드합니다.\n\n" +
        "📊 예상 타일 수: 수천 개 (줌 레벨별로 다름)\n" +
        "⏱️ 예상 시간: 10-30분 (인터넷 속도에 따라)\n" +
        "💾 저장 공간: 수백 MB\n\n" +
        "이 작업 중에는 다른 다운로드를 실행하지 마세요.\n" +
        "계속하시겠습니까?"
    );

    if (!confirmDownload) return;

    setIsDownloading(true);
    setDownloadStatus(
      "🏙️ 서울 전체 지역 다운로드 시작... (진행률은 브라우저 콘솔에서 확인 가능)"
    );

    try {
      const response = await fetch("/api/download-tiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          downloadType: "seoul_complete",
          startZoom: 10,
          endZoom: 18,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDownloadedTiles((prev) => prev + result.downloaded);
        setDownloadStatus(
          `🎉 서울 전체 지역 다운로드 완료!\n\n` +
            `📊 새로 저장된 타일: ${result.downloaded}개\n` +
            `📈 총 처리된 타일: ${result.totalTiles}개\n` +
            `❌ 실패한 타일: ${result.failed}개\n` +
            `🔍 줌 레벨: ${result.zoomLevels}\n` +
            `🗺️ 범위: 의정부~안양, 부천~구리 포함`
        );

        // 지도 새로고침
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 1000);
      } else {
        setDownloadStatus("❌ 서울 전체 지역 다운로드 실패: " + result.error);
      }
    } catch (error) {
      console.error("Seoul complete download error:", error);
      setDownloadStatus("❌ 서울 전체 지역 다운로드 중 오류 발생: " + error);
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadStatus(""), 15000); // 더 긴 표시 시간
    }
  };

  // 줌 컨트롤 함수들 - 정확한 중심점 유지
  const handleZoomIn = () => {
    if (map && mapData) {
      // 현재 화면 중심점을 정확히 가져오기
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      const newZoom = Math.min(currentZoom + 1, mapData.mapConfig.maxZoom);

      console.log(
        `줌 확대: ${currentZoom} → ${newZoom}, 중심점: ${currentCenter.lat.toFixed(
          6
        )}, ${currentCenter.lng.toFixed(6)}`
      );

      // 정확한 중심점을 유지하며 줌
      map.setView([currentCenter.lat, currentCenter.lng], newZoom, {
        animate: true,
        duration: 0.25,
        // 중심점 유지를 위한 정확한 설정
        reset: false,
      });

      // 안정적인 줌 처리 (타일 유지)
      setTimeout(() => {
        map.invalidateSize({ pan: false, animate: false });
      }, 250);
    }
  };

  const handleZoomOut = () => {
    if (map && mapData) {
      // 현재 화면 중심점을 정확히 가져오기
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      const newZoom = Math.max(currentZoom - 1, mapData.mapConfig.minZoom);

      console.log(
        `줌 축소: ${currentZoom} → ${newZoom}, 중심점: ${currentCenter.lat.toFixed(
          6
        )}, ${currentCenter.lng.toFixed(6)}`
      );

      // 정확한 중심점을 유지하며 줌
      map.setView([currentCenter.lat, currentCenter.lng], newZoom, {
        animate: true,
        duration: 0.25,
        // 중심점 유지를 위한 정확한 설정
        reset: false,
      });

      // 안정적인 줌 처리 (타일 유지)
      setTimeout(() => {
        map.invalidateSize({ pan: false, animate: false });
      }, 250);
    }
  };

  const resetView = () => {
    if (map && mapData) {
      // 모든 마커가 보이도록 화면 맞춤
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      const group = new L.featureGroup();
      mapData.markers.forEach((marker) => {
        group.addLayer(new L.marker(marker.position));
      });

      map.fitBounds(group.getBounds().pad(0.1), {
        animate: true,
        duration: 0.5,
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 600);
    }
  };

  if (!isLoaded || !mapData) {
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
    <div className="w-full h-screen overflow-hidden relative">
      {/* 상태 메시지 (상단 고정) */}
      {downloadStatus && (
        <div className="fixed top-4 left-4 right-80 z-[9998] p-3 bg-blue-50/95 backdrop-blur-md border-2 border-blue-300 rounded-lg text-sm shadow-2xl ring-1 ring-blue-500/20">
          <div className="flex items-start justify-between">
            <div className="whitespace-pre-line">{downloadStatus}</div>
            <button
              onClick={() => setDownloadStatus("")}
              className="ml-2 text-blue-600 hover:text-blue-800"
              title="닫기"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 다운로드 컨트롤 패널 (좌측 하단) */}
      <div className="fixed bottom-4 left-4 z-[9998] pointer-events-auto">
        <div className="bg-white/98 backdrop-blur-md rounded-lg shadow-2xl border-2 border-gray-300 p-3 max-w-sm ring-1 ring-black/5">
          <div className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span>📥</span>
            <span>지도 다운로드</span>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={downloadTiles}
                disabled={isDownloading}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isDownloading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
                title="현재 줌 레벨 ±1 다운로드"
              >
                {isDownloading ? "💾 중..." : "💾 기본"}
              </button>

              <button
                onClick={downloadHighResolutionTiles}
                disabled={isDownloading}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isDownloading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
                title="줌 16-18 고해상도 다운로드"
              >
                🔍 고해상도
              </button>
            </div>

            <button
              onClick={downloadFullRange}
              disabled={isDownloading}
              className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
                isDownloading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-purple-500 hover:bg-purple-600 text-white"
              }`}
              title="줌 10-18 전체 레벨 다운로드"
            >
              🗺️ 전체 레벨
            </button>

            <button
              onClick={downloadSeoulComplete}
              disabled={isDownloading}
              className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
                isDownloading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
              title="서울 전체 지역 완전 다운로드 (모든 줌 레벨)"
            >
              🏙️ 서울 완전
            </button>

            <button
              onClick={downloadCurrentViewZoom18}
              disabled={isDownloading}
              className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
                isDownloading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
              title="현재 화면 줌 18 타일 다운로드 (줌 18에서만 사용 가능)"
            >
              📍 현재 화면 Z18
            </button>
          </div>
        </div>
      </div>

      {/* 메인 지도 오버레이 UI (우측 상단) */}
      <MapOverlayUI
        mapInfo={{
          zoom: zoom,
          center: currentCenter,
          markers: mapData?.markers.length || 0,
          downloadedTiles: downloadedTiles,
          debugInfo: debugInfo,
        }}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={resetView}
        showTileNumbers={showTileNumbers}
        onToggleTileNumbers={toggleTileNumbers}
      />

      {/* 지도 영역 (전체 화면) */}
      <div
        ref={mapRef}
        className="w-full h-full relative z-0"
        style={{
          minHeight: "100vh",
          maxWidth: "100vw",
          maxHeight: "100vh",
          overflow: "hidden",
          border: "none",
          outline: "none",
        }}
      />
    </div>
  );
}
