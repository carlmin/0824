# 🚀 COSMAX DEEP INSIGHT - 모던 필터링 시스템

COSMAX DEEP INSIGHT 프로젝트의 **차세대 모던 필터링 시스템**이 구현된 버전입니다.

## ✨ 주요 기능

### 🔍 **AI 기반 검색 시스템**
- **AI Search**: 기본 문서 검색
- **Fast Talk**: 빠른 텍스트 분석
- **Deep Research**: 심화 AI 분석 + 시각화

### 🎯 **🆕 모던 필터링 시스템**
- **멀티셀렉트 드롭다운**: 검색 가능한 인터랙티브 필터
- **아이콘 기반 UI**: 직관적인 카테고리별 아이콘
- **실시간 태그 시스템**: 선택된 필터를 pill 형태로 표시
- **부드러운 애니메이션**: Framer Motion 기반 트랜지션
- **Tailwind + shadcn/ui**: 모던한 디자인 시스템

### 🛠️ **환경 자동화 도구**
- **원클릭 환경 설정**: `./quick-start.sh`
- **자동 문제 진단**: `./dev-setup.sh`
- **강력한 환경 복구**: `./fix-env.sh`

## 🚀 빠른 시작

### 1. 환경 설정 (자동)
```bash
./quick-start.sh
```

### 2. 수동 설정
```bash
npm install
npm run dev
```

## 🎨 **새로운 필터링 UI/UX**

### ✨ **주요 개선사항**
- **검색 가능한 드롭다운**: 대량의 옵션에서 빠른 검색
- **실시간 태그 표시**: 선택된 필터를 pill 형태로 시각화
- **카테고리별 색상 코딩**: 필터 유형별 구분
- **부드러운 애니메이션**: 모든 상호작용에 자연스러운 트랜지션
- **반응형 디자인**: 모바일/태블릿/데스크톱 최적화

### 🔧 **기술 스택**
- **Frontend**: Next.js 15 + React 19
- **UI Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS + CSS Variables
- **Animation**: Framer Motion + Tailwind Animate
- **Icons**: Lucide React
- **Type Safety**: TypeScript 5

## 📋 필터링 기능 상세

### 🌍 **Country 필터** (멀티셀렉트)
- **🔍 검색 기능**: 국가명으로 빠른 검색
- **🎯 TOP 20 국가**: 대한민국(3332), 미국(2364), 일본(1593), 중국(1332), 프랑스(706), 태국(674), 인도네시아(658), 베트남(488), 싱가포르(482), 이탈리아(468), 말레이시아(448), 영국(397), 독일(383), 인도(278), 브라질(267), 멕시코(256), 스페인(156), 캐나다(147), 호주(110), 터키(84)
- **📊 문서 수 표시**: 실시간 문서 개수 확인
- **🎨 아이콘**: 국기 아이콘으로 시각적 구분

### 📊 **Source 필터** (멀티셀렉트)
- **🔍 검색 기능**: 데이터 소스명으로 빠른 검색
- **📈 23개 소스**: 닐슨(BarChart3), 민텔(TrendingUp), 칸타(Users), 맥킨지(Briefcase), 올코스(Database), 피처링(FileText), 트렌디어(TrendingUp), 나스미디어(Newspaper), 메저커머스(Building2), 메조미디어(Newspaper), 뷰스컴퍼니(Search), 오픈서베이(Users), 유로모니터(Globe), 리스닝마인드(Search), 이루다마케팅(Target), 코스메틱리포트(BookOpen), 소셜마케팅코리아(Users), 인텐트데이터리포트(BarChart3), COSMAX(Building2), INCROSS(Database), KOTRA(Globe), SPATE(TrendingUp), WGSN(Zap)
- **🎨 아이콘**: 각 소스별 고유 아이콘

### ⏰ **Period 필터** (단일선택)
- **🔍 검색 기능**: 기간 옵션 검색
- **📅 옵션들**: Past Month(지난 1개월), Past 3 Months(지난 3개월), Past Year(지난 1년)
- **Past Year**: 올해 전체
- **단일 선택**: 라디오 버튼 방식

