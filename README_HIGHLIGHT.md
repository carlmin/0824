# 🎯 세그먼트 하이라이트 기능

세그먼트 검색 결과에 정확한 위치를 시각적으로 표시하는 하이라이트 기능입니다.

## 🚀 주요 기능

### 1. 전체 하이라이트 토글
- 모든 문서에 하이라이트를 일괄 적용/해제
- 형광 노란색 토글 스위치 UI

### 2. 페이지별 정확한 매칭
- 각 페이지에 해당하는 세그먼트만 표시
- 다른 페이지 세그먼트 혼재 방지

### 3. 동적 비율 처리
- 이미지 원본 비율에 맞는 컨테이너
- 가로/세로 이미지 모두 정확한 좌표 매칭

### 4. 반응형 테두리
- 이미지 크기에 비례한 테두리 두께
- 카드와 모달에서 일관된 시각적 품질

## 🛠 설치 및 실행

```bash
# 종속성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 📝 사용법

1. 검색창에 키워드 입력 (예: "브라질 향수 시장")
2. '관련 문서' 옆의 하이라이트 토글을 ON
3. 각 문서 카드에 노란색 하이라이트 표시 확인
4. '전체보기'로 모달에서도 정확한 하이라이트 확인

## 🔧 기술 스택

- **Frontend**: Next.js 15.1.0, React, TypeScript
- **Styling**: Tailwind CSS
- **API**: Next.js API Routes
- **State**: React useState, useEffect

## 📁 주요 파일 구조

```
src/
├── app/
│   ├── page.tsx                    # 메인 페이지 및 토글 기능
│   └── api/segment-search/
│       └── route.ts               # 세그먼트 검색 API
└── components/
    └── HighlightedImage.tsx       # 하이라이트 렌더링
```

## 🎯 핵심 알고리즘

### 좌표 변환
```typescript
const getActualCoordinates = (coord: Coordinate) => {
  const pixelX = coord.x * displayDimensions.width + imageScale.offsetX;
  const pixelY = coord.y * displayDimensions.height + imageScale.offsetY;
  return { x: pixelX, y: pixelY };
};
```

### 동적 테두리
```typescript
const scaledBorderWidth = Math.max(1, 
  Math.round(baseBorderWidth * (currentImageWidth / baseImageWidth))
);
```

---

**최종 업데이트**: 2025-08-22  
**버전**: 1.0.0
