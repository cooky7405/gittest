import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// 타일 좌표 계산 함수 - Leaflet 표준 웹 메르카토르 투영
function deg2num(lat: number, lon: number, zoom: number) {
  // 위도/경도를 타일 좌표로 변환 (Leaflet과 동일한 계산)
  const lat_rad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);

  // X 좌표: 경도를 타일 X로 변환
  const x = Math.floor(((lon + 180) / 360) * n);

  // Y 좌표: 위도를 웹 메르카토르 투영으로 변환
  const y = Math.floor(
    ((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2) *
      n
  );

  return { x, y };
}

// 역변환 함수 - 타일 좌표를 위도/경도로 변환 (검증용)
function num2deg(x: number, y: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const lon_deg = (x / n) * 360 - 180;
  const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat_deg = (lat_rad * 180) / Math.PI;
  return { lat: lat_deg, lng: lon_deg };
}

// 서울 전체 지역 완전 다운로드 함수
async function downloadSeoulComplete(minZoom: number, maxZoom: number) {
  console.log(`서울 전체 지역 다운로드 시작: 줌 ${minZoom}-${maxZoom}`);

  // 서울 전체 지역 경계 (여유를 두고 설정)
  const seoulBounds = {
    north: 37.701, // 의정부 근처까지
    south: 37.413, // 안양, 과천 근처까지
    east: 127.183, // 구리, 하남 근처까지
    west: 126.764, // 부천, 김포 근처까지
  };

  const downloadedTiles: string[] = [];
  const failedTiles: string[] = [];
  let totalTiles = 0;
  let processedTiles = 0;

  for (let currentZoom = minZoom; currentZoom <= maxZoom; currentZoom++) {
    console.log(`줌 레벨 ${currentZoom} 다운로드 시작...`);

    // 경계를 타일 좌표로 변환
    const topLeft = deg2num(seoulBounds.north, seoulBounds.west, currentZoom);
    const bottomRight = deg2num(
      seoulBounds.south,
      seoulBounds.east,
      currentZoom
    );

    // 이 줌 레벨에서의 총 타일 수 계산
    const tilesInZoom =
      (bottomRight.x - topLeft.x + 1) * (bottomRight.y - topLeft.y + 1);
    totalTiles += tilesInZoom;

    console.log(
      `줌 ${currentZoom}: 타일 범위 X(${topLeft.x}-${bottomRight.x}), Y(${topLeft.y}-${bottomRight.y}), 총 ${tilesInZoom}개`
    );

    // 타일 다운로드
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        processedTiles++;

        // 유효한 타일 좌표인지 확인
        if (
          x >= 0 &&
          y >= 0 &&
          x < Math.pow(2, currentZoom) &&
          y < Math.pow(2, currentZoom)
        ) {
          const tileDir = path.join(
            process.cwd(),
            "public",
            "tiles",
            currentZoom.toString(),
            x.toString()
          );
          const tilePath = path.join(tileDir, `${y}.png`);

          // 이미 존재하면 건너뛰기
          if (fs.existsSync(tilePath)) {
            continue;
          }

          const tileBuffer = await downloadTile(x, y, currentZoom);

          if (tileBuffer) {
            fs.mkdirSync(tileDir, { recursive: true });
            fs.writeFileSync(tilePath, tileBuffer);
            downloadedTiles.push(`${currentZoom}/${x}/${y}`);

            // 진행률 로그 (매 100개마다)
            if (downloadedTiles.length % 100 === 0) {
              console.log(
                `진행률: ${
                  downloadedTiles.length
                }개 다운로드 완료 (${Math.round(
                  (processedTiles / totalTiles) * 100
                )}%)`
              );
            }

            // 다운로드 속도 제한
            await new Promise((resolve) => setTimeout(resolve, 100));
          } else {
            failedTiles.push(`${currentZoom}/${x}/${y}`);
          }
        }
      }
    }

    console.log(
      `줌 레벨 ${currentZoom} 완료: 새로 다운로드 ${
        downloadedTiles.filter((t) => t.startsWith(`${currentZoom}/`)).length
      }개`
    );
  }

  return {
    success: true,
    message: "서울 전체 지역 다운로드 완료",
    totalTiles,
    downloaded: downloadedTiles.length,
    failed: failedTiles.length,
    zoomLevels: `${minZoom}-${maxZoom}`,
    seoulBounds,
    downloadedTiles: downloadedTiles.slice(0, 50), // 처음 50개만 표시
    failedTiles: failedTiles.slice(0, 20), // 처음 20개만 표시
  };
}

