# 🧮 타일 좌표 시스템 실용 예제

## 📋 목차

1. [실시간 계산 도구](#실시간-계산-도구)
2. [서울 지역 상세 분석](#서울-지역-상세-분석)
3. [타일 다운로드 시나리오](#타일-다운로드-시나리오)
4. [성능 최적화 예제](#성능-최적화-예제)
5. [문제 진단 도구](#문제-진단-도구)

---

## 🛠️ 실시간 계산 도구

### 1. 브라우저 콘솔용 계산기

```javascript
// 브라우저 콘솔에서 바로 사용할 수 있는 계산기
const TileCalculator = {
  // 위도/경도 → 타일 좌표
  deg2num(lat, lon, zoom) {
    const lat_rad = (lat * Math.PI) / 180;
    const n = Math.pow(2, zoom);

    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor(
      ((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) /
        2) *
        n
    );

    return { x, y };
  },

  // 타일 좌표 → 위도/경도
  num2deg(x, y, zoom) {
    const n = Math.pow(2, zoom);
    const lon_deg = (x / n) * 360 - 180;
    const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
    const lat_deg = (lat_rad * 180) / Math.PI;

    return { lat: lat_deg, lng: lon_deg };
  },

  // 타일 경로 생성
  getPath(x, y, zoom) {
    return `/tiles/${zoom}/${x}/${y}.png`;
  },

  // 상세 분석
  analyze(lat, lon, zoom) {
    const coords = this.deg2num(lat, lon, zoom);
    const verify = this.num2deg(coords.x, coords.y, zoom);
    const path = this.getPath(coords.x, coords.y, zoom);

    return {
      input: { lat, lon, zoom },
      tileCoords: coords,
      verification: verify,
      filePath: path,
      error: {
        lat: Math.abs(lat - verify.lat),
        lon: Math.abs(lon - verify.lng),
      },
    };
  },
};

// 사용 예시
console.log(TileCalculator.analyze(37.5665, 126.978, 18));
```

### 2. 지역 범위 계산기

```javascript
const RegionCalculator = {
  // 지역 경계 → 타일 범위
  getTileBounds(bounds, zoom) {
    const topLeft = TileCalculator.deg2num(bounds.north, bounds.west, zoom);
    const bottomRight = TileCalculator.deg2num(bounds.south, bounds.east, zoom);

    return {
      minX: topLeft.x,
      maxX: bottomRight.x,
      minY: bottomRight.y,
      maxY: topLeft.y,
      width: bottomRight.x - topLeft.x + 1,
      height: topLeft.y - bottomRight.y + 1,
      totalTiles:
        (bottomRight.x - topLeft.x + 1) * (topLeft.y - bottomRight.y + 1),
    };
  },

  // 타일 범위 → 지역 경계
  getBoundsFromTiles(tileBounds, zoom) {
    const topLeft = TileCalculator.num2deg(
      tileBounds.minX,
      tileBounds.maxY,
      zoom
    );
    const bottomRight = TileCalculator.num2deg(
      tileBounds.maxX,
      tileBounds.minY,
      zoom
    );

    return {
      north: topLeft.lat,
      south: bottomRight.lat,
      east: bottomRight.lng,
      west: topLeft.lng,
    };
  },
};

// 서울 지역 분석 예시
const seoulBounds = {
  north: 37.701,
  south: 37.413,
  east: 127.183,
  west: 126.764,
};

console.log(
  "서울 타일 범위 (줌 18):",
  RegionCalculator.getTileBounds(seoulBounds, 18)
);
```

---

## 🏙️ 서울 지역 상세 분석

### 1. 서울 주요 지점별 타일 좌표

```javascript
const seoulLandmarks = [
  { name: "서울 중심", lat: 37.5665, lng: 126.978 },
  { name: "광화문", lat: 37.5755, lng: 126.9769 },
  { name: "강남", lat: 37.5172, lng: 127.0473 },
  { name: "홍대", lat: 37.5563, lng: 126.9238 },
  { name: "잠실", lat: 37.5139, lng: 127.1006 },
  { name: "여의도", lat: 37.5216, lng: 126.9242 },
  { name: "강북", lat: 37.6396, lng: 127.0257 },
  { name: "송파", lat: 37.5145, lng: 127.1059 },
];

// 모든 줌 레벨에서의 타일 좌표 계산
const seoulTileMap = {};
seoulLandmarks.forEach((landmark) => {
  seoulTileMap[landmark.name] = {};
  for (let zoom = 10; zoom <= 18; zoom++) {
    seoulTileMap[landmark.name][zoom] = TileCalculator.deg2num(
      landmark.lat,
      landmark.lng,
      zoom
    );
  }
});

console.table(seoulTileMap);
```

### 2. 서울 지역 타일 분포 시각화

```javascript
// 서울 지역 타일 맵 생성 (줌 18)
function createSeoulTileMap() {
  const bounds = RegionCalculator.getTileBounds(seoulBounds, 18);
  const map = [];

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    const row = [];
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      // 주요 지점 확인
      const isLandmark = seoulLandmarks.some((landmark) => {
        const coords = TileCalculator.deg2num(landmark.lat, landmark.lng, 18);
        return coords.x === x && coords.y === y;
      });

      row.push(isLandmark ? "📍" : "⬜");
    }
    map.push(row.join(""));
  }

  return map;
}

// 타일 맵 출력
console.log("서울 지역 타일 맵 (줌 18):");
console.log("⬜ = 일반 타일, 📍 = 주요 지점");
createSeoulTileMap().forEach((row) => console.log(row));
```

### 3. 타일 다운로드 우선순위 계산

```javascript
const TilePriorityCalculator = {
  // 중심점으로부터의 거리 계산
  calculateDistance(center, point) {
    const dx = center.x - point.x;
    const dy = center.y - point.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // 우선순위별 타일 정렬
  sortTilesByPriority(centerTile, tileBounds, zoom) {
    const tiles = [];

    for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
      for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
        const distance = this.calculateDistance(centerTile, { x, y });
        tiles.push({ x, y, zoom, distance, priority: 1 / (1 + distance) });
      }
    }

    return tiles.sort((a, b) => b.priority - a.priority);
  },
};

// 서울 중심 기준 우선순위 계산
const seoulCenter = TileCalculator.deg2num(37.5665, 126.978, 18);
const seoulTileBounds = RegionCalculator.getTileBounds(seoulBounds, 18);
const priorityTiles = TilePriorityCalculator.sortTilesByPriority(
  seoulCenter,
  seoulTileBounds,
  18
);

console.log("서울 지역 타일 우선순위 (상위 10개):");
priorityTiles.slice(0, 10).forEach((tile, index) => {
  console.log(
    `${index + 1}. ${tile.zoom}/${tile.x}/${
      tile.y
    } (우선순위: ${tile.priority.toFixed(4)})`
  );
});
```

---

## 📥 타일 다운로드 시나리오

### 1. 점진적 다운로드 전략

```javascript
const ProgressiveDownloader = {
  // 1단계: 저해상도 전체 다운로드
  async downloadLowRes(bounds, maxZoom = 13) {
    console.log(`1단계: 줌 10-${maxZoom} 전체 지역 다운로드`);

    for (let zoom = 10; zoom <= maxZoom; zoom++) {
      const tileBounds = RegionCalculator.getTileBounds(bounds, zoom);
      await this.downloadTilesInBounds(tileBounds, zoom);
    }
  },

  // 2단계: 고해상도 중심 지역 다운로드
  async downloadHighResCenter(center, radius = 2, minZoom = 14) {
    console.log(`2단계: 중심점 주변 고해상도 다운로드 (줌 ${minZoom}-18)`);

    for (let zoom = minZoom; zoom <= 18; zoom++) {
      const centerTile = TileCalculator.deg2num(center.lat, center.lng, zoom);

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = centerTile.x + dx;
          const y = centerTile.y + dy;
          await this.downloadTile(x, y, zoom);
        }
      }
    }
  },

  // 3단계: 사용자 이동에 따른 동적 다운로드
  async downloadOnDemand(center, zoom, radius = 1) {
    console.log(`3단계: 사용자 위치 기반 동적 다운로드 (줌 ${zoom})`);

    const centerTile = TileCalculator.deg2num(center.lat, center.lng, zoom);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerTile.x + dx;
        const y = centerTile.y + dy;

        if (!this.tileExists(x, y, zoom)) {
          await this.downloadTile(x, y, zoom);
        }
      }
    }
  },

  // 실제 다운로드 함수 (시뮬레이션)
  async downloadTile(x, y, zoom) {
    const path = TileCalculator.getPath(x, y, zoom);
    console.log(`다운로드: ${path}`);
    // 실제 구현에서는 fetch() 사용
    await new Promise((resolve) => setTimeout(resolve, 100)); // 시뮬레이션 지연
  },

  // 타일 존재 확인 (시뮬레이션)
  tileExists(x, y, zoom) {
    // 실제 구현에서는 파일 시스템 확인
    return Math.random() > 0.7; // 30% 확률로 타일이 없음
  },

  // 범위 내 타일 다운로드
  async downloadTilesInBounds(tileBounds, zoom) {
    const totalTiles = tileBounds.totalTiles;
    let downloaded = 0;

    for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
      for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
        await this.downloadTile(x, y, zoom);
        downloaded++;

        if (downloaded % 100 === 0) {
          console.log(
            `진행률: ${downloaded}/${totalTiles} (${Math.round(
              (downloaded / totalTiles) * 100
            )}%)`
          );
        }
      }
    }
  },
};

// 서울 지역 점진적 다운로드 실행
async function downloadSeoulProgressive() {
  const seoulCenter = { lat: 37.5665, lng: 126.978 };

  console.log("=== 서울 지역 점진적 다운로드 시작 ===");

  // 1단계: 저해상도 전체
  await ProgressiveDownloader.downloadLowRes(seoulBounds, 13);

  // 2단계: 고해상도 중심
  await ProgressiveDownloader.downloadHighResCenter(seoulCenter, 3, 14);

  // 3단계: 동적 다운로드 (시뮬레이션)
  await ProgressiveDownloader.downloadOnDemand(seoulCenter, 18, 2);

  console.log("=== 다운로드 완료 ===");
}

// 실행
// downloadSeoulProgressive();
```

### 2. 스마트 캐싱 전략

```javascript
const SmartCache = {
  // LRU 캐시 구현
  cache: new Map(),
  maxSize: 1000,

  // 캐시 키 생성
  getKey(x, y, zoom) {
    return `${zoom}/${x}/${y}`;
  },

  // 캐시에서 타일 가져오기
  get(x, y, zoom) {
    const key = this.getKey(x, y, zoom);
    if (this.cache.has(key)) {
      // LRU: 사용된 항목을 맨 뒤로 이동
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  },

  // 캐시에 타일 저장
  set(x, y, zoom, data) {
    const key = this.getKey(x, y, zoom);

    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, data);
  },

  // 캐시 통계
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: Math.round((this.cache.size / this.maxSize) * 100),
    };
  },

  // 캐시 정리 (오래된 항목 제거)
  cleanup() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30분

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  },
};

// 스마트 타일 로더
const SmartTileLoader = {
  async loadTile(x, y, zoom) {
    // 1. 캐시 확인
    let tile = SmartCache.get(x, y, zoom);
    if (tile) {
      console.log(`캐시 히트: ${zoom}/${x}/${y}`);
      return tile.data;
    }

    // 2. 로컬 파일 확인
    tile = await this.loadFromLocal(x, y, zoom);
    if (tile) {
      console.log(`로컬 히트: ${zoom}/${x}/${y}`);
      SmartCache.set(x, y, zoom, { data: tile, timestamp: Date.now() });
      return tile;
    }

    // 3. 온라인 다운로드
    console.log(`다운로드: ${zoom}/${x}/${y}`);
    tile = await this.downloadFromOnline(x, y, zoom);

    // 4. 로컬 저장 및 캐시 업데이트
    await this.saveToLocal(x, y, zoom, tile);
    SmartCache.set(x, y, zoom, { data: tile, timestamp: Date.now() });

    return tile;
  },

  // 로컬 파일 로드 (시뮬레이션)
  async loadFromLocal(x, y, zoom) {
    // 실제 구현에서는 파일 시스템 확인
    return Math.random() > 0.5 ? `local-tile-${zoom}-${x}-${y}` : null;
  },

  // 온라인 다운로드 (시뮬레이션)
  async downloadFromOnline(x, y, zoom) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return `online-tile-${zoom}-${x}-${y}`;
  },

  // 로컬 저장 (시뮬레이션)
  async saveToLocal(x, y, zoom, data) {
    console.log(`로컬 저장: ${zoom}/${x}/${y}`);
    // 실제 구현에서는 파일 시스템에 저장
  },
};
```

---

## ⚡ 성능 최적화 예제

### 1. 병렬 다운로드 최적화

```javascript
const ParallelDownloader = {
  // 동시 다운로드 제한
  maxConcurrent: 5,
  activeDownloads: 0,
  queue: [],

  // 다운로드 큐 관리
  async processQueue() {
    while (this.queue.length > 0 && this.activeDownloads < this.maxConcurrent) {
      const download = this.queue.shift();
      this.activeDownloads++;

      download().finally(() => {
        this.activeDownloads--;
        this.processQueue();
      });
    }
  },

  // 타일 다운로드 요청
  async downloadTile(x, y, zoom) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.performDownload(x, y, zoom);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  },

  // 실제 다운로드 수행
  async performDownload(x, y, zoom) {
    console.log(`다운로드 시작: ${zoom}/${x}/${y}`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log(`다운로드 완료: ${zoom}/${x}/${y}`);
    return `tile-${zoom}-${x}-${y}`;
  },

  // 배치 다운로드
  async downloadBatch(tiles) {
    const promises = tiles.map((tile) =>
      this.downloadTile(tile.x, tile.y, tile.zoom)
    );

    return Promise.allSettled(promises);
  },
};

// 병렬 다운로드 테스트
async function testParallelDownload() {
  const tiles = [
    { x: 219136, y: 101120, zoom: 18 },
    { x: 219137, y: 101120, zoom: 18 },
    { x: 219136, y: 101121, zoom: 18 },
    { x: 219137, y: 101121, zoom: 18 },
    { x: 219138, y: 101120, zoom: 18 },
    { x: 219138, y: 101121, zoom: 18 },
    { x: 219136, y: 101122, zoom: 18 },
    { x: 219137, y: 101122, zoom: 18 },
  ];

  console.log("병렬 다운로드 시작...");
  const startTime = Date.now();

  const results = await ParallelDownloader.downloadBatch(tiles);

  const endTime = Date.now();
  console.log(`다운로드 완료: ${endTime - startTime}ms`);
  console.log("결과:", results);
}
```

### 2. 메모리 사용량 최적화

```javascript
const MemoryOptimizer = {
  // 타일 데이터 압축
  compressTileData(data) {
    // 실제 구현에서는 이미지 압축 알고리즘 사용
    return {
      compressed: true,
      originalSize: data.length,
      compressedSize: Math.floor(data.length * 0.7), // 30% 압축 가정
      data: data, // 실제로는 압축된 데이터
    };
  },

  // 타일 데이터 압축 해제
  decompressTileData(compressedData) {
    // 실제 구현에서는 압축 해제 알고리즘 사용
    return compressedData.data;
  },

  // 메모리 사용량 모니터링
  getMemoryUsage() {
    if (typeof performance !== "undefined" && performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
      };
    }
    return null;
  },

  // 메모리 정리
  cleanup() {
    // 가비지 컬렉션 요청
    if (typeof global !== "undefined" && global.gc) {
      global.gc();
    }

    // 캐시 정리
    SmartCache.cleanup();

    console.log("메모리 정리 완료");
  },
};

// 메모리 사용량 모니터링
function monitorMemory() {
  setInterval(() => {
    const usage = MemoryOptimizer.getMemoryUsage();
    if (usage) {
      console.log(
        `메모리 사용량: ${usage.used}MB / ${usage.total}MB (${usage.limit}MB 제한)`
      );

      // 메모리 사용량이 80%를 넘으면 정리
      if (usage.used / usage.total > 0.8) {
        console.log("메모리 사용량 높음 - 정리 시작");
        MemoryOptimizer.cleanup();
      }
    }
  }, 5000);
}
```

---

## 🔍 문제 진단 도구

### 1. 타일 좌표 검증 도구

```javascript
const TileValidator = {
  // 좌표 변환 정확도 검증
  validateCoordinateConversion(lat, lon, zoom) {
    const forward = TileCalculator.deg2num(lat, lon, zoom);
    const reverse = TileCalculator.num2deg(forward.x, forward.y, zoom);

    const error = {
      lat: Math.abs(lat - reverse.lat),
      lon: Math.abs(lon - reverse.lng),
    };

    const isValid = error.lat < 0.001 && error.lon < 0.001;

    return {
      input: { lat, lon, zoom },
      forward: forward,
      reverse: reverse,
      error: error,
      isValid: isValid,
      message: isValid ? "✅ 정확함" : "❌ 오차 발생",
    };
  },

  // 타일 범위 유효성 검증
  validateTileBounds(bounds, zoom) {
    const tileBounds = RegionCalculator.getTileBounds(bounds, zoom);
    const maxTile = Math.pow(2, zoom) - 1;

    const issues = [];

    if (tileBounds.minX < 0) issues.push("X 좌표가 음수");
    if (tileBounds.maxX > maxTile) issues.push("X 좌표가 최대값 초과");
    if (tileBounds.minY < 0) issues.push("Y 좌표가 음수");
    if (tileBounds.maxY > maxTile) issues.push("Y 좌표가 최대값 초과");

    return {
      bounds: bounds,
      zoom: zoom,
      tileBounds: tileBounds,
      maxTile: maxTile,
      isValid: issues.length === 0,
      issues: issues,
    };
  },

  // 타일 경로 유효성 검증
  validateTilePath(x, y, zoom) {
    const path = TileCalculator.getPath(x, y, zoom);
    const maxTile = Math.pow(2, zoom) - 1;

    const issues = [];

    if (x < 0 || x > maxTile) issues.push("X 좌표 범위 오류");
    if (y < 0 || y > maxTile) issues.push("Y 좌표 범위 오류");
    if (zoom < 0 || zoom > 18) issues.push("줌 레벨 범위 오류");

    return {
      coords: { x, y, zoom },
      path: path,
      maxTile: maxTile,
      isValid: issues.length === 0,
      issues: issues,
    };
  },
};

// 검증 도구 사용 예시
function runValidations() {
  console.log("=== 타일 좌표 검증 ===");

  // 1. 좌표 변환 검증
  const conversionTest = TileValidator.validateCoordinateConversion(
    37.5665,
    126.978,
    18
  );
  console.log("좌표 변환:", conversionTest);

  // 2. 타일 범위 검증
  const boundsTest = TileValidator.validateTileBounds(seoulBounds, 18);
  console.log("타일 범위:", boundsTest);

  // 3. 타일 경로 검증
  const pathTest = TileValidator.validateTilePath(219136, 101120, 18);
  console.log("타일 경로:", pathTest);
}
```

### 2. 성능 분석 도구

```javascript
const PerformanceAnalyzer = {
  // 다운로드 성능 측정
  async measureDownloadPerformance(tiles) {
    const results = [];

    for (const tile of tiles) {
      const startTime = Date.now();

      try {
        await ParallelDownloader.downloadTile(tile.x, tile.y, tile.zoom);
        const endTime = Date.now();

        results.push({
          tile: `${tile.zoom}/${tile.x}/${tile.y}`,
          success: true,
          duration: endTime - startTime,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        results.push({
          tile: `${tile.zoom}/${tile.x}/${tile.y}`,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return this.analyzeResults(results);
  },

  // 결과 분석
  analyzeResults(results) {
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const durations = successful.map((r) => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / results.length) * 100,
      performance: {
        average: Math.round(avgDuration),
        minimum: minDuration,
        maximum: maxDuration,
      },
      errors: failed.map((f) => f.error),
    };
  },

  // 캐시 성능 분석
  analyzeCachePerformance() {
    const stats = SmartCache.getStats();
    const memoryUsage = MemoryOptimizer.getMemoryUsage();

    return {
      cache: stats,
      memory: memoryUsage,
      efficiency: {
        hitRate: Math.random() * 100, // 실제 구현에서는 실제 히트율 계산
        compressionRatio: 0.7, // 30% 압축
        memoryEfficiency: memoryUsage
          ? (memoryUsage.used / memoryUsage.total) * 100
          : null,
      },
    };
  },
};

// 성능 분석 실행
async function runPerformanceAnalysis() {
  console.log("=== 성능 분석 시작 ===");

  // 다운로드 성능 테스트
  const testTiles = [
    { x: 219136, y: 101120, zoom: 18 },
    { x: 219137, y: 101120, zoom: 18 },
    { x: 219136, y: 101121, zoom: 18 },
    { x: 219137, y: 101121, zoom: 18 },
    { x: 219138, y: 101120, zoom: 18 },
  ];

  const downloadPerformance =
    await PerformanceAnalyzer.measureDownloadPerformance(testTiles);
  console.log("다운로드 성능:", downloadPerformance);

  // 캐시 성능 분석
  const cachePerformance = PerformanceAnalyzer.analyzeCachePerformance();
  console.log("캐시 성능:", cachePerformance);
}
```

---

## 🎯 실용적 사용 팁

### 1. 브라우저 콘솔에서 바로 사용

```javascript
// 위의 모든 도구들을 브라우저 콘솔에 복사하여 붙여넣기
// 그 후 다음과 같이 사용:

// 서울 중심점 타일 좌표 확인
TileCalculator.analyze(37.5665, 126.978, 18);

// 서울 지역 타일 범위 확인
RegionCalculator.getTileBounds(seoulBounds, 18);

// 성능 분석 실행
runPerformanceAnalysis();
```

### 2. 실제 프로젝트에 통합

```javascript
// utils/tileCalculator.js
export { TileCalculator, RegionCalculator, SmartCache, ParallelDownloader };

// 사용 예시
import { TileCalculator } from "./utils/tileCalculator.js";

const coords = TileCalculator.deg2num(37.5665, 126.978, 18);
console.log("서울 중심 타일:", coords);
```

### 3. 디버깅 시 활용

```javascript
// 문제가 있는 타일 좌표 검증
const problemTile = TileValidator.validateTilePath(999999, 999999, 18);
console.log("문제 타일:", problemTile);

// 성능 문제 진단
const performance = PerformanceAnalyzer.analyzeCachePerformance();
console.log("성능 상태:", performance);
```

이 문서의 도구들을 활용하면 타일 좌표 시스템을 효율적으로 다루고 문제를 빠르게 진단할 수 있습니다! 🛠️✨
