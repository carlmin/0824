# COSMAX DEEP INSIGHT - 프로젝트 정보

## 🎯 프로젝트 목적
사용자가 자연어로 질문을 입력하면, AI 기반으로 관련 문서를 검색하여 페이지 이미지로 보여주는 채팅 인터페이스

## 🔄 개발 과정

### 1단계: 환경 선택
- `gogo` vs `lilyscopy` 폴더 비교
- `lilyscopy` 선택 (더 완성된 Next.js 환경)

### 2단계: 기존 코드 분석
- `250820/testcode.py` 분석
- AWS EC2 API 구조 파악
- 검색 로직 이해

### 3단계: UI 구현
- 기존 `page.tsx` 대체
- COSMAX DEEP INSIGHT 브랜딩
- 채팅 스타일 인터페이스
- 반응형 그리드 레이아웃

### 4단계: 백엔드 API 구현
- `/api/search-pages/route.ts` 생성
- `testcode.py` 로직을 Next.js API로 포팅
- 이미지 URL 처리 로직 구현

### 5단계: 에러 처리
- `/api/placeholder/[...params]/route.ts` 생성
- 이미지 로딩 실패 시 SVG placeholder 표시

## 🧩 핵심 컴포넌트

### Frontend (`src/app/page.tsx`)
```typescript
- 검색 상태 관리 (useState)
- API 호출 (axios)
- 이미지 그리드 표시
- 토스트 알림 (useToast)
```

### Backend API (`src/app/api/search-pages/route.ts`)
```typescript
- 페이지 검색 (searchPages)
- 이미지 URL 가져오기 (getImageUrl) 
- 병렬 처리 (Promise.all)
- 에러 처리
```

## 📊 개발 통계

### 구현 시간
- UI 개발: ~30분
- API 개발: ~20분  
- 테스트 및 디버깅: ~15분
- 문서화: ~10분

### 파일 구조
```
새로 생성된 파일:
✅ src/app/page.tsx (기존 파일 대체)
✅ src/app/api/search-pages/route.ts (신규)
✅ src/app/api/placeholder/[...params]/route.ts (신규)
✅ README.md (신규)
✅ PROJECT_INFO.md (신규)
```

### 코드 라인 수
- TypeScript: ~300줄
- JSX/TSX: ~150줄
- API Routes: ~150줄
- 문서: ~200줄

## 🔗 외부 의존성

### 필수 서비스
- AWS EC2 서버: `ec2-3-37-235-10.ap-northeast-2.compute.amazonaws.com:8888`
- API 경로: `/api/v1/market-trends`

### API 엔드포인트 사용
1. `POST /pages/search` - 페이지 검색
2. `GET /file/{fileId}/images/pages/{page}` - 이미지 URL 가져오기

## 🎨 디자인 결정사항

### 색상 팔레트
- **Primary**: Green (#10B981, #16A34A)
- **Secondary**: Blue (#3B82F6, #1E40AF)  
- **Background**: Gray (#F3F4F6, #E5E7EB)

### 컴포넌트 라이브러리
- shadcn/ui 사용 이유:
  - 이미 프로젝트에 설치됨
  - TypeScript 친화적
  - Tailwind CSS 호환성

### 레이아웃 결정
- 상단 고정 헤더 (브랜딩)
- 중앙 검색 카드 (주요 기능)
- 하단 결과 그리드 (이미지 갤러리)

## 🐛 해결한 문제들

### 1. 이미지 로딩 에러
**문제**: 외부 이미지 URL 로딩 실패
**해결**: SVG placeholder API 구현

### 2. API 응답 구조 불일치  
**문제**: Python 스크립트와 Next.js API 간 데이터 형식 차이
**해결**: TypeScript 인터페이스로 타입 정의

### 3. 비동기 처리
**문제**: 여러 이미지 URL을 순차적으로 가져오면 느림
**해결**: Promise.all로 병렬 처리

## 🚀 향후 개선 계획

### 단기 계획
- [ ] 이미지 확대 모달 추가
- [ ] 검색 히스토리 저장
- [ ] 로딩 스켈레톤 UI 개선

### 장기 계획  
- [ ] 사용자 인증 시스템
- [ ] 즐겨찾기 기능
- [ ] PDF 다운로드 기능
- [ ] 다국어 지원

## 📝 학습한 내용

### Next.js 15 신기능
- App Router 구조
- Server Components vs Client Components
- API Routes 새로운 문법

### TypeScript 활용
- Interface 정의로 타입 안전성 확보
- async/await와 Promise 타입 처리
- 에러 처리 타입 가드

### 외부 API 통합
- CORS 처리 방법
- 이미지 URL 만료 시간 처리
- 에러 상황 대응 전략

---
**프로젝트 완성일**: 2025년 1월
**개발 환경**: macOS + Node.js + Next.js 15
**포트**: 3001 (3000 포트 사용 중으로 인한 자동 할당)
