import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = "http://ec2-3-37-235-10.ap-northeast-2.compute.amazonaws.com:8888/api/v1/market-trends";

interface Coordinate {
  x: number;
  y: number;
}

interface SegmentData {
  file_id: string;
  page_id: number;
  trend_id?: number;
  coordinates?: Coordinate[];
  title?: string;
  description?: string;
}

interface OverlayRequest {
  file_id: string;
  page: number;
  page_id?: number;
  trend_id?: number;
  segments?: SegmentData[];
}

// 이미지에 하이라이트 overlay를 생성하는 함수
async function createHighlightOverlay(
  originalImageUrl: string, 
  coordinates: Coordinate[]
): Promise<string> {
  try {
    console.log('[OVERLAY] Creating highlight overlay for coordinates:', coordinates);
    
    // 실제 이미지 처리를 위한 API 호출
    // 백엔드의 이미지 처리 서비스에 overlay 요청
    const overlayResponse = await fetch(`${BASE_URL}/images/overlay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: originalImageUrl,
        overlay_type: 'highlight',
        coordinates: coordinates,
        highlight_color: '#FFFF00', // 형광 노란색
        border_width: 3,
        opacity: 0.3
      })
    });

    if (!overlayResponse.ok) {
      console.warn('[OVERLAY] Backend overlay service not available, using fallback');
      // 백엔드 서비스가 없는 경우 클라이언트 측에서 처리하도록 좌표 정보 포함
      const coordinatesParam = encodeURIComponent(JSON.stringify(coordinates));
      return `${originalImageUrl}&overlay=highlight&coordinates=${coordinatesParam}`;
    }

    const overlayResult = await overlayResponse.json();
    console.log('[OVERLAY] Backend overlay created:', overlayResult);
    
    return overlayResult.overlay_url || originalImageUrl;
  } catch (error) {
    console.error('[OVERLAY] Highlight overlay creation failed, using fallback:', error);
    // 오류 발생 시 클라이언트 측에서 처리하도록 좌표 정보 포함
    const coordinatesParam = encodeURIComponent(JSON.stringify(coordinates));
    return `${originalImageUrl}&overlay=highlight&coordinates=${coordinatesParam}`;
  }
}

// 이미지 URL을 가져오는 함수
async function getImageUrl(fileId: string, page: number): Promise<string> {
  const url = `${BASE_URL}/file/${fileId}/images/pages/${page}`;
  const params = new URLSearchParams({ expires_in: '3600' });

  const response = await fetch(`${url}?${params}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Image URL fetch failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.url || '';
}

export async function POST(request: NextRequest) {
  try {
    const body: OverlayRequest = await request.json();
    const { file_id, page, segments } = body;

    console.log('[OVERLAY] Creating overlay for:', { file_id, page });
    console.log('[OVERLAY] Segments:', segments?.length || 0);

    // 원본 이미지 URL 가져오기
    const originalImageUrl = await getImageUrl(file_id, page);
    if (!originalImageUrl) {
      return NextResponse.json({
        success: false,
        message: 'Original image not found'
      }, { status: 404 });
    }

    // 해당 file_id와 page에 매칭되는 segments 찾기
    const matchingSegments = segments?.filter(segment => 
      segment.file_id === file_id
    ) || [];

    console.log('[OVERLAY] Matching segments:', matchingSegments.length);

    if (matchingSegments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No matching segments found for this page'
      });
    }

    // coordinates 정보 수집
    const allCoordinates: Coordinate[] = [];
    matchingSegments.forEach(segment => {
      if (segment.coordinates && Array.isArray(segment.coordinates)) {
        allCoordinates.push(...segment.coordinates);
      }
    });

    console.log('[OVERLAY] Total coordinates:', allCoordinates.length);

    if (allCoordinates.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No coordinates found in segments'
      });
    }

    // 하이라이트 overlay 이미지 생성
    const overlayImageUrl = await createHighlightOverlay(originalImageUrl, allCoordinates);

    return NextResponse.json({
      success: true,
      image_url: overlayImageUrl,
      original_url: originalImageUrl,
      overlay_info: {
        total_elements: matchingSegments.length,
        coordinates_count: allCoordinates.length
      },
      message: `Overlay created with ${matchingSegments.length} segments highlighted`
    });

  } catch (error) {
    console.error('[OVERLAY] API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error occurred during overlay creation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
