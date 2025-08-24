'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import HighlightedImage from '@/components/HighlightedImage';
import axios from 'axios';

interface ImageResult {
  file_id: string;
  page: number;
  url: string;
  title?: string;
  filename?: string;
}

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  currentPage: number;
  filename?: string;
  // 하이라이트 관련 props (선택적)
  segments?: any[];
  globalHighlightEnabled?: boolean;
  showOverlay?: Map<string, boolean>;
  onToggleOverlay?: (fileId: string, page: number) => void;
  getImageSegments?: (fileId: string, page: number) => {
    segments: any[];
    coordinates: any[];
    count: number;
  };
}

interface FilePageResponse {
  file_id: string;
  filename?: string;
  pages: ImageResult[];
  total: number;
  message: string;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onClose,
  fileId,
  currentPage,
  filename,
  segments = [],
  globalHighlightEnabled = false,
  showOverlay = new Map(),
  onToggleOverlay,
  getImageSegments
}) => {
  const [pages, setPages] = useState<ImageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 파일의 모든 페이지 데이터 로드
  const loadFilePages = async () => {
    if (!fileId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`[FILE-VIEWER] ===== LOADING FILE PAGES =====`);
      console.log(`[FILE-VIEWER] Target file_id: ${fileId}`);
      console.log(`[FILE-VIEWER] Target currentPage: ${currentPage}`);
      console.log(`[FILE-VIEWER] Target filename: ${filename}`);
      
      const response = await axios.get<FilePageResponse>('/api/file-pages', {
        params: { file_id: fileId }
      });
      
      console.log(`[FILE-VIEWER] API Response:`, response.data);
      
      if (response.data.pages && response.data.pages.length > 0) {
        const allPages = response.data.pages;
        console.log(`[FILE-VIEWER] All pages:`, allPages.map(p => `${p.page}(${p.file_id})`));
        
        // 검색된 페이지 찾기
        const currentPageIndex = allPages.findIndex(p => p.page === currentPage);
        
        console.log(`[FILE-VIEWER] Looking for page ${currentPage}, found at index: ${currentPageIndex}`);
        
        if (currentPageIndex >= 0) {
          // 원래 순서 유지, 검색된 페이지의 실제 인덱스만 설정
          setPages(allPages);
          setCurrentPageIndex(currentPageIndex);
          setInitialScrollDone(false);
          
          console.log(`[FILE-VIEWER] ✅ SUCCESS: Loaded ${allPages.length} pages, target page ${currentPage} at index ${currentPageIndex}`);
        } else {
          setPages(allPages);
          setCurrentPageIndex(0);
          console.log(`[FILE-VIEWER] ⚠️ WARNING: Page ${currentPage} not found, starting from first page`);
        }
      } else {
        console.log(`[FILE-VIEWER] ❌ ERROR: No pages found for file ${fileId}`);
        setError('이 파일에 대한 페이지를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('[FILE-VIEWER] ❌ API ERROR:', error);
      setError('페이지를 로드하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (isOpen && fileId) {
      loadFilePages();
    }
  }, [isOpen, fileId]);

  // Intersection Observer를 사용한 정확한 페이지 감지
  useEffect(() => {
    if (!isOpen || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 가장 많이 보이는 페이지 찾기
        let mostVisibleEntry = entries[0];
        let maxIntersectionRatio = 0;

        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxIntersectionRatio) {
            maxIntersectionRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });

        // 50% 이상 보이는 경우에만 현재 페이지로 설정
        if (initialScrollDone && mostVisibleEntry && mostVisibleEntry.intersectionRatio > 0.5) {
          const pageIndex = pageRefs.current.findIndex(ref => ref === mostVisibleEntry.target);
          if (pageIndex !== -1 && pageIndex !== currentPageIndex) {
            console.log(`[OBSERVER] Page changed to ${pageIndex} (page ${pages[pageIndex]?.page})`);
            setCurrentPageIndex(pageIndex);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '-20px 0px -20px 0px', // 상하 여백 고려
        threshold: [0.1, 0.3, 0.5, 0.7, 0.9] // 다양한 threshold로 정확도 향상
      }
    );

    // 모든 페이지 요소를 관찰
    pageRefs.current.forEach((pageRef) => {
      if (pageRef) {
        observer.observe(pageRef);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [isOpen, pages, currentPageIndex, initialScrollDone]);

  // 페이지 로드 후 검색된 페이지로 정확히 스크롤 (컨테이너 padding 고려)
  useEffect(() => {
    if (pages.length > 0 && currentPageIndex >= 0 && isOpen) {
      // 초기 스크롤을 몇 차례 시도하여 이미지 로딩/레이아웃 변동에도 정확히 맞추기
      let attempts = 0;
      const tryScroll = () => {
        const container = scrollContainerRef.current;
        const targetEl = pageRefs.current[currentPageIndex];
        if (container && targetEl) {
          const containerStyles = getComputedStyle(container);
          const paddingTop = parseFloat(containerStyles.paddingTop || '0');
          const snapOffset = parseFloat(containerStyles.scrollPaddingTop || '0');
          const offset = paddingTop || snapOffset || 0;
          const targetTop = targetEl.offsetTop - offset;
          container.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
          const delta = Math.abs(container.scrollTop - Math.max(0, targetTop));
          if (delta < 2 || attempts > 10) {
            setInitialScrollDone(true);
            return;
          }
        }
        attempts += 1;
        setTimeout(tryScroll, 60);
      };
      setInitialScrollDone(false);
      tryScroll();
      return () => {
        setInitialScrollDone(false);
      };
    }
  }, [pages.length, isOpen, currentPageIndex]);

  // 현재 페이지로 스크롤
  const scrollToPage = (pageIndex: number) => {
    if (pageRefs.current[pageIndex] && scrollContainerRef.current) {
      pageRefs.current[pageIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      setCurrentPageIndex(pageIndex);
    }
  };



  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // 하이라이트 처리를 위한 이미지 URL 생성
  const getImageUrlWithHighlight = (page: ImageResult) => {
    if (!getImageSegments || (!globalHighlightEnabled && !showOverlay.get(`${page.file_id}-${page.page}`))) {
      return page.url;
    }

    const imageSegments = getImageSegments(page.file_id, page.page);
    if (imageSegments.coordinates.length === 0) {
      return page.url;
    }

    const coordinatesParam = encodeURIComponent(JSON.stringify(imageSegments.coordinates));
    return `${page.url}&highlight=true&coordinates=${coordinatesParam}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-7xl mx-4 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm text-white p-4 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold">
              {filename || `파일 ID: ${fileId}`}
            </h3>
            {pages.length > 0 && (
              <p className="text-sm text-white/80">
                페이지 {pages[currentPageIndex]?.page} / {pages.length} (인덱스: {currentPageIndex + 1}/{pages.length})
              </p>
            )}
          </div>
          
          {/* 페이지 네비게이션 */}
          {pages.length > 1 && (
            <div className="flex items-center gap-2 mr-4">
              <Button
                onClick={() => scrollToPage(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
                className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
                size="sm"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <span className="text-sm text-white/80 min-w-[60px] text-center">
                {pages[currentPageIndex]?.page || currentPageIndex + 1}
              </span>
              <Button
                onClick={() => scrollToPage(Math.min(pages.length - 1, currentPageIndex + 1))}
                disabled={currentPageIndex === pages.length - 1}
                className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
                size="sm"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <Button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
            size="sm"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-b-lg overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">페이지를 로드하는 중...</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-red-600">
                <p className="text-lg mb-2">오류 발생</p>
                <p className="text-sm">{error}</p>
                <Button 
                  onClick={loadFilePages}
                  className="mt-4"
                  variant="outline"
                >
                  다시 시도
                </Button>
              </div>
            </div>
          ) : pages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-600">
                <p className="text-lg">페이지를 찾을 수 없습니다</p>
              </div>
            </div>
          ) : (
            <div 
              ref={scrollContainerRef}
              className="h-full overflow-y-auto scroll-smooth"
              style={{ scrollSnapType: 'y mandatory', scrollPaddingTop: '24px', scrollBehavior: 'smooth' as any }}
            >
              <div className="space-y-8 p-6">
                {pages.map((page, index) => {
                  const imageKey = `${page.file_id}-${page.page}`;
                  const currentImageUrl = getImageUrlWithHighlight(page);
                  const showOverlayState = showOverlay.get(imageKey) || false;
                  const shouldShowHighlight = globalHighlightEnabled || showOverlayState;
                  
                  return (
                    <div
                      key={`${page.file_id}-${page.page}`}
                      ref={(el) => { pageRefs.current[index] = el; }}
                      className={`bg-gray-50 rounded-lg p-4 transition-all duration-200 ${
                        index === currentPageIndex ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                      }`}
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      {/* 페이지 헤더 */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            페이지 {page.page}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {page.title || `${page.file_id} - 페이지 ${page.page}`}
                          </p>
                        </div>
                        
                        {/* 하이라이트 토글 버튼 (전체 하이라이트가 비활성화일 때만) */}
                        {onToggleOverlay && getImageSegments && !globalHighlightEnabled && (
                          <Button
                            onClick={() => onToggleOverlay(page.file_id, page.page)}
                            className={`${
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
                        
                        {/* 전체 하이라이트 상태 표시 */}
                        {globalHighlightEnabled && (
                          <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-lg text-sm font-medium flex items-center justify-center">
                            전체 하이라이트 활성화됨
                          </div>
                        )}
                      </div>
                      
                      {/* 이미지 */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="relative">
                          {currentImageUrl ? (
                            <HighlightedImage
                              src={currentImageUrl}
                              alt={page.title || `페이지 ${page.page}`}
                              className="w-full h-auto max-h-[80vh] object-contain"
                              width={800}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/api/placeholder/800/1000';
                              }}
                            />
                          ) : (
                            <div className="w-full h-96 flex items-center justify-center bg-gray-200 rounded">
                              <div className="text-gray-500 text-center">
                                <div className="mb-2">이미지 로딩 중...</div>
                                <div className="text-sm">또는 이미지를 사용할 수 없습니다</div>
                              </div>
                            </div>
                          )}
                          
                          {/* 세그먼트 정보 표시 */}
                          {shouldShowHighlight && getImageSegments && (
                            (() => {
                              const imageSegments = getImageSegments(page.file_id, page.page);
                              if (imageSegments.coordinates.length > 0) {
                                return (
                                  <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
                                    {imageSegments.count}개 세그먼트 표시됨 ({imageSegments.coordinates.length}개 좌표)
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;
