# 🗺️ 서울 오프라인 지도 시스템

Next.js와 Leaflet을 활용한 오프라인 지도 애플리케이션입니다.

## 📋 요구사항

시작하기 전에 다음 소프트웨어가 설치되어 있는지 확인하세요:

- **Node.js**: 18.0.0 이상
- **npm**: 7.0.0 이상

### 버전 확인 방법

```bash
node --version  # v18.0.0 이상이어야 함
npm --version   # v7.0.0 이상이어야 함
```

## 🚀 설치 및 실행

### 1. 저장소 클론

```bash
git clone [저장소 URL]
cd gittest2
```

### 2. 의존성 설치

```bash
# 권장 방법 (자동 설정)
npm run setup

# 또는 직접 설치
npm install --legacy-peer-deps
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 🛠️ 문제 해결

### npm install 에러가 발생하는 경우

#### 방법 1: 캐시 클리어 후 재설치

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### 방법 2: Node.js 버전 확인

- Node.js 18 이상 사용 권장
- [Node.js 공식 사이트](https://nodejs.org)에서 최신 LTS 버전 설치

#### 방법 3: 권한 문제 (Windows)

- PowerShell을 관리자 권한으로 실행
- 또는 WSL 환경 사용

#### 방법 4: 회사 네트워크/프록시 문제

```bash
npm config set registry https://registry.npmjs.org/
npm config delete proxy
npm config delete https-proxy
```

### 타일 404 에러 해결

지도 타일이 404 에러로 나타나는 경우:

1. **타일 다운로드**: 웹사이트에서 "💾 기본 다운로드" 버튼 클릭
2. **인터넷 연결**: 온라인 타일은 인터넷 연결이 필요합니다
3. **타일 폴더 확인**: `public/tiles/` 폴더가 존재하는지 확인

## 📁 프로젝트 구조

```
gittest2/
├── app/
│   ├── api/download-tiles/    # 타일 다운로드 API
│   ├── components/           # React 컴포넌트
│   │   ├── Map.tsx          # 기본 온라인 지도
│   │   ├── OfflineMap.tsx   # 오프라인 지도 (메인)
│   │   └── SimpleMap.tsx    # 간단한 지도
│   └── page.tsx             # 메인 페이지
├── public/
│   ├── tiles/               # 오프라인 타일 저장소
│   └── data/markers.json    # 마커 데이터
├── .npmrc                   # npm 설정
└── package.json
```

## 🎯 주요 기능

- **하이브리드 지도**: 온라인/오프라인 타일 자동 전환
- **타일 다운로드**: 지역별 오프라인 타일 다운로드
- **다양한 줌 레벨**: 10-18 줌 레벨 지원
- **서울 중심**: 서울 지역 최적화
- **반응형 UI**: 모바일/데스크톱 지원

## 📡 API 사용법

### 타일 다운로드 API

```bash
POST /api/download-tiles
Content-Type: application/json

{
  "lat": 37.5665,      # 위도
  "lng": 126.978,      # 경도
  "startZoom": 10,     # 시작 줌 레벨
  "endZoom": 18,       # 끝 줌 레벨
  "radius": 2          # 타일 반경
}
```

## 🔧 개발 도구

### 사용 가능한 스크립트

```bash
npm run dev         # 개발 서버 실행
npm run build       # 프로덕션 빌드
npm run start       # 프로덕션 서버 실행
npm run lint        # ESLint 실행
npm run setup       # 전체 설정 (설치 + 타일 폴더 생성)
npm run install:deps # 의존성만 설치
npm run setup:tiles  # 타일 폴더만 생성
```

## 📄 라이선스

이 프로젝트는 OpenStreetMap 데이터를 사용합니다.

- 지도 데이터: © OpenStreetMap contributors
- 사용 정책: [OpenStreetMap 라이선스](https://www.openstreetmap.org/copyright)

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 지원

문제가 발생하면 다음을 확인해주세요:

1. Node.js와 npm 버전
2. 에러 메시지 전체 내용
3. 운영체제 정보
4. 네트워크 환경 (회사/개인)

---

Made with ❤️ using Next.js, React, and Leaflet