// 타일 다운로드 함수
async function downloadTile(
  x: number,
  y: number,
  z: number
): Promise<Buffer | null> {
  try {
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

    // User-Agent 헤더 추가 (OpenStreetMap 정책)
    const response = await fetch(url, {
      headers: {
        "User-Agent": "LocalMapApp/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Failed to download tile ${z}/${x}/${y}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { lat, lng, zoom, startZoom, endZoom, radius, downloadType } =
      await request.json();

    // 다운로드 타입에 따른 설정
    if (downloadType === "seoul_complete") {
      // 서울 전체 지역 완전 다운로드
      return await downloadSeoulComplete(startZoom || 10, endZoom || 18);
    }

    // 기본 다운로드 (기존 방식)
    const minZoom = startZoom || zoom || 10;
    const maxZoom = endZoom || zoom || 16;
    const tileRadius = radius || 2;

    const downloadedTiles: string[] = [];
    const failedTiles: string[] = [];
    let totalTiles = 0;

    // 여러 줌 레벨에 대해 타일 다운로드
    for (let currentZoom = minZoom; currentZoom <= maxZoom; currentZoom++) {
      const centerTile = deg2num(lat, lng, currentZoom);

      // 디버깅: 중심 타일 좌표 로그 및 검증
      const verifyCoords = num2deg(centerTile.x, centerTile.y, currentZoom);
      console.log(
        `줌 ${currentZoom}: 요청 ${lat.toFixed(6)}, ${lng.toFixed(6)} → 타일 ${
          centerTile.x
        }, ${centerTile.y} → 검증 ${verifyCoords.lat.toFixed(
          6
        )}, ${verifyCoords.lng.toFixed(6)}`
      );

      // 중심점 주변의 타일들 다운로드 (radius x radius 영역)
      for (let dx = -tileRadius; dx <= tileRadius; dx++) {
        for (let dy = -tileRadius; dy <= tileRadius; dy++) {
          const x = centerTile.x + dx;
          const y = centerTile.y + dy;

          // 유효한 타일 좌표인지 확인
          if (
            x >= 0 &&
            y >= 0 &&
            x < Math.pow(2, currentZoom) &&
            y < Math.pow(2, currentZoom)
          ) {
            totalTiles++;

            // 이미 존재하는 타일인지 확인
            const tileDir = path.join(
              process.cwd(),
              "public",
              "tiles",
              currentZoom.toString(),
              x.toString()
            );
            const tilePath = path.join(tileDir, `${y}.png`);

            // 이미 존재하면 건너뛰기
            if (fs.existsSync(tilePath)) {
              continue;
            }

            const tileBuffer = await downloadTile(x, y, currentZoom);

            if (tileBuffer) {
              // 디렉토리 생성
              fs.mkdirSync(tileDir, { recursive: true });

              // 타일 파일 저장
              fs.writeFileSync(tilePath, tileBuffer);
              downloadedTiles.push(`${currentZoom}/${x}/${y}`);

              // 다운로드 속도 제한 (OpenStreetMap 정책 준수)
              await new Promise((resolve) => setTimeout(resolve, 150));
            } else {
              failedTiles.push(`${currentZoom}/${x}/${y}`);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalTiles,
      downloaded: downloadedTiles.length,
      failed: failedTiles.length,
      zoomLevels: `${minZoom}-${maxZoom}`,
      downloadedTiles: downloadedTiles.slice(0, 20), // 처음 20개만 표시
      failedTiles: failedTiles.slice(0, 10), // 처음 10개만 표시
    });
  } catch (error) {
    console.error("Tile download error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download tiles" },
      { status: 500 }
    );
  }
}
