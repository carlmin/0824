'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { SingleSelect } from '@/components/ui/single-select';
import { FilterTags } from '@/components/ui/filter-tags';
import { getCountryFlag, getSourceIcon, filterCategoryIcons } from '@/components/ui/filter-icons';
import { FlagEmoji } from '@/components/ui/flag-emoji';
import { Loader2, Search, Maximize2, X, ChevronDown } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import HighlightedImage from '@/components/HighlightedImage';
import FileViewerModal from '@/components/FileViewerModal';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import SimpleTodos, { SimpleTodo } from '@/components/ui/simple-todos';

interface DocumentPage {
  file_id: string;
  page: number;
  title?: string;
  similarity_score?: number;
}

interface ImageResult {
  file_id: string;
  page: number;
  url: string;
  title?: string;
  filename?: string;
}

interface OverlayResult {
  file_id: string;
  page: number;
  overlay_url: string;
  original_url: string;
  segments_highlighted: number;
}

interface FastTalkResponse {
  gptAnalysis: string;
  visualizationCode: string;
  images: ImageResult[];
  total: number;
  message: string;
}

interface ExecutedResult {
  todoId: string;
  status: 'success' | 'failed';
  data: any;
  insights: string;
  evidence: string[];
}

interface ResearchTodo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  subQuery: string;
  priority: number;
  estimatedTime: string;
}

interface DeepResearchResponse {
  step: 'planning' | 'execute' | 'synthesize';
  todos?: ResearchTodo[];
  executedResults?: ExecutedResult[];
  currentResult?: ExecutedResult;
  todoIndex?: number;
  totalTodos?: number;
  completedTodos?: number;
  isCompleted?: boolean;
  finalAnalysis?: string;
  visualizationCode?: string;
  message: string;
}

interface FilterOption {
  label: string;
  value: string;
  checked: boolean;
}

interface CountryOption {
  label: string;
  code: string;
  count: number;
  checked: boolean;
}

// TOP 20 국가 매핑 데이터
const TOP_20_COUNTRIES: CountryOption[] = [
  { label: '대한민국', code: 'KR', count: 3332, checked: false },
  { label: '미국', code: 'US', count: 2364, checked: false },
  { label: '일본', code: 'JP', count: 1593, checked: false },
  { label: '중국', code: 'CN', count: 1332, checked: false },
  { label: '프랑스', code: 'FR', count: 706, checked: false },
  { label: '태국', code: 'TH', count: 674, checked: false },
  { label: '인도네시아', code: 'ID', count: 658, checked: false },
  { label: '베트남', code: 'VN', count: 488, checked: false },
  { label: '싱가포르', code: 'SG', count: 482, checked: false },
  { label: '이탈리아', code: 'IT', count: 468, checked: false },
  { label: '말레이시아', code: 'MY', count: 448, checked: false },
  { label: '영국', code: 'GB', count: 397, checked: false },
  { label: '독일', code: 'DE', count: 383, checked: false },
  { label: '인도', code: 'IN', count: 278, checked: false },
  { label: '브라질', code: 'BR', count: 267, checked: false },
  { label: '멕시코', code: 'MX', count: 256, checked: false },
  { label: '스페인', code: 'ES', count: 156, checked: false },
  { label: '캐나다', code: 'CA', count: 147, checked: false },
  { label: '호주', code: 'AU', count: 110, checked: false },
  { label: '터키', code: 'TR', count: 84, checked: false }
];

// Source 옵션들
const SOURCE_OPTIONS: FilterOption[] = [
  '닐슨', '민텔', '칸타', '맥킨지', '올코스', '피처링', '트렌디어',
  '나스미디어', '메저커머스', '메조미디어', '뷰스컴퍼니', '오픈서베이', 
  '유로모니터', '리스닝마인드', '이루다마케팅', '코스메틱리포트',
  '소셜마케팅코리아', '인텐트데이터리포트', 'COSMAX', 'INCROSS', 
  'KOTRA', 'SPATE', 'WGSN'
].map(source => ({ label: source, value: source, checked: false }));

// Period 옵션들
const PERIOD_OPTIONS: FilterOption[] = [
  { label: 'Past Month', value: 'past_month', checked: false },
  { label: 'Past 3 Months', value: 'past_3_months', checked: false },
  { label: 'Past Year', value: 'past_year', checked: false }
];

// Amount 옵션들 (10, 20만)
const AMOUNT_OPTIONS: FilterOption[] = [
  { label: '10', value: '10', checked: true },
  { label: '20', value: '20', checked: false }
];

export default function Home() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // 검색 실행 여부 추적
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 자동완성 관련 state
  const [autocompleteResults, setAutocompleteResults] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(-1);
  const [justSelectedFromAutocomplete, setJustSelectedFromAutocomplete] = useState(false);
  const [lastSelectedQuery, setLastSelectedQuery] = useState('');
  const [images, setImages] = useState<ImageResult[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('just-search');

  // Fast Talk 관련 state
  const [fastTalkResponse, setFastTalkResponse] = useState<FastTalkResponse | null>(null);
  const [visualizationImage, setVisualizationImage] = useState<string>('');
  
  // Overlay 관련 state
  const [overlayImages, setOverlayImages] = useState<Map<string, OverlayResult>>(new Map());
  const [showOverlay, setShowOverlay] = useState<Map<string, boolean>>(new Map());
  const [segments, setSegments] = useState<any[]>([]);
  
  // 전체 하이라이트 토글 state
  const [globalHighlightEnabled, setGlobalHighlightEnabled] = useState<boolean>(false);
  
  // 디버깅용 실시간 상태
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');

  // Deep Research 관련 state
  const [researchTodos, setResearchTodos] = useState<ResearchTodo[]>([]);
  const [executedResults, setExecutedResults] = useState<ExecutedResult[]>([]);
  const [currentTodoIndex, setCurrentTodoIndex] = useState<number>(-1);
  const [researchProgress, setResearchProgress] = useState({
    totalTodos: 0,
    completedTodos: 0,
    isCompleted: false
  });
  const [finalAnalysis, setFinalAnalysis] = useState<string>('');
  
  // 그래프 커스터마이징 관련 state
  const [chartCustomization, setChartCustomization] = useState<string>('');
  const [isRegeneratingChart, setIsRegeneratingChart] = useState<boolean>(false);

  // Filter states - 새로운 시스템
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['ALL']);
  const [selectedSources, setSelectedSources] = useState<string[]>(['ALL']);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>('ALL');
  const [selectedAmount, setSelectedAmount] = useState<string>('10');

  // 해당 이미지의 segments와 coordinates 정보를 찾는 함수 (페이지별 정확 매칭)
  const getImageSegments = (fileId: string, page: number) => {
    console.log(`[HIGHLIGHT] Looking for segments: fileId=${fileId}, page=${page}`);
    
    // 해당 file_id와 정확한 page에 해당하는 segments만 찾기
    const matchingSegments = segments.filter(segment => {
      // segment에 page 정보가 직접 있는 경우
      if (segment.page !== undefined) {
        return segment.file_id === fileId && segment.page === page;
      }
      
      // page_id를 통해 매칭하는 경우 (segments API에서 page 정보 포함 필요)
      if (segment.page_id && segment.target_page) {
        return segment.file_id === fileId && segment.target_page === page;
      }
      
      // 임시: file_id만으로 매칭 (개선 필요)
      console.warn(`[HIGHLIGHT] Segment lacks page info, using file_id only:`, segment);
      return segment.file_id === fileId;
    });
    
    console.log(`[HIGHLIGHT] Matching segments for ${fileId} page ${page}:`, matchingSegments.length);
    console.log(`[HIGHLIGHT] Segments sample:`, matchingSegments.slice(0, 2));
    
    // coordinates 정보 수집 (해당 페이지의 segments만)
    const allCoordinates: any[] = [];
    matchingSegments.forEach(segment => {
      if (segment.coordinates && Array.isArray(segment.coordinates)) {
        allCoordinates.push(...segment.coordinates);
      }
    });
    
    console.log(`[HIGHLIGHT] Page-specific coordinates for ${fileId} page ${page}:`, allCoordinates.length);
    
    return {
      segments: matchingSegments,
      coordinates: allCoordinates,
      count: matchingSegments.length
    };
  };

  const toggleOverlay = (fileId: string, page: number) => {
    const imageKey = `${fileId}-${page}`;
    const currentOverlayState = showOverlay.get(imageKey) || false;
    
    // 해당 이미지의 segments 정보 확인
    const imageSegments = getImageSegments(fileId, page);
    
    console.log(`[TOGGLE] ${imageKey} - Current state: ${currentOverlayState}`);
    console.log(`[TOGGLE] ${imageKey} - Available coordinates: ${imageSegments.coordinates.length}`);
    
    const newState = !currentOverlayState;
    setShowOverlay(prev => new Map(prev.set(imageKey, newState)));
    
    if (newState && imageSegments.coordinates.length > 0) {
      toast({
        description: `${imageSegments.count}개 세그먼트 하이라이트 표시`,
      });
    }
    
    console.log(`[TOGGLE] Set overlay state for ${imageKey} to: ${newState}`);
  };

  // 전체 하이라이트 토글 함수
  const toggleGlobalHighlight = () => {
    const newGlobalState = !globalHighlightEnabled;
    setGlobalHighlightEnabled(newGlobalState);
    
    console.log(`[GLOBAL-TOGGLE] Setting global highlight to: ${newGlobalState}`);
    
    if (newGlobalState) {
      // 모든 이미지에 대해 하이라이트 상태 활성화
      const newShowOverlay = new Map<string, boolean>();
      let totalSegmentsCount = 0;
      
      images.forEach((image) => {
        const imageKey = `${image.file_id}-${image.page}`;
        const imageSegments = getImageSegments(image.file_id, image.page);
        
        if (imageSegments.coordinates.length > 0) {
          newShowOverlay.set(imageKey, true);
          totalSegmentsCount += imageSegments.count;
        } else {
          newShowOverlay.set(imageKey, false);
        }
      });
      
      setShowOverlay(newShowOverlay);
      
      toast({
        description: `${images.length}개 문서에 총 ${totalSegmentsCount}개 세그먼트 하이라이트 적용`,
      });
    } else {
      // 모든 하이라이트 비활성화
      const newShowOverlay = new Map<string, boolean>();
      images.forEach((image) => {
        const imageKey = `${image.file_id}-${image.page}`;
        newShowOverlay.set(imageKey, false);
      });
      setShowOverlay(newShowOverlay);
      
      toast({
        description: "모든 하이라이트가 비활성화되었습니다.",
      });
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        variant: "destructive",
        description: "질문을 입력해주세요.",
      });
      return;
    }

    // Fast Talk과 Just Search 결과 초기화
    setFastTalkResponse(null);
    setVisualizationImage('');
    setImages([]);
    
    // Overlay 및 하이라이트 상태 초기화
    setOverlayImages(new Map());
    setShowOverlay(new Map());
    setGlobalHighlightEnabled(false);
    setSegments([]);

    setIsLoading(true);
    setHasSearched(true); // 검색 실행됨을 표시
    try {
      if (activeTab === 'deep-research') {
        await handleDeepResearch();
      } else if (activeTab === 'fast-talk') {
        await handleFastTalk();
      } else {
        await handleJustSearch();
      }
    } catch (error) {
      console.error('검색 오류:', error);
      toast({
        variant: "destructive", 
        description: "검색 중 오류가 발생했습니다. 다시 시도해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedAmount = () => {
    return parseInt(selectedAmount) || 10;
  };

  const getFilterParams = () => {
    const params: any = {};
    
    // Country 필터 (ALL이 아닌 것들만)
    const validCountries = selectedCountries.filter(c => c !== 'ALL');
    if (validCountries.length > 0) {
      params.search_country = validCountries;
    }
    
    // Source 필터 (ALL이 아닌 것들만)
    const validSources = selectedSources.filter(s => s !== 'ALL');
    if (validSources.length > 0) {
      params.data_provider = validSources;
    }
    
    // Period 필터 (ALL이 아닌 경우에만)
    if (selectedPeriod && selectedPeriod !== 'ALL') {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      switch (selectedPeriod) {
        case 'past_month':
          params.filter_recent_months = 2; // +1 해서 월 시작부터
          break;
        case 'past_3_months':
          params.filter_recent_months = 4; // +1 해서 3개월 전 월 시작부터
          break;
        case 'past_year':
          params.filter_year = currentYear;
          break;
      }
    }
    
    return params;
  };

  const handleJustSearch = async () => {
    const limit = getSelectedAmount();
    const filterParams = getFilterParams();
    
    // testcode.py 방식: segment search 사용하여 coordinates 정보 포함된 결과 받기
    const response = await axios.post('/api/segment-search', {
      query: query.trim(),
      limit: limit,
      ...filterParams
    });

    setImages(response.data.images);
    setSegments(response.data.segments || []); // segments 데이터 저장 (coordinates 포함)
    
    console.log('[JUST-SEARCH] Segments received:', response.data.segments?.length || 0);
    console.log('[JUST-SEARCH] First segment sample:', response.data.segments?.[0]);
    console.log('[JUST-SEARCH] Filter params:', filterParams);
    
    if (response.data.images.length === 0) {
      toast({
        description: "관련된 문서를 찾을 수 없습니다.",
      });
    } else {
      toast({
        description: `${response.data.images.length}개의 관련 문서를 찾았습니다.`,
      });
    }
  };

  const handleFastTalk = async () => {
    const limit = getSelectedAmount();
    const filterParams = getFilterParams();
    
    // 디버깅 상태 초기화
    setDebugLogs([]);
    setCurrentStep('1/2: 관련 문서 검색 중...');
    addDebugLog('Fast Talk 시작');
    
    try {
      addDebugLog(`검색 쿼리: "${query}", 문서 수: ${limit}`);
      addDebugLog(`필터 조건: ${JSON.stringify(filterParams)}`);
      
      // Step 1: 문서 검색
      const searchResponse = await axios.post('/api/fast-talk', {
        query: query.trim(),
        limit: limit,
        step: 'search',
        ...filterParams
      });

      addDebugLog(`문서 검색 완료: ${searchResponse.data.images.length}개 발견`);
      setImages(searchResponse.data.images); // 즉시 문서들 표시
      setSegments(searchResponse.data.segments || []); // segments 데이터 저장
      
      // Step 2: 빠른 분석
      setCurrentStep('2/2: 빠른 분석 중...');
      addDebugLog('Fast Talk 분석 시작');
      
      const analyzeResponse = await axios.post('/api/fast-talk', {
        query: query.trim(),
        step: 'analyze',
        segments: searchResponse.data.segments
      });

      addDebugLog('Fast Talk 분석 완료');
      const gptAnalysis = analyzeResponse.data.gptAnalysis;
      
      // Fast Talk 결과 표시 (시각화 없음)
      setFastTalkResponse({
        gptAnalysis,
        visualizationCode: '', // Fast Talk은 시각화 없음
        images: searchResponse.data.images,
        total: searchResponse.data.images.length,
        message: `Fast Talk 완료: ${searchResponse.data.images.length}개 문서 빠른 분석`
      });

      setCurrentStep('완료');
      addDebugLog('Fast Talk 모든 처리 완료');
      
      toast({
        description: `Fast Talk 완료: ${searchResponse.data.images.length}개 문서 빠른 분석`,
      });
    } catch (error) {
      setCurrentStep('오류 발생');
      addDebugLog(`에러: ${error}`);
      throw error;
    }
  };

  const addDebugLog = (message: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // 자동완성 API 호출
  const fetchAutocompleteResults = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 1) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    // 방금 자동완성에서 선택했다면 API 호출하지 않음
    if (justSelectedFromAutocomplete) {
      return;
    }

    // 현재 쿼리가 방금 선택한 쿼리와 동일하다면 자동완성 표시하지 않음
    if (searchQuery === lastSelectedQuery) {
      return;
    }

    setIsAutocompleteLoading(true);
    try {
      const response = await axios.get(`/api/v1/market-trends/autocomplete`, {
        params: { q: searchQuery.trim() }
      });
      
      if (response.data && Array.isArray(response.data.suggestions)) {
        // 방금 선택한 쿼리는 자동완성 결과에서 제외
        const suggestions = response.data.suggestions
          .filter(suggestion => suggestion !== lastSelectedQuery)
          .slice(0, 8); // 최대 8개까지만 표시
        setAutocompleteResults(suggestions);
        setShowAutocomplete(suggestions.length > 0);
      } else {
        // API 응답이 없으면 기본 추천어 표시
        const defaultSuggestions = getDefaultSuggestions(searchQuery)
          .filter(suggestion => suggestion !== lastSelectedQuery);
        setAutocompleteResults(defaultSuggestions);
        setShowAutocomplete(defaultSuggestions.length > 0);
      }
    } catch (error) {
      console.error('자동완성 API 호출 실패:', error);
      // API 실패 시 기본 추천어 표시 (방금 선택한 쿼리 제외)
      const defaultSuggestions = getDefaultSuggestions(searchQuery)
        .filter(suggestion => suggestion !== lastSelectedQuery);
      setAutocompleteResults(defaultSuggestions);
      setShowAutocomplete(defaultSuggestions.length > 0);
    } finally {
      setIsAutocompleteLoading(false);
    }
  };

  // 기본 추천어 생성
  const getDefaultSuggestions = (query: string) => {
    const defaultKeywords = [
      // 인기 질문들
      "최근 틱톡에서 뜨고 있는 뷰티 트렌드",
      "올해 가장 핫한 뷰티 브랜드",
      "2024년 뷰티 트렌드 예측",
      "요즘 인기 있는 스킨케어 성분",
      "민감성 피부에 좋은 제품",
      "안티에이징 효과 좋은 제품",
      
      // 소셜미디어/플랫폼 트렌드
      "틱톡 뷰티 트렌드",
      "틱톡숍 뷰티 라이브",
      "인스타 뷰티 해시태그",
      "유튜브 뷰티 리뷰",
      "샤오홍슈 뷰티 트렌드",
      "라이브커머스 뷰티 전환",
      
      // 주요 국가/지역 (실제 데이터 기반)
      "한국 화장품 수출",
      "K-뷰티 트렌드",
      "올리브영 베스트",
      "미국 뷰티 시장",
      "세포라 트렌드",
      "일본 스킨케어 시장",
      "코스메 랭킹",
      "중국 뷰티 이커머스",
      "티몰 화장품",
      "프랑스 향수 산업",
      "태국 뷰티 시장",
      "쇼피 뷰티 태국",
      "인도네시아 할랄 화장품",
      "베트남 뷰티 시장",
      "싱가포르 프리미엄 뷰티",
      "이탈리아 니치 향수",
      "말레이시아 할랄 뷰티",
      "영국 클린 뷰티",
      "독일 오가닉 화장품",
      "인도 아유르베다 뷰티",
      "브라질 향수 시장",
      "멕시코 뷰티 시장",
      
      // 제품 카테고리
      "쿠션 파운데이션 시장 동향",
      "틴트 립 제품 인기 순위",
      "세럼 시장 성장률",
      "선크림 혁신 기술",
      
      // 트렌드 키워드
      "친환경 뷰티 브랜드",
      "비건 뷰티 제품 순위",
      "남성 뷰티 시장 성장",
      "AI 기반 뷰티 진단",
      "개인 맞춤형 화장품"
    ];

    const filteredResults = defaultKeywords
      .filter(keyword => keyword.toLowerCase().includes(query.toLowerCase()));
    
    // 결과가 없으면 일반적인 뷰티 키워드 제공
    if (filteredResults.length === 0 && query.trim()) {
      return [
        `${query} 뷰티 트렌드`,
        `${query} 화장품 시장`,
        `${query} 스킨케어`,
        `${query} 메이크업`
      ];
    }
    
    return filteredResults.slice(0, 8);
  };

  // Debounced 자동완성 호출
  useEffect(() => {
    // 방금 자동완성에서 선택했다면 API 호출하지 않음
    if (justSelectedFromAutocomplete) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      fetchAutocompleteResults(query);
    }, 150); // 더 빠른 반응을 위해 150ms로 줄임

    return () => clearTimeout(timeoutId);
  }, [query, justSelectedFromAutocomplete]);

  // 자동완성 결과 선택
  const selectAutocompleteResult = (suggestion: string) => {
    setQuery(suggestion);
    setLastSelectedQuery(suggestion); // 마지막에 선택한 쿼리 저장
    setShowAutocomplete(false);
    setAutocompleteResults([]);
    setSelectedAutocompleteIndex(-1);
    setJustSelectedFromAutocomplete(true);
    
    // 포커스는 유지하되 자동완성만 차단
    // inputRef.current.blur() 제거 - 커서를 챗창에 유지
    
    // 더 긴 시간 후 플래그 리셋 (사용자가 다시 타이핑하기 시작하면 자동완성 허용)
    setTimeout(() => {
      setJustSelectedFromAutocomplete(false);
    }, 2000); // 2초로 늘림
  };

  // 검색어 하이라이트
  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <span key={index} className="bg-blue-100 text-blue-700 font-medium">{part}</span> : 
        part
    );
  };

  const handleDeepResearch = async () => {
    const limit = getSelectedAmount();
    const filterParams = getFilterParams();
    
    // 상태 초기화
    setDebugLogs([]);
    setCurrentStep('AI 에이전트 계획 수립 중...');
    setResearchTodos([]);
    setExecutedResults([]);
    setCurrentTodoIndex(-1);
    setFinalAnalysis('');
    setVisualizationImage('');
    
    addDebugLog('🤖 Deep Research AI Agent 시작');
    
    try {
      // Step 1: AI Agent Planning
      addDebugLog('📋 연구 계획 수립 중...');
      setCurrentStep('1단계: AI가 연구 계획을 수립하고 있습니다...');
      
      const planningResponse = await axios.post('/api/deep-research', {
        query: query.trim(),
        step: 'planning',
        ...filterParams
      });

      const todos: ResearchTodo[] = planningResponse.data.todos;
      setResearchTodos(todos);
      setResearchProgress({
        totalTodos: todos.length,
        completedTodos: 0,
        isCompleted: false
      });
      
      addDebugLog(`✅ 연구 계획 완료: ${todos.length}개 할 일 생성`);
      setCurrentStep(`2단계: ${todos.length}개 할 일을 순차적으로 실행합니다...`);
      
      // Step 2: 각 할 일을 순차적으로 실행
      let currentResults: ExecutedResult[] = [];
      
      for (let i = 0; i < todos.length; i++) {
        setCurrentTodoIndex(i);
        const currentTodo = todos[i];
        
        addDebugLog(`🔍 할 일 ${i + 1}/${todos.length} 실행 중: ${currentTodo.title}`);
        setCurrentStep(`${i + 1}/${todos.length}: ${currentTodo.title} 조사 중...`);
        
        const executeResponse = await axios.post('/api/deep-research', {
          query: query.trim(),
          step: 'execute',
          todos: todos,
          todoIndex: i,
          executedResults: currentResults,
          limit: Math.ceil(limit / todos.length), // 각 할 일마다 적절한 문서 수 배분
          ...filterParams
        });

        // 상태 업데이트
        const updatedTodos = executeResponse.data.todos;
        setResearchTodos(updatedTodos);
        
        currentResults = executeResponse.data.executedResults;
        setExecutedResults(currentResults);
        
        const completedCount = executeResponse.data.completedTodos;
        setResearchProgress({
          totalTodos: todos.length,
          completedTodos: completedCount,
          isCompleted: executeResponse.data.isCompleted
        });
        
        addDebugLog(`✅ 할 일 ${i + 1} 완료: ${executeResponse.data.currentResult.status}`);
        
        // 각 단계 완료 시 잠시 대기 (사용자가 진행 상황을 볼 수 있도록)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Step 3: 최종 종합 분석
      setCurrentStep('3단계: 모든 조사 결과를 종합 분석 중...');
      addDebugLog('🧠 최종 종합 분석 및 시각화 생성 중...');
      
      const synthesizeResponse = await axios.post('/api/deep-research', {
        query: query.trim(),
        step: 'synthesize',
        executedResults: currentResults
      });
      
      const finalAnalysisResult = synthesizeResponse.data.finalAnalysis;
      const visualizationCode = synthesizeResponse.data.visualizationCode;
      
      setFinalAnalysis(finalAnalysisResult);
      setFastTalkResponse({
        gptAnalysis: finalAnalysisResult,
        visualizationCode: visualizationCode,
        images: [], // 각 단계의 이미지는 executedResults에 포함
        total: currentResults.length,
        message: '🎉 Deep Research 완료!'
      });
      
      // Python 시각화 실행
      if (visualizationCode) {
        addDebugLog('📊 시각화 그래프 생성 중...');
        await generateVisualization(visualizationCode);
      }
      
      setCurrentStep('✅ AI Agent Deep Research 완료!');
      addDebugLog('🎉 모든 연구가 성공적으로 완료되었습니다!');
      
      toast({
        description: `🤖 AI Agent Deep Research 완료: ${todos.length}개 조사 항목 완료`,
      });
      
    } catch (error) {
      setCurrentStep('❌ 오류 발생');
      addDebugLog(`❌ 에러: ${error}`);
      console.error('Deep Research error:', error);
      toast({
        variant: "destructive",
        description: "Deep Research 중 오류가 발생했습니다.",
      });
    }
  };

  // 그래프만 재생성하는 함수
  const regenerateChart = async () => {
    if (!finalAnalysis || !chartCustomization.trim()) {
      toast({
        variant: "destructive",
        description: "그래프 커스터마이징 요청을 입력해주세요.",
      });
      return;
    }

    setIsRegeneratingChart(true);
    
    try {
      // Claude에게 커스터마이징된 시각화 코드 생성 요청
      const customPrompt = `${finalAnalysis}\n\n사용자 요청: ${chartCustomization}`;
      
      const response = await axios.post('/api/deep-research', {
        query: query.trim(),
        step: 'synthesize', // 시각화만 다시 생성
        executedResults: executedResults.map(result => ({
          ...result,
          insights: customPrompt // 커스터마이징 요청을 포함한 분석 결과
        }))
      });
      
      const customVisualizationCode = response.data.visualizationCode;
      
      if (customVisualizationCode) {
        await generateVisualization(customVisualizationCode);
        toast({
          description: "그래프가 성공적으로 업데이트되었습니다!",
        });
      }
    } catch (error) {
      console.error('Chart regeneration error:', error);
      toast({
        variant: "destructive",
        description: "그래프 생성 중 오류가 발생했습니다.",
      });
    } finally {
      setIsRegeneratingChart(false);
    }
  };

  const generateVisualization = async (pythonCode: string) => {
    try {
      addDebugLog('Python 코드 실행 API 호출 시작');
      addDebugLog(`Python 코드 길이: ${pythonCode.length} 문자`);
      
      // Python 코드 실행 API 호출
      const response = await axios.post('/api/execute-python', {
        code: pythonCode
      });

      addDebugLog(`Python API 응답: ${response.status}`);
      addDebugLog(`응답 데이터: ${JSON.stringify(response.data).substring(0, 200)}...`);

      if (response.data.success && response.data.image) {
        // base64 이미지 데이터 설정
        const imageData = response.data.image.startsWith('data:') 
          ? response.data.image 
          : `data:image/png;base64,${response.data.image}`;
        
        setVisualizationImage(imageData);
        addDebugLog('시각화 이미지 생성 성공');
        
        toast({
          description: "시각화 그래프가 생성되었습니다.",
        });
      } else {
        addDebugLog(`Python 실행 실패: ${response.data.error}`);
        setVisualizationImage('');
        
        toast({
          variant: "destructive",
          description: `시각화 생성 실패: ${response.data.error}`,
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      addDebugLog(`Python API 호출 에러: ${errorMessage}`);
      addDebugLog(`에러 상태: ${error.response?.status}`);
      
      setVisualizationImage('');
      
      toast({
        variant: "destructive",
        description: `시각화 생성 오류: ${errorMessage}`,
      });
    }
  };

  const handleTabChange = (tabId: string) => {
    // 탭 변경 시 결과 초기화
    setImages([]);
    setFastTalkResponse(null);
    setVisualizationImage('');
    setDebugLogs([]);
    setCurrentStep('');
    setHasSearched(false); // 검색 상태도 초기화
    
    // Overlay 및 하이라이트 상태 초기화
    setOverlayImages(new Map());
    setShowOverlay(new Map());
    setGlobalHighlightEnabled(false);
    setSegments([]);
    
    // 자동완성 관련 상태도 초기화
    setJustSelectedFromAutocomplete(false);
    setLastSelectedQuery('');
    setShowAutocomplete(false);
    setAutocompleteResults([]);
    setSelectedAutocompleteIndex(-1);
    
    // 필터도 초기화
    setSelectedCountries(['ALL']);
    setSelectedSources(['ALL']);
    setSelectedPeriod('ALL');
    setSelectedAmount('10');
    
    setActiveTab(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete || autocompleteResults.length === 0) {
      if (e.key === 'Enter') {
        // 자동완성에서 방금 선택했더라도 엔터키로 검색 허용
        handleSearch();
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedAutocompleteIndex(prev => 
          prev < autocompleteResults.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedAutocompleteIndex(prev => 
          prev > 0 ? prev - 1 : autocompleteResults.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedAutocompleteIndex >= 0 && selectedAutocompleteIndex < autocompleteResults.length) {
          selectAutocompleteResult(autocompleteResults[selectedAutocompleteIndex]);
        } else if (autocompleteResults.length > 0) {
          // 선택된 항목이 없으면 첫 번째 항목 선택
          selectAutocompleteResult(autocompleteResults[0]);
        } else {
          handleSearch();
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        setSelectedAutocompleteIndex(-1);
        break;
      
      default:
        // 다른 키 입력시 선택 초기화
        setSelectedAutocompleteIndex(-1);
        break;
    }
  };

  // Query 변경 핸들러
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // 사용자가 직접 타이핑하기 시작하면 자동완성 선택 플래그와 마지막 선택 쿼리 리셋
    if (value !== lastSelectedQuery) {
      setJustSelectedFromAutocomplete(false);
      setLastSelectedQuery('');
    }
    
    // 빈 문자열이면 자동완성 숨김
    if (!value.trim()) {
      setShowAutocomplete(false);
      setAutocompleteResults([]);
      setSelectedAutocompleteIndex(-1);
      setLastSelectedQuery(''); // 빈 문자열일 때도 리셋
    } else {
      // 텍스트 입력 시 선택 초기화
      setSelectedAutocompleteIndex(-1);
    }
  };

  const openImageModal = (image: ImageResult) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setIsModalOpen(false);
  };

  const openFileViewer = (image: ImageResult) => {
    setSelectedImage(image);
    setIsFileViewerOpen(true);
  };

  const closeFileViewer = () => {
    setSelectedImage(null);
    setIsFileViewerOpen(false);
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isFileViewerOpen) {
          closeFileViewer();
        } else if (isModalOpen) {
          closeImageModal();
        }
      }
    };

    if (isModalOpen || isFileViewerOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isFileViewerOpen]);

  const tabs = [
    { id: 'just-search', label: 'AI Search' },
    { id: 'fast-talk', label: 'Fast Talk' },
    { id: 'deep-research', label: 'Deep Research' }
  ];

  // 새로운 필터 시스템을 위한 데이터 변환
  const countryOptions = [
    { label: 'ALL', value: 'ALL', flag: '🌍' },
    ...TOP_20_COUNTRIES.map(country => ({
      label: country.label, // 숫자 카운트 제거
      value: country.code,
      flag: getCountryFlag(country.code),
    }))
  ];

  const sourceOptions = [
    { label: 'ALL', value: 'ALL' },
    ...SOURCE_OPTIONS.map(source => ({
      label: source.label,
      value: source.value,
    }))
  ];

  const periodOptions = [
    { label: 'ALL', value: 'ALL' },
    ...PERIOD_OPTIONS.map(period => ({
      label: period.label,
      value: period.value,
    }))
  ];

  const amountOptions = AMOUNT_OPTIONS.map(amount => ({
    label: amount.label,
    value: amount.value,
  }));

  // 선택된 필터들을 태그 형태로 변환 (Amount 제외)
  const getSelectedFilterTags = () => {
    const tags: any[] = [];

    // Country 태그들 (ALL이 아닌 경우에만)
    selectedCountries.filter(code => code !== 'ALL').forEach(countryCode => {
      const country = TOP_20_COUNTRIES.find(c => c.code === countryCode);
      if (country) {
        tags.push({
          id: `country-${countryCode}`,
          label: country.label,
          value: countryCode,
          category: 'Country',
          flag: getCountryFlag(countryCode),
        });
      }
    });

    // Source 태그들 (ALL이 아닌 경우에만)
    selectedSources.filter(value => value !== 'ALL').forEach(sourceValue => {
      const source = SOURCE_OPTIONS.find(s => s.value === sourceValue);
      if (source) {
        tags.push({
          id: `source-${sourceValue}`,
          label: source.label,
          value: sourceValue,
          category: 'Source',
        });
      }
    });

    // Period 태그 (ALL이 아닌 경우에만)
    if (selectedPeriod && selectedPeriod !== 'ALL') {
      const period = PERIOD_OPTIONS.find(p => p.value === selectedPeriod);
      if (period) {
        tags.push({
          id: `period-${selectedPeriod}`,
          label: period.label,
          value: selectedPeriod,
          category: 'Period',
          icon: filterCategoryIcons.period,
        });
      }
    }

    // Amount는 Filters 카운트에서 제외 (표시용 태그는 별도 함수로 분리)

    return tags;
  };

  // 태그 제거 핸들러
  const handleRemoveTag = (tag: any) => {
    switch (tag.category) {
      case 'Country':
        setSelectedCountries(prev => prev.filter(c => c !== tag.value));
        break;
      case 'Source':
        setSelectedSources(prev => prev.filter(s => s !== tag.value));
        break;
      case 'Period':
        setSelectedPeriod(null);
        break;
      case 'Amount':
        setSelectedAmount('10');
        break;
    }
  };

  // 모든 필터 초기화 (Amount는 제외하고 기존 값 유지)
  const handleClearAllFilters = () => {
    setSelectedCountries(['ALL']);
    setSelectedSources(['ALL']);
    setSelectedPeriod('ALL');
    // Amount는 초기화하지 않고 현재 값 유지
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              COSMAX DEEP INSIGHT
            </h1>
            
            {/* Tabs */}
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 rounded-full p-1 inline-flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <Card className="mb-8 border-2 border-green-200 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-xl text-gray-700">
              무엇이든 질문하세요
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 max-w-4xl mx-auto mb-4 relative">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    // 방금 자동완성에서 선택했다면 자동완성을 다시 띄우지 않음
                    if (justSelectedFromAutocomplete) {
                      return;
                    }
                    
                    if (query.trim() && autocompleteResults.length > 0) {
                      setShowAutocomplete(true);
                    } else if (query.trim()) {
                      // 포커스 시에도 자동완성 검색 실행
                      fetchAutocompleteResults(query);
                    }
                  }}
                  onBlur={() => {
                    // 200ms 후에 숨김 (클릭 이벤트가 충분히 처리되도록)
                    setTimeout(() => {
                      setShowAutocomplete(false);
                      setSelectedAutocompleteIndex(-1);
                    }, 200);
                  }}
                  placeholder="ex) 최근 틱톡에서 뜨고 있는 뷰티 트렌드"
                  className="w-full text-lg py-3 px-4 border-2 border-green-300 rounded-full focus:border-green-400 focus:ring-4 focus:ring-green-100 transition-all duration-200 placeholder:text-gray-500"
                  disabled={isLoading}
                />
                
                {/* 자동완성 드롭다운 */}
                {showAutocomplete && (autocompleteResults.length > 0 || isAutocompleteLoading) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-[9999] max-h-72 overflow-hidden">
                    <div className="py-1">
                      {isAutocompleteLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          검색어 추천 중...
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto">
                          {autocompleteResults.length === 0 ? (
                            <div className="px-5 py-3 text-sm text-gray-500 text-center">
                              추천 검색어가 없습니다
                            </div>
                          ) : (
                            autocompleteResults.map((suggestion, index) => (
                              <div
                                key={index}
                                className={`px-5 py-3 cursor-pointer text-gray-800 transition-all duration-150 border-b border-gray-50 last:border-b-0 group ${
                                  selectedAutocompleteIndex === index 
                                    ? 'bg-blue-50 border-blue-100' 
                                    : 'hover:bg-gray-50'
                                }`}
                                onClick={() => selectAutocompleteResult(suggestion)}
                                onMouseDown={(e) => e.preventDefault()} // 클릭 시 blur 방지
                                onMouseEnter={() => setSelectedAutocompleteIndex(index)} // 마우스 호버 시 선택
                              >
                                <div className="flex items-center">
                                  <div className="w-4 h-4 mr-3 flex items-center justify-center">
                                    <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                  </div>
                                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                                    {highlightMatch(suggestion, query)}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !query.trim()}
                className="bg-green-400 hover:bg-green-500 text-black font-semibold px-8 py-3 rounded-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    검색중...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    질문하기 →
                  </>
                )}
              </Button>
            </div>
            
            {/* Clean Single-Line Filters */}
            <div className="flex justify-center items-center gap-3 flex-wrap">
              <MultiSelect
                options={countryOptions}
                selected={selectedCountries}
                onChange={setSelectedCountries}
                placeholder="Country"
                label="Country"
                icon={filterCategoryIcons.country}
                className="min-w-[140px] h-11 rounded-xl border-gray-200"
              />
              
              <MultiSelect
                options={sourceOptions}
                selected={selectedSources}
                onChange={setSelectedSources}
                placeholder="Source"
                label="Source"
                icon={filterCategoryIcons.source}
                className="min-w-[140px] h-11 rounded-xl border-gray-200"
              />
              
              <SingleSelect
                options={periodOptions}
                selected={selectedPeriod}
                onChange={setSelectedPeriod}
                placeholder="Period"
                label="Period"
                icon={filterCategoryIcons.period}
                className="min-w-[120px] h-11 rounded-xl border-gray-200"
              />
              
              <SingleSelect
                options={amountOptions}
                selected={selectedAmount}
                onChange={(value) => setSelectedAmount(value || '10')}
                placeholder="Amount"
                label="Amount"
                icon={filterCategoryIcons.amount}
                className="min-w-[100px] h-11 rounded-xl border-gray-200"
                clearable={false}
              />
              
              {/* Filter Summary */}
              <div className="flex items-center gap-2 text-sm text-gray-400 ml-4">
                <span>
                  Filters ({getSelectedFilterTags().length})
                </span>
                {getSelectedFilterTags().length > 0 && (
                  <>
                    <span>·</span>
                    <button
                      onClick={handleClearAllFilters}
                      className="hover:text-red-500 transition-colors"
                    >
                      Clear all
                    </button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 실시간 디버깅 섹션 */}
        {(activeTab === 'fast-talk' || activeTab === 'deep-research') && (debugLogs.length > 0 || isLoading) && (
          <Card className="shadow-lg border-orange-200 mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-orange-800 flex items-center gap-2">
                🔍 실시간 처리 상황
                {activeTab === 'fast-talk' && (
                  <span className="text-sm font-normal text-purple-600">(빠른 텍스트 분석)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 현재 단계 */}
                {currentStep && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse mr-3"></div>
                      <span className="font-medium text-blue-800">{currentStep}</span>
                    </div>
                  </div>
                )}
                
                {/* 디버그 로그 */}
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-60 overflow-y-auto">
                  <div className="text-xs font-mono space-y-1">
                    {debugLogs.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                    {debugLogs.length === 0 && isLoading && (
                      <div className="animate-pulse">처리 중...</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fast Talk Results Section */}
        {activeTab === 'fast-talk' && fastTalkResponse && (
          <div className="space-y-8">
            {/* Fast Talk 빠른 분석 결과 */}
            <Card className="rounded-xl border border-gray-200 bg-white">
              <CardHeader className="px-6 py-4 border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-amber-500 flex items-center gap-2">
                  ⚡ [Fast Talk] 빠른 텍스트 분석 결과
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-4">
                <MarkdownRenderer content={fastTalkResponse.gptAnalysis} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Deep Research Progress Section */}
        {activeTab === 'deep-research' && researchTodos.length > 0 && (
          <div className="space-y-6">
            <SimpleTodos
              todos={researchTodos.map(todo => ({
                id: todo.id,
                title: todo.title,
                status: todo.status
              }))}
              totalTodos={researchProgress.totalTodos}
              completedTodos={researchProgress.completedTodos}
              className="mx-auto max-w-md"
            />
          </div>
        )}

        {/* Deep Research Results Section */}
        {activeTab === 'deep-research' && fastTalkResponse && (
          <div className="space-y-8">
            {/* GPT-4o 분석 결과 */}
            <Card className="rounded-xl border border-gray-200 bg-white">
              <CardHeader className="px-6 py-4 border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-indigo-600 flex items-center gap-2">
                  🔍 [AI] 분석 결과
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-4">
                <MarkdownRenderer content={fastTalkResponse.gptAnalysis} />
              </CardContent>
            </Card>

            {/* Claude 시각화 그래프 */}
            {fastTalkResponse.visualizationCode && (
              <Card className="rounded-xl border border-gray-200 bg-white">
                <CardHeader className="px-6 py-4 border-b border-gray-100">
                  <CardTitle className="text-lg font-semibold text-teal-600 flex items-center gap-2">
                    📊 [그래프] 데이터 시각화
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {visualizationImage ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <img 
                          src={visualizationImage} 
                          alt="분석 시각화 그래프" 
                          className="max-w-full h-auto mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <div className="flex items-center">
                          <div className="text-yellow-600 mr-3">⚠️</div>
                          <div>
                            <p className="font-medium text-yellow-800">시각화 생성 중...</p>
                            <p className="text-sm text-yellow-700">
                              Python 코드를 실행하여 그래프를 생성하고 있습니다. 잠시만 기다려주세요.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 그래프 커스터마이징 */}
                    {visualizationImage && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-3">그래프 커스터마이징</h4>
                        <div className="flex gap-2">
                          <Input
                            value={chartCustomization}
                            onChange={(e) => setChartCustomization(e.target.value)}
                            placeholder="원하는 그래프 스타일이나 내용을 입력하세요 (예: 막대그래프로 변경, 색상을 파란색으로, 최근 3년 데이터만 표시)"
                            className="flex-1"
                            disabled={isRegeneratingChart}
                          />
                          <Button
                            onClick={regenerateChart}
                            disabled={isRegeneratingChart || !chartCustomization.trim()}
                            className="whitespace-nowrap"
                          >
                            {isRegeneratingChart ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                생성 중...
                              </>
                            ) : (
                              "그래프 새로고침"
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                          💡 분석 내용은 그대로 유지하고 그래프만 다시 생성됩니다
                        </p>
                      </div>
                    )}
                    
                    {/* Python 코드 표시 */}
                    <details className="bg-gray-100 rounded-lg">
                      <summary className="cursor-pointer p-3 font-medium text-gray-700 hover:bg-gray-200 rounded-lg">
                        [코드] 생성된 시각화 코드 보기
                      </summary>
                      <div className="p-3 pt-0">
                        <pre className="text-sm bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                          <code>{fastTalkResponse.visualizationCode}</code>
                        </pre>
                      </div>
                    </details>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Results Section */}
        {(activeTab === 'just-search' || activeTab === 'fast-talk' || activeTab === 'deep-research') && images.length > 0 && (
          <div className="space-y-6 mt-8">
            <div className="flex items-center justify-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'deep-research' ? '분석에 사용된 관련 문서' : '관련 문서'} ({images.length}개)
              </h2>
              
              {/* 전체 하이라이트 토글 버튼 */}
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-full px-4 py-2">
                <label className="text-sm font-medium text-yellow-800 cursor-pointer">
                  하이라이트
                </label>
                <div 
                  className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ${
                    globalHighlightEnabled ? 'bg-yellow-400' : 'bg-gray-300'
                  }`}
                  onClick={toggleGlobalHighlight}
                >
                  <div 
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                      globalHighlightEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </div>
                <span className="text-xs text-yellow-700">
                  {globalHighlightEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((image, index) => {
                const imageKey = `${image.file_id}-${image.page}`;
                const showOverlayState = showOverlay.get(imageKey) || false;
                const imageSegments = getImageSegments(image.file_id, image.page);
                
                // 전체 하이라이트가 활성화되어 있거나 개별 하이라이트가 활성화되어 있으면 하이라이트 표시
                const shouldShowHighlight = globalHighlightEnabled || showOverlayState;
                
                // coordinates 정보를 URL 파라미터로 포함
                let currentImageUrl = image.url;
                if (shouldShowHighlight && imageSegments.coordinates.length > 0) {
                  const coordinatesParam = encodeURIComponent(JSON.stringify(imageSegments.coordinates));
                  currentImageUrl = `${image.url}&highlight=true&coordinates=${coordinatesParam}`;
                }
                
                // 디버깅용 로그 (첫 번째 이미지만)
                if (index === 0) {
                  console.log(`[RENDER] Image ${imageKey}:`, {
                    showOverlayState,
                    shouldShowHighlight,
                    segmentsCount: imageSegments.count,
                    coordinatesCount: imageSegments.coordinates.length,
                    originalUrl: image.url,
                    currentImageUrl
                  });
                }
                
                return (
                <Card key={`${image.file_id}-${image.page}-${index}`} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow min-h-[400px] max-h-[600px] flex flex-col">
                  <div className="bg-gray-100 relative group flex-1 flex items-center justify-center p-2 min-h-0">
                    {currentImageUrl ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <HighlightedImage
                          src={currentImageUrl}
                          alt={image.title || `페이지 ${image.page}`}
                          className="max-w-full max-h-full object-contain"
                          width={400}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/api/placeholder/400/500';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <div className="text-gray-500 text-center">
                          <div className="mb-2">이미지 로딩 중...</div>
                          <div className="text-sm">또는 이미지를 사용할 수 없습니다</div>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* 전체 하이라이트가 비활성화 상태일 때만 개별 토글 버튼 표시 */}
                      {!globalHighlightEnabled && (
                        <Button
                          onClick={() => toggleOverlay(image.file_id, image.page)}
                          className={`bg-black/60 hover:bg-black/80 text-white p-2 rounded-full ${
                            showOverlayState ? 'ring-2 ring-blue-400' : ''
                          }`}
                          size="sm"
                          title={showOverlayState ? 'Hide Segments' : 'Show Segments'}
                        >
                          <div className="h-4 w-4 flex items-center justify-center">
                            {showOverlayState ? '◉' : '○'}
                          </div>
                        </Button>
                      )}
                      
                      {/* 전체 하이라이트가 활성화 상태일 때 하이라이트 상태 표시 */}
                      {globalHighlightEnabled && (
                        <div className="bg-yellow-400/90 text-yellow-900 px-3 py-1 rounded-full text-xs font-medium flex items-center justify-center">
                          하이라이트 ON
                        </div>
                      )}
                      
                      {/* Maximize Button */}
                      <Button
                        onClick={() => openImageModal(image)}
                        className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
                        size="sm"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4 flex-shrink-0 border-t bg-white min-h-[80px]">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600 mb-1 truncate">
                          {image.filename ? `파일명: ${image.filename}` : `파일 ID: ${image.file_id}`}
                        </p>
                        <p className="font-semibold text-gray-900 truncate">
                          {image.title || `페이지 ${image.page}`}
                        </p>
                      </div>
                      <Button
                        onClick={() => openFileViewer(image)}
                        variant="outline"
                        size="sm"
                        className="ml-2 text-xs flex-shrink-0"
                      >
                        전체보기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          </div>
        )}
        


        {/* Empty State - 검색 실행 후 결과 없음 */}
        {!isLoading && images.length === 0 && hasSearched && !fastTalkResponse && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-gray-600">
              관련된 문서를 찾을 수 없습니다.
            </p>
            <p className="text-gray-500 mt-2">
              다른 키워드로 검색해보세요.
            </p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {isModalOpen && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-6xl max-h-[90vh] w-full mx-4">
            <Button
              onClick={closeImageModal}
              className="absolute -top-12 right-0 bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
              size="sm"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <div className="flex flex-col">
                <div className="bg-gray-100 p-4 border-b">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {selectedImage.title || `페이지 ${selectedImage.page}`}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedImage.filename ? `파일명: ${selectedImage.filename}` : `파일 ID: ${selectedImage.file_id}`}
                  </p>
                </div>
                <div className="p-4 max-h-[70vh] overflow-auto">
                  {(() => {
                    const imageKey = `${selectedImage.file_id}-${selectedImage.page}`;
                    const showOverlayState = showOverlay.get(imageKey) || false;
                    const imageSegments = getImageSegments(selectedImage.file_id, selectedImage.page);
                    
                    // 전체 하이라이트가 활성화되어 있거나 개별 하이라이트가 활성화되어 있으면 하이라이트 표시
                    const shouldShowHighlight = globalHighlightEnabled || showOverlayState;
                    
                    // coordinates 정보를 URL 파라미터로 포함
                    let currentImageUrl = selectedImage.url;
                    if (shouldShowHighlight && imageSegments.coordinates.length > 0) {
                      const coordinatesParam = encodeURIComponent(JSON.stringify(imageSegments.coordinates));
                      currentImageUrl = `${selectedImage.url}&highlight=true&coordinates=${coordinatesParam}`;
                    }
                    
                    return (
                      <div className="relative">
                        {currentImageUrl ? (
                          <div style={{ maxWidth: '100%', maxHeight: '70vh' }}>
                            <HighlightedImage
                              src={currentImageUrl}
                              alt={selectedImage.title || `페이지 ${selectedImage.page}`}
                              className="w-full h-auto"
                              width={1000}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/api/placeholder/800/1000';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-96 flex items-center justify-center bg-gray-200">
                            <div className="text-gray-500 text-center">
                              <div className="mb-2 text-lg">이미지 로딩 중...</div>
                              <div>또는 이미지를 사용할 수 없습니다</div>
                            </div>
                          </div>
                        )}
                        
                        {/* Modal에서의 하이라이트 버튼 - 전체 하이라이트 상태에 따라 다르게 표시 */}
                        {globalHighlightEnabled ? (
                          <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg text-sm font-medium">
                            전체 하이라이트 활성화됨
                          </div>
                        ) : (
                          <Button
                            onClick={() => toggleOverlay(selectedImage.file_id, selectedImage.page)}
                            className={`absolute top-4 right-4 ${
                              showOverlayState 
                                ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300' 
                                : 'bg-gray-600 hover:bg-gray-700'
                            } text-white px-3 py-2 rounded-lg`}
                            size="sm"
                          >
                            {showOverlayState ? 'Hide Segments' : 'Show Segments'}
                            <div className="ml-2">
                              {showOverlayState ? '◉' : '○'}
                            </div>
                          </Button>
                        )}
                        
                        {shouldShowHighlight && imageSegments.coordinates.length > 0 && (
                          <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
                            {imageSegments.count}개 세그먼트 표시됨 ({imageSegments.coordinates.length}개 좌표)
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal - 전체 페이지 연속 보기 */}
      {selectedImage && (
        <FileViewerModal
          isOpen={isFileViewerOpen}
          onClose={closeFileViewer}
          fileId={selectedImage.file_id}
          currentPage={selectedImage.page}
          filename={selectedImage.filename}
          segments={segments}
          globalHighlightEnabled={globalHighlightEnabled}
          showOverlay={showOverlay}
          onToggleOverlay={toggleOverlay}
          getImageSegments={getImageSegments}
        />
      )}
    </div>
  );
}