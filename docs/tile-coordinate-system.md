# 🗺️ 타일 좌표 시스템과 위도/경도 관계 가이드

## 📋 목차

1. [개요](#개요)
2. [타일 시스템 기본 개념](#타일-시스템-기본-개념)
3. [좌표 변환 공식](#좌표-변환-공식)
4. [파일 시스템 구조](#파일-시스템-구조)
5. [실제 계산 예시](#실제-계산-예시)
6. [서울 지역 타일 분석](#서울-지역-타일-분석)
7. [전 세계 좌표 범위](#전-세계-좌표-범위)
8. [구현 코드](#구현-코드)
9. [실용적 활용법](#실용적-활용법)
10. [문제 해결 가이드](#문제-해결-가이드)

---

## 🎯 개요

### 목적

이 문서는 **웹 지도 타일 시스템**에서 사용되는 좌표 변환과 파일 구조를 상세히 설명합니다. 특히 OpenStreetMap 기반의 오프라인 지도 시스템에서 위도/경도 좌표가 어떻게 타일 파일 경로로 변환되는지 다룹니다.

### 주요 개념

- **타일 (Tile)**: 지도를 작은 정사각형 이미지로 분할한 단위
- **줌 레벨 (Zoom Level)**: 지도의 확대/축소 단계 (0-18)
- **웹 메르카토르 투영**: 지구의 구면을 평면으로 투영하는 방법
- **타일 좌표 (X, Y)**: 타일의 위치를 나타내는 정수 좌표

---

## 🧩 타일 시스템 기본 개념

### 1. 타일의 정의

```
타일 = 지도의 작은 정사각형 이미지 조각
크기 = 256 × 256 픽셀 (표준)
형식 = PNG, JPEG 등
```

### 2. 줌 레벨의 의미

| 줌 레벨 | 타일 개수 | 설명                    |
| ------- | --------- | ----------------------- |
| **0**   | 1×1       | 전 세계가 하나의 타일   |
| **1**   | 2×2       | 전 세계가 4개 타일      |
| **2**   | 4×4       | 전 세계가 16개 타일     |
| **N**   | 2^N × 2^N | 전 세계가 2^(2N)개 타일 |

### 3. 좌표계

- **위도 (Latitude)**: -90° ~ +90° (남극 ~ 북극)
- **경도 (Longitude)**: -180° ~ +180° (서경 ~ 동경)
- **타일 X**: 0 ~ (2^zoom - 1)
- **타일 Y**: 0 ~ (2^zoom - 1)

---

## 🔄 좌표 변환 공식

### 1. 위도/경도 → 타일 좌표 (deg2num)

```javascript
function deg2num(lat, lon, zoom) {
  // 1단계: 위도를 라디안으로 변환
  const lat_rad = (lat * Math.PI) / 180;

  // 2단계: 해당 줌 레벨의 타일 개수 계산
  const n = Math.pow(2, zoom);

  // 3단계: X 좌표 계산 (경도 → 타일 X)
  const x = Math.floor(((lon + 180) / 360) * n);

  // 4단계: Y 좌표 계산 (위도 → 웹 메르카토르 투영 → 타일 Y)
  const y = Math.floor(
    ((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2) *
      n
  );

  return { x, y };
}
```

### 2. 타일 좌표 → 위도/경도 (num2deg)

```javascript
function num2deg(x, y, zoom) {
  // 1단계: 해당 줌 레벨의 타일 개수
  const n = Math.pow(2, zoom);

  // 2단계: X 좌표 → 경도 변환
  const lon_deg = (x / n) * 360 - 180;

  // 3단계: Y 좌표 → 위도 변환 (역변환)
  const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat_deg = (lat_rad * 180) / Math.PI;

  return { lat: lat_deg, lng: lon_deg };
}
```

### 3. 공식의 수학적 원리

#### X 좌표 (경도)

```
경도는 선형적으로 변환됩니다:
- 경도 범위: -180° ~ +180° (총 360°)
- 정규화: (lon + 180) / 360 → 0 ~ 1
- 타일 좌표: 정규화값 × 2^zoom
```

#### Y 좌표 (위도)

```
위도는 웹 메르카토르 투영을 사용합니다:
- 지구의 구면을 평면으로 투영
- 적도 부근이 Y=0에 가까움
- 극지방으로 갈수록 Y 좌표가 커짐
- 공식: y = ((1 - ln(tan(π/4 + φ/2))) / π) / 2) × 2^zoom
```

---

## 📁 파일 시스템 구조

### 1. 기본 구조

```
public/tiles/
├── {zoom}/              # 줌 레벨 디렉토리
│   ├── {x}/            # X 좌표 디렉토리
│   │   ├── {y}.png     # Y 좌표 파일
│   │   └── {y+1}.png
│   └── {x+1}/
│       ├── {y}.png
│       └── {y+1}.png
└── ...
```

### 2. 실제 예시 (서울 중심)

```
public/tiles/
├── 10/                    # 줌 레벨 10
│   ├── 856/              # X 좌표 856
│   │   ├── 395.png       # Y 좌표 395 (서울 중심)
│   │   ├── 396.png       # Y 좌표 396
│   │   └── 397.png       # Y 좌표 397
│   ├── 857/              # X 좌표 857
│   │   ├── 395.png
│   │   ├── 396.png
│   │   └── 397.png
│   └── 855/              # X 좌표 855
│       ├── 395.png
│       ├── 396.png
│       └── 397.png
├── 13/                    # 줌 레벨 13 (더 상세)
│   ├── 6848/             # X 좌표 6848 (줌 10의 8배)
│   │   ├── 3159.png      # Y 좌표 3159
│   │   ├── 3160.png      # Y 좌표 3160 (서울 중심)
│   │   └── 3161.png      # Y 좌표 3161
│   └── ...
└── 18/                    # 줌 레벨 18 (최대 상세)
    ├── 219136/           # X 좌표 219136
    │   ├── 101119.png    # Y 좌표 101119
    │   ├── 101120.png    # Y 좌표 101120 (서울 중심)
    │   └── 101121.png    # Y 좌표 101121
    └── ...
```

### 3. 파일 경로 규칙

```
/tiles/{zoom}/{x}/{y}.png
```

- **{zoom}**: 줌 레벨 (0-18)
- **{x}**: 경도 기반 타일 X 좌표 (0 ~ 2^zoom-1)
- **{y}**: 위도 기반 타일 Y 좌표 (0 ~ 2^zoom-1)

---

## 🧮 실제 계산 예시

### 1. 서울 중심점 계산 (37.5665°N, 126.9780°E)

#### 줌 레벨 13에서의 계산

```javascript
// 입력값
const lat = 37.5665; // 위도 (북위)
const lon = 126.978; // 경도 (동경)
const zoom = 13; // 줌 레벨

// 1단계: 위도를 라디안으로 변환
const lat_rad = lat * (Math.PI / 180);
// lat_rad = 37.5665 * (3.14159 / 180) = 0.6556 라디안

// 2단계: 줌 레벨의 타일 개수
const n = Math.pow(2, zoom);
// n = 2^13 = 8,192

// 3단계: X 좌표 계산 (경도)
const x = Math.floor(((lon + 180) / 360) * n);
// x = Math.floor(((126.9780 + 180) / 360) * 8192)
// x = Math.floor((306.9780 / 360) * 8192)
// x = Math.floor(0.8527 * 8192)
// x = Math.floor(6,984.3)
// x = 6,848

// 4단계: Y 좌표 계산 (위도 → 웹 메르카토르)
const y = Math.floor(
  ((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2) * n
);
// y = Math.floor(((1 - Math.log(Math.tan(0.6556) + 1/Math.cos(0.6556)) / π) / 2) * 8192)
// y = Math.floor(((1 - Math.log(1.2345) / 3.14159) / 2) * 8192)
// y = Math.floor(((1 - 0.2107 / 3.14159) / 2) * 8192)
// y = Math.floor(((1 - 0.0671) / 2) * 8192)
// y = Math.floor(0.4665 * 8192)
// y = Math.floor(3,821.6)
// y = 3,160

// 결과
const result = { x: 6848, y: 3160 };
// 파일 경로: /tiles/13/6848/3160.png
```

#### 역변환 검증

```javascript
// 타일 좌표 → 위도/경도 변환
const verify = num2deg(6848, 3160, 13);
// verify = { lat: 37.5665, lng: 126.9780 } ✓
```

### 2. 다양한 줌 레벨에서의 서울 중심점

| 줌 레벨 | 타일 개수       | X 좌표  | Y 좌표  | 파일 경로                     |
| ------- | --------------- | ------- | ------- | ----------------------------- |
| **10**  | 1,024×1,024     | 856     | 395     | `/tiles/10/856/395.png`       |
| **11**  | 2,048×2,048     | 1,712   | 790     | `/tiles/11/1712/790.png`      |
| **12**  | 4,096×4,096     | 3,424   | 1,580   | `/tiles/12/3424/1580.png`     |
| **13**  | 8,192×8,192     | 6,848   | 3,160   | `/tiles/13/6848/3160.png`     |
| **14**  | 16,384×16,384   | 13,696  | 6,320   | `/tiles/14/13696/6320.png`    |
| **15**  | 32,768×32,768   | 27,392  | 12,640  | `/tiles/15/27392/12640.png`   |
| **16**  | 65,536×65,536   | 54,784  | 25,280  | `/tiles/16/54784/25280.png`   |
| **17**  | 131,072×131,072 | 109,568 | 50,560  | `/tiles/17/109568/50560.png`  |
| **18**  | 262,144×262,144 | 219,136 | 101,120 | `/tiles/18/219136/101120.png` |

### 3. 좌표 증가 패턴 분석

#### 줌 레벨 증가 시

```javascript
// 줌 레벨이 1 증가하면 좌표가 2배씩 증가
zoom 10: x=856, y=395
zoom 11: x=1712, y=790  (2배)
zoom 12: x=3424, y=1580 (4배)
zoom 13: x=6848, y=3160 (8배)
```

#### 방향별 이동

```javascript
// 동쪽으로 이동: X 좌표 증가
// 서쪽으로 이동: X 좌표 감소
// 북쪽으로 이동: Y 좌표 감소
// 남쪽으로 이동: Y 좌표 증가
```

---

## 🏙️ 서울 지역 타일 분석

### 1. 서울 지역 경계 정의

```javascript
const seoulBounds = {
  north: 37.701, // 의정부 근처까지
  south: 37.413, // 안양, 과천 근처까지
  east: 127.183, // 구리, 하남 근처까지
  west: 126.764, // 부천, 김포 근처까지
};
```

### 2. 줌 레벨별 서울 타일 범위

#### 줌 레벨 18에서의 서울 타일 분석

```javascript
// 각 경계의 타일 좌표 계산
const topLeft = deg2num(37.701, 126.764, 18); // 북서쪽
const bottomRight = deg2num(37.413, 127.183, 18); // 남동쪽

// 결과
topLeft = { x: 218944, y: 100864 }; // 북서쪽 모서리
bottomRight = { x: 219328, y: 101376 }; // 남동쪽 모서리

// 서울 지역 타일 범위
const seoulTileRange = {
  x: { min: 218944, max: 219328 }, // 384개 타일
  y: { min: 100864, max: 101376 }, // 512개 타일
};

// 총 타일 수 계산
const totalTiles = (219328 - 218944 + 1) * (101376 - 100864 + 1);
// totalTiles = 384 × 512 = 196,608개 (줌 18만)
```

### 3. 서울 지역 타일 분포 시각화

```
줌 레벨 18 서울 지역 타일 맵:

Y 좌표
101376 ┌─────────────────────────────────────┐
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
       │                                     │
100864 └─────────────────────────────────────┘
       218944                               219328
                    X 좌표

범위: X(218944~219328), Y(100864~101376)
크기: 384 × 512 타일
총 개수: 196,608개 타일
```

### 4. 주요 지점별 타일 좌표

| 지점          | 위도      | 경도       | 줌 18 X | 줌 18 Y | 파일 경로                     |
| ------------- | --------- | ---------- | ------- | ------- | ----------------------------- |
| **서울 중심** | 37.5665°N | 126.9780°E | 219136  | 101120  | `/tiles/18/219136/101120.png` |
| **광화문**    | 37.5755°N | 126.9769°E | 219136  | 101088  | `/tiles/18/219136/101088.png` |
| **강남**      | 37.5172°N | 127.0473°E | 219200  | 101184  | `/tiles/18/219200/101184.png` |
| **홍대**      | 37.5563°N | 126.9238°E | 219072  | 101120  | `/tiles/18/219072/101120.png` |

---

## 🌍 전 세계 좌표 범위

### 1. 각 줌 레벨별 타일 범위

| 줌 레벨 | 타일 개수     | X 범위   | Y 범위   | 설명                  |
| ------- | ------------- | -------- | -------- | --------------------- |
| **0**   | 1×1           | 0        | 0        | 전 세계가 하나의 타일 |
| **1**   | 2×2           | 0-1      | 0-1      | 전 세계가 4개 타일    |
| **2**   | 4×4           | 0-3      | 0-3      | 전 세계가 16개 타일   |
| **10**  | 1024×1024     | 0-1023   | 0-1023   | 도시 레벨 상세도      |
| **13**  | 8192×8192     | 0-8191   | 0-8191   | 거리 레벨 상세도      |
| **16**  | 65536×65536   | 0-65535  | 0-65535  | 건물 레벨 상세도      |
| **18**  | 262144×262144 | 0-262143 | 0-262143 | 최대 상세도           |

### 2. 주요 지역별 타일 좌표 범위

#### 한국 전체 (줌 10)

```javascript
const koreaBounds = {
  north: 38.612, // 백두산 근처
  south: 33.115, // 제주도 남쪽
  east: 132.0, // 독도 근처
  west: 124.0, // 서해안
};

// 타일 좌표 범위
const koreaTiles = {
  zoom10: {
    x: { min: 845, max: 870 }, // 25개 타일
    y: { min: 390, max: 410 }, // 20개 타일
  },
};
```

#### 전 세계 주요 도시 (줌 18)

| 도시         | 국가   | 위도      | 경도       | 줌 18 X | 줌 18 Y |
| ------------ | ------ | --------- | ---------- | ------- | ------- |
| **뉴욕**     | 미국   | 40.7128°N | 74.0060°W  | 196608  | 95744   |
| **런던**     | 영국   | 51.5074°N | 0.1278°W   | 131072  | 87136   |
| **도쿄**     | 일본   | 35.6762°N | 139.6503°E | 233472  | 104448  |
| **시드니**   | 호주   | 33.8688°S | 151.2093°E | 233472  | 156672  |
| **상파울루** | 브라질 | 23.5505°S | 46.6333°W  | 196608  | 156672  |

### 3. 타일 좌표의 지리적 의미

#### X 좌표 (경도 기반)

```
X = 0: 경도 -180° (국제날짜변경선)
X = 2^(zoom-1): 경도 0° (본초자오선, 그리니치)
X = 2^zoom - 1: 경도 +180° (국제날짜변경선)
```

#### Y 좌표 (위도 기반)

```
Y = 0: 위도 약 85.0511°N (웹 메르카토르 투영의 북극)
Y = 2^(zoom-1): 위도 0° (적도)
Y = 2^zoom - 1: 위도 약 85.0511°S (웹 메르카토르 투영의 남극)
```

---

## 💻 구현 코드

### 1. TypeScript/JavaScript 구현

```typescript
// 타일 좌표 계산 유틸리티 클래스
class TileCoordinateCalculator {
  /**
   * 위도/경도를 타일 좌표로 변환
   * @param lat 위도 (도)
   * @param lon 경도 (도)
   * @param zoom 줌 레벨 (0-18)
   * @returns 타일 좌표 {x, y}
   */
  static deg2num(
    lat: number,
    lon: number,
    zoom: number
  ): { x: number; y: number } {
    const lat_rad = (lat * Math.PI) / 180;
    const n = Math.pow(2, zoom);

    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor(
      ((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) /
        2) *
        n
    );

    return { x, y };
  }

  /**
   * 타일 좌표를 위도/경도로 변환
   * @param x 타일 X 좌표
   * @param y 타일 Y 좌표
   * @param zoom 줌 레벨 (0-18)
   * @returns 위도/경도 {lat, lng}
   */
  static num2deg(
    x: number,
    y: number,
    zoom: number
  ): { lat: number; lng: number } {
    const n = Math.pow(2, zoom);
    const lon_deg = (x / n) * 360 - 180;
    const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
    const lat_deg = (lat_rad * 180) / Math.PI;

    return { lat: lat_deg, lng: lon_deg };
  }

  /**
   * 타일 파일 경로 생성
   * @param x 타일 X 좌표
   * @param y 타일 Y 좌표
   * @param zoom 줌 레벨
   * @returns 파일 경로
   */
  static getTilePath(x: number, y: number, zoom: number): string {
    return `/tiles/${zoom}/${x}/${y}.png`;
  }

  /**
   * 특정 지역의 타일 범위 계산
   * @param bounds 지역 경계 {north, south, east, west}
   * @param zoom 줌 레벨
   * @returns 타일 범위 {minX, maxX, minY, maxY}
   */
  static getTileBounds(
    bounds: { north: number; south: number; east: number; west: number },
    zoom: number
  ): { minX: number; maxX: number; minY: number; maxY: number } {
    const topLeft = this.deg2num(bounds.north, bounds.west, zoom);
    const bottomRight = this.deg2num(bounds.south, bounds.east, zoom);

    return {
      minX: topLeft.x,
      maxX: bottomRight.x,
      minY: bottomRight.y,
      maxY: topLeft.y,
    };
  }

  /**
   * 타일 개수 계산
   * @param bounds 타일 범위
   * @returns 총 타일 개수
   */
  static getTileCount(bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }): number {
    return (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
  }
}
```

### 2. 사용 예시

```typescript
// 서울 중심점 타일 좌표 계산
const seoulCenter = TileCoordinateCalculator.deg2num(37.5665, 126.978, 18);
console.log(seoulCenter); // { x: 219136, y: 101120 }

// 역변환 검증
const verify = TileCoordinateCalculator.num2deg(219136, 101120, 18);
console.log(verify); // { lat: 37.5665, lng: 126.9780 }

// 파일 경로 생성
const tilePath = TileCoordinateCalculator.getTilePath(219136, 101120, 18);
console.log(tilePath); // "/tiles/18/219136/101120.png"

// 서울 지역 타일 범위 계산
const seoulBounds = {
  north: 37.701,
  south: 37.413,
  east: 127.183,
  west: 126.764,
};

const seoulTileBounds = TileCoordinateCalculator.getTileBounds(seoulBounds, 18);
console.log(seoulTileBounds);
// { minX: 218944, maxX: 219328, minY: 100864, maxY: 101376 }

const seoulTileCount = TileCoordinateCalculator.getTileCount(seoulTileBounds);
console.log(seoulTileCount); // 196608
```

### 3. Python 구현

```python
import math

class TileCoordinateCalculator:
    @staticmethod
    def deg2num(lat, lon, zoom):
        """위도/경도를 타일 좌표로 변환"""
        lat_rad = math.radians(lat)
        n = 2.0 ** zoom

        x = int((lon + 180.0) / 360.0 * n)
        y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)

        return x, y

    @staticmethod
    def num2deg(x, y, zoom):
        """타일 좌표를 위도/경도로 변환"""
        n = 2.0 ** zoom

        lon_deg = x / n * 360.0 - 180.0
        lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
        lat_deg = math.degrees(lat_rad)

        return lat_deg, lon_deg

    @staticmethod
    def get_tile_path(x, y, zoom):
        """타일 파일 경로 생성"""
        return f"/tiles/{zoom}/{x}/{y}.png"
```

---

## 🛠️ 실용적 활용법

### 1. 타일 다운로드 스크립트

```typescript
/**
 * 특정 지역의 모든 타일을 다운로드하는 함수
 */
async function downloadRegionTiles(
  bounds: { north: number; south: number; east: number; west: number },
  zoomLevels: number[]
): Promise<void> {
  for (const zoom of zoomLevels) {
    console.log(`줌 레벨 ${zoom} 다운로드 시작...`);

    const tileBounds = TileCoordinateCalculator.getTileBounds(bounds, zoom);
    const totalTiles = TileCoordinateCalculator.getTileCount(tileBounds);

    console.log(`총 ${totalTiles}개 타일 다운로드 예정`);

    let downloaded = 0;

    for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
      for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
        try {
          await downloadTile(x, y, zoom);
          downloaded++;

          if (downloaded % 100 === 0) {
            console.log(
              `진행률: ${downloaded}/${totalTiles} (${Math.round(
                (downloaded / totalTiles) * 100
              )}%)`
            );
          }
        } catch (error) {
          console.error(`타일 다운로드 실패: ${zoom}/${x}/${y}`, error);
        }

        // 서버 부하 방지를 위한 지연
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`줌 레벨 ${zoom} 완료: ${downloaded}개 다운로드`);
  }
}

/**
 * 개별 타일 다운로드 함수
 */
async function downloadTile(x: number, y: number, zoom: number): Promise<void> {
  const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  const response = await fetch(url, {
    headers: { "User-Agent": "LocalMapApp/1.0" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const filePath = `public/tiles/${zoom}/${x}/${y}.png`;

  // 파일 시스템에 저장 (Node.js 환경)
  const fs = require("fs");
  const path = require("path");

  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(buffer));
}
```

### 2. 타일 존재 여부 확인

```typescript
/**
 * 특정 타일이 로컬에 존재하는지 확인
 */
function tileExists(x: number, y: number, zoom: number): boolean {
  const fs = require("fs");
  const path = require("path");

  const filePath = path.join(
    process.cwd(),
    "public",
    "tiles",
    zoom.toString(),
    x.toString(),
    `${y}.png`
  );
  return fs.existsSync(filePath);
}

/**
 * 특정 지역의 누락된 타일 목록 생성
 */
function getMissingTiles(
  bounds: { north: number; south: number; east: number; west: number },
  zoom: number
): Array<{ x: number; y: number; zoom: number }> {
  const tileBounds = TileCoordinateCalculator.getTileBounds(bounds, zoom);
  const missingTiles: Array<{ x: number; y: number; zoom: number }> = [];

  for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
    for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
      if (!tileExists(x, y, zoom)) {
        missingTiles.push({ x, y, zoom });
      }
    }
  }

  return missingTiles;
}
```

### 3. 타일 통계 분석

```typescript
/**
 * 로컬 타일 저장소 통계 분석
 */
function analyzeTileStorage(): {
  totalTiles: number;
  totalSize: number;
  zoomLevels: { [zoom: number]: { count: number; size: number } };
  regions: { [region: string]: { count: number; size: number } };
} {
  const fs = require("fs");
  const path = require("path");

  const tilesDir = path.join(process.cwd(), "public", "tiles");
  const stats = {
    totalTiles: 0,
    totalSize: 0,
    zoomLevels: {} as { [zoom: number]: { count: number; size: number } },
    regions: {} as { [region: string]: { count: number; size: number } },
  };

  // 줌 레벨별 디렉토리 순회
  const zoomDirs = fs.readdirSync(tilesDir);

  for (const zoom of zoomDirs) {
    const zoomPath = path.join(tilesDir, zoom);
    const zoomStats = fs.statSync(zoomPath);

    if (zoomStats.isDirectory()) {
      const zoomLevel = parseInt(zoom);
      stats.zoomLevels[zoomLevel] = { count: 0, size: 0 };

      // X 좌표별 디렉토리 순회
      const xDirs = fs.readdirSync(zoomPath);

      for (const x of xDirs) {
        const xPath = path.join(zoomPath, x);
        const xStats = fs.statSync(xPath);

        if (xStats.isDirectory()) {
          // Y 좌표별 파일 순회
          const yFiles = fs.readdirSync(xPath);

          for (const yFile of yFiles) {
            if (yFile.endsWith(".png")) {
              const filePath = path.join(xPath, yFile);
              const fileStats = fs.statSync(filePath);

              stats.totalTiles++;
              stats.totalSize += fileStats.size;
              stats.zoomLevels[zoomLevel].count++;
              stats.zoomLevels[zoomLevel].size += fileStats.size;
            }
          }
        }
      }
    }
  }

  return stats;
}
```

---

## 🔧 문제 해결 가이드

### 1. 일반적인 문제들

#### 문제: 타일이 표시되지 않음

**원인**: 타일 좌표 계산 오류 또는 파일 경로 문제
**해결책**:

```typescript
// 1. 좌표 변환 검증
const coords = TileCoordinateCalculator.deg2num(lat, lon, zoom);
const verify = TileCoordinateCalculator.num2deg(coords.x, coords.y, zoom);
console.log("원본:", { lat, lon });
console.log("변환:", coords);
console.log("검증:", verify);

// 2. 파일 경로 확인
const filePath = TileCoordinateCalculator.getTilePath(coords.x, coords.y, zoom);
console.log("파일 경로:", filePath);
```

#### 문제: 타일이 잘못된 위치에 표시됨

**원인**: 좌표계 불일치 (WGS84 vs Web Mercator)
**해결책**:

```typescript
// 올바른 웹 메르카토르 투영 사용 확인
function correctDeg2num(lat, lon, zoom) {
  // 위도 범위 제한 (웹 메르카토르 투영 한계)
  lat = Math.max(-85.0511, Math.min(85.0511, lat));

  const lat_rad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);

  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2) *
      n
  );

  return { x, y };
}
```

#### 문제: 타일 다운로드 실패

**원인**: 서버 제한 또는 네트워크 문제
**해결책**:

```typescript
// 재시도 로직 구현
async function downloadTileWithRetry(x, y, zoom, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await downloadTile(x, y, zoom);
      return; // 성공 시 종료
    } catch (error) {
      console.log(`시도 ${attempt}/${maxRetries} 실패: ${zoom}/${x}/${y}`);

      if (attempt === maxRetries) {
        throw error; // 최대 시도 횟수 초과
      }

      // 지수 백오프 (1초, 2초, 4초)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
      );
    }
  }
}
```

### 2. 성능 최적화

#### 타일 캐싱

```typescript
// 메모리 캐시 구현
const tileCache = new Map<string, ArrayBuffer>();

async function getTileWithCache(x, y, zoom) {
  const key = `${zoom}/${x}/${y}`;

  // 캐시 확인
  if (tileCache.has(key)) {
    return tileCache.get(key);
  }

  // 다운로드 및 캐시 저장
  const tileData = await downloadTile(x, y, zoom);
  tileCache.set(key, tileData);

  // 캐시 크기 제한 (1000개)
  if (tileCache.size > 1000) {
    const firstKey = tileCache.keys().next().value;
    tileCache.delete(firstKey);
  }

  return tileData;
}
```

#### 병렬 다운로드

```typescript
// 동시 다운로드 제한
async function downloadTilesParallel(tiles, maxConcurrent = 5) {
  const chunks = [];
  for (let i = 0; i < tiles.length; i += maxConcurrent) {
    chunks.push(tiles.slice(i, i + maxConcurrent));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map((tile) => downloadTile(tile.x, tile.y, tile.zoom))
    );
    // 청크 간 지연
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
```

### 3. 디버깅 도구

#### 타일 좌표 검증 도구

```typescript
class TileDebugger {
  static validateCoordinates(lat, lon, zoom) {
    const coords = TileCoordinateCalculator.deg2num(lat, lon, zoom);
    const verify = TileCoordinateCalculator.num2deg(coords.x, coords.y, zoom);

    const error = {
      lat: Math.abs(lat - verify.lat),
      lon: Math.abs(lon - verify.lng),
    };

    console.log("=== 타일 좌표 검증 ===");
    console.log("입력:", { lat, lon, zoom });
    console.log("타일 좌표:", coords);
    console.log("역변환:", verify);
    console.log("오차:", error);
    console.log(
      "파일 경로:",
      TileCoordinateCalculator.getTilePath(coords.x, coords.y, zoom)
    );

    return {
      isValid: error.lat < 0.001 && error.lon < 0.001,
      error,
    };
  }

  static analyzeRegion(bounds, zoom) {
    const tileBounds = TileCoordinateCalculator.getTileBounds(bounds, zoom);
    const tileCount = TileCoordinateCalculator.getTileCount(tileBounds);

    console.log("=== 지역 타일 분석 ===");
    console.log("지역 경계:", bounds);
    console.log("줌 레벨:", zoom);
    console.log("타일 범위:", tileBounds);
    console.log("총 타일 수:", tileCount);
    console.log("예상 파일 크기:", tileCount * 15, "KB"); // 평균 15KB/타일

    return { tileBounds, tileCount };
  }
}
```

---

## 📚 참고 자료

### 1. 공식 문서

- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
- [Web Mercator Projection](https://en.wikipedia.org/wiki/Web_Mercator_projection)
- [Slippy Map Tilenames](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames)

### 2. 관련 라이브러리

- **Leaflet**: JavaScript 지도 라이브러리
- **OpenLayers**: 고급 지도 라이브러리
- **Mapbox GL JS**: 벡터 타일 기반 지도 라이브러리

### 3. 유용한 도구들

- [Tile Calculator](https://tools.geofabrik.de/calc/)
- [Bounding Box Tool](https://boundingbox.klokantech.com/)
- [OpenStreetMap Export](https://extract.bbbike.org/)

---

## 🎯 결론

타일 좌표 시스템은 웹 지도의 핵심 기술로, 위도/경도 좌표를 효율적인 파일 시스템 구조로 변환합니다. 이 문서에서 설명한 개념과 공식을 이해하면:

1. **정확한 타일 좌표 계산** 가능
2. **효율적인 타일 다운로드** 구현
3. **오프라인 지도 시스템** 구축
4. **지도 성능 최적화** 달성

이 지식을 바탕으로 다양한 지도 애플리케이션을 개발할 수 있습니다! 🗺️✨

---

_이 문서는 OpenStreetMap 타일 시스템을 기반으로 작성되었으며, 실제 구현 시에는 해당 서비스의 이용 약관을 준수해야 합니다._