### 📈 **Amount 필터** (단일선택)
- **🔢 옵션**: 10개(기본값), 20개
- **🎨 아이콘**: Hash 아이콘

## 🎯 **사용 가이드**

### 1. **필터 선택하기**
1. 원하는 필터 버튼 클릭 (국가, 소스, 기간, 결과수)
2. 드롭다운에서 검색어 입력 (선택사항)
3. 원하는 옵션 선택 (멀티셀렉트는 여러 개 가능)
4. 드롭다운 외부 클릭하여 닫기

### 2. **선택된 필터 관리**
- **태그 보기**: 선택된 필터들이 pill 형태로 표시
- **개별 제거**: 각 태그의 ❌ 버튼 클릭
- **전체 제거**: "Clear All" 버튼 클릭

### 3. **검색 실행**
- 필터 선택 후 "질문하기 →" 버튼 클릭
- 필터 조건이 자동으로 검색에 적용됨

## 🎨 **UI 특징**

### 🌈 **색상 시스템**
- **Country 태그**: 기본 색상 (회색)
- **Source 태그**: 보조 색상 (파란색)
- **Period 태그**: 아웃라인 (테두리만)
- **Amount 태그**: 주의 색상 (빨간색)

### ✨ **애니메이션**
- **드롭다운 열기/닫기**: Fade + Zoom 효과
- **태그 추가/제거**: Scale + Fade 효과
- **호버 상태**: 부드러운 색상 전환
- **레이아웃 변경**: 자연스러운 배치 애니메이션
- **20개**: 더 많은 결과
- **단일 선택**: 라디오 버튼 방식

## 🛠️ 환경 자동화 도구

### 🚀 **quick-start.sh** (권장)
```bash
./quick-start.sh
```
- 환경 자동 체크 및 수정
- 개발 서버 자동 실행
- **매일 사용할 메인 스크립트**

### 🔧 **dev-setup.sh**
```bash
./dev-setup.sh
```
- 상세한 환경 진단
- 보안 취약점 자동 수정
- Next.js 빌드 테스트

### 🛠️ **fix-env.sh**
```bash
./fix-env.sh
```
- 완전한 환경 초기화
- 모든 의존성 재설치
- **문제 발생 시 최후의 수단**

## 🔧 기술 스택

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Hooks
- **HTTP Client**: Axios
- **AI Integration**: OpenAI GPT-4o, Anthropic Claude

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   │   ├── segment-search/    # 기본 검색 API
│   │   ├── fast-talk/         # 빠른 분석 API
│   │   └── deep-research/     # 심화 분석 API
│   ├── page.tsx           # 메인 페이지
│   └── layout.tsx         # 레이아웃
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트
│   └── HighlightedImage.tsx  # 이미지 하이라이트
├── hooks/                 # 커스텀 훅
└── lib/                   # 유틸리티 함수
```

## 🎯 API 엔드포인트

### `/api/segment-search`
- 기본 문서 검색
- 필터링 파라미터 지원
- 세그먼트 하이라이트 기능

### `/api/fast-talk`
- 빠른 텍스트 분석
- GPT 기반 인사이트 생성
- 필터링 적용된 검색

### `/api/deep-research`
- 심화 AI 분석
- 이미지 시각화 생성
- 단계별 처리 (검색 → 분석 → 시각화)

## 🔍 필터링 파라미터

```typescript
interface FilterParams {
  search_country?: string[];      // ['KR', 'US', 'JP']
  data_provider?: string[];       // ['닐슨', '민텔']
  filter_year?: number;           // 2025
  filter_recent_months?: number;  // 2 or 4
}
```

## 🚀 배포

### Vercel 배포
```bash
npm run build
vercel --prod
```

### 환경 변수
```bash
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## 📚 사용 가이드

자세한 사용법은 `ENVIRONMENT_GUIDE.md`를 참조하세요.

## 🤝 기여

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

**🎉 필터링 시스템과 환경 자동화가 완벽하게 구현되었습니다!**

**더 이상 환경 문제로 스트레스받지 마세요. `./quick-start.sh` 하나로 모든 것이 해결됩니다!** 🚀✨