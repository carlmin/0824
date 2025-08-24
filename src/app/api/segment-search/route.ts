import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = "http://ec2-3-37-235-10.ap-northeast-2.compute.amazonaws.com:8888/api/v1/market-trends";

interface SegmentSearchRequest {
  query: string;
  limit?: number;
  search_country?: string[];
  data_provider?: string[];
  filter_year?: number;
  filter_month?: number;
  filter_recent_months?: number;
}

interface Coordinate {
  x: number;
  y: number;
}

interface SegmentResult {
  file_id: string;
  page_id: number;
  title?: string;
  similarity_score?: number;
  layout_type?: string;
  description?: string;
  marketing_insight?: string;
  markdown?: string;
  trend_id?: number; // trend_id가 있을 수 있음
  coordinates?: Coordinate[]; // coordinates 추가
}

interface PageInfo {
  page_id: number;
  page: number;
  file_id: string;
  image_storage_path?: string;
  raw_text?: string;
  created_at?: string;
  updated_at?: string;
}

interface ImageResult {
  file_id: string;
  page: number;
  url: string;
  title?: string;
  filename?: string;
}

// Segment search function
async function searchSegments(
  query: string, 
  limit: number = 10,
  filterParams: Partial<SegmentSearchRequest> = {}
): Promise<SegmentResult[]> {
  const url = `${BASE_URL}/segments/search`;
  const payload: any = {
    query: query,
    layout_types: ["table", "chart"],
    limit: limit,
    search_type: "similarity"
  };

  // 필터 파라미터 추가
  if (filterParams.search_country && filterParams.search_country.length > 0) {
    payload.search_country = filterParams.search_country;
  }
  if (filterParams.data_provider && filterParams.data_provider.length > 0) {
    payload.data_provider = filterParams.data_provider;
  }
  if (filterParams.filter_year) {
    payload.filter_year = filterParams.filter_year;
  }
  if (filterParams.filter_month) {
    payload.filter_month = filterParams.filter_month;
  }
  if (filterParams.filter_recent_months) {
    payload.filter_recent_months = filterParams.filter_recent_months;
  }

  console.log(`[SEGMENT-SEARCH] Starting segment search: ${query}`);
  console.log(`[SEGMENT-SEARCH] Filter params:`, filterParams);
  console.log(`[SEGMENT-SEARCH] Full payload:`, payload);
  const startTime = Date.now();
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Segment search failed: ${response.status} ${response.statusText}`);
  }

  const endTime = Date.now();
  console.log(`[TIMER] Segment search completed in: ${(endTime - startTime) / 1000}s`);
  
  const results = await response.json();
  
  // coordinates가 string으로 저장되어 있다면 파싱
  const processedResults = results.map((segment: any) => {
    if (segment.coordinates && typeof segment.coordinates === 'string') {
      try {
        segment.coordinates = JSON.parse(segment.coordinates);
        console.log(`[SEGMENT-SEARCH] Parsed coordinates for segment:`, segment.coordinates);
      } catch (error) {
        console.warn(`[SEGMENT-SEARCH] Failed to parse coordinates:`, segment.coordinates);
        segment.coordinates = [];
      }
    }
    return segment;
  });
  
  console.log(`[SEGMENT-SEARCH] Sample segment with coordinates:`, processedResults.find((s: any) => s.coordinates && s.coordinates.length > 0));
  
  return processedResults;
}

// Get page info by page_id
async function getPageInfo(pageId: number): Promise<PageInfo | null> {
  try {
    const url = `${BASE_URL}/page/${pageId}`;
    console.log(`[PAGE-INFO] Requesting page info: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      console.warn(`Page info fetch failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    console.log(`[PAGE-INFO] Page info API response:`, result);
    
    return result;
  } catch (error) {
    console.error(`Page info fetch error:`, error);
    return null;
  }
}

// Get image URL
async function getImageUrl(fileId: string, page: number): Promise<string> {
  const url = `${BASE_URL}/file/${fileId}/images/pages/${page}`;
  const params = new URLSearchParams({ expires_in: '3600' });

  console.log(`[IMAGE] Requesting image URL: ${url}?${params}`);
  
  const response = await fetch(`${url}?${params}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Image URL fetch failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`[IMAGE] Image API response:`, result);
  
  return result.url || '';
}

// Get file metadata
async function getFileMetadata(fileId: string): Promise<{ filename?: string; name?: string } | null> {
  try {
    const url = `${BASE_URL}/file/${fileId}/metadata`;

    console.log(`[METADATA] Requesting file metadata: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      console.warn(`File metadata fetch failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    console.log(`[METADATA] File metadata API response:`, result);
    
    return {
      filename: result.filename || result.file_name,
      name: result.name
    };
  } catch (error) {
    console.error(`File metadata fetch error:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SegmentSearchRequest = await request.json();
    const { 
      query, 
      limit = 10,
      search_country,
      data_provider,
      filter_year,
      filter_month,
      filter_recent_months
    } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required.' },
        { status: 400 }
      );
    }

    console.log(`[SEGMENT-SEARCH] Search query: "${query}", limit: ${limit}`);
    
    const filterParams = {
      search_country,
      data_provider,
      filter_year,
      filter_month,
      filter_recent_months
    };
    
    // 1. Segment search with filters
    const segments = await searchSegments(query.trim(), limit, filterParams);
    console.log(`[SEGMENT-SEARCH] Found segments: ${segments.length}`);

    if (segments.length === 0) {
      return NextResponse.json({
        images: [],
        message: 'No related segments found.'
      });
    }

    // 2. Get page info for each segment and create image results + update segments with page info
    const imagePromises = segments.map(async (segment, index): Promise<ImageResult | null> => {
      try {
        // Get page info to get the actual page number
        const pageInfo = await getPageInfo(segment.page_id);
        if (!pageInfo) {
          console.error(`[ERROR] Page info not found for page_id: ${segment.page_id}`);
          return null;
        }

        // IMPORTANT: segments 배열에 실제 page 번호 추가 (페이지별 필터링용)
        segments[index].target_page = pageInfo.page;

        // Get image URL
        const imageUrl = await getImageUrl(segment.file_id, pageInfo.page);
        if (!imageUrl) {
          console.error(`[ERROR] Image URL not found for file: ${segment.file_id}, page: ${pageInfo.page}`);
          return null;
        }

        return {
          file_id: segment.file_id,
          page: pageInfo.page,
          url: imageUrl,
          title: segment.title,
          filename: segment.file_id // 일단 file_id로 표시, metadata는 선택적으로
        };
      } catch (error) {
        console.error(`[ERROR] Failed to process segment (page_id: ${segment.page_id}):`, error);
        return null;
      }
    });

    const imageResults = await Promise.all(imagePromises);
    const validImages = imageResults.filter((img): img is ImageResult => img !== null);

    // 3. 선택적으로 metadata 가져오기 (성능 최적화)
    if (validImages.length > 0) {
      console.log(`[SEGMENT-SEARCH] Fetching metadata for ${validImages.length} unique files...`);
      
      // 고유한 file_id만 추출
      const uniqueFileIds = [...new Set(validImages.map(img => img.file_id))];
      console.log(`[SEGMENT-SEARCH] Unique file IDs: ${uniqueFileIds.length}`);
      
      // metadata 병렬 호출
      const metadataPromises = uniqueFileIds.map(async (fileId) => {
        try {
          const metadata = await getFileMetadata(fileId);
          return { fileId, metadata };
        } catch (error) {
          console.warn(`[SEGMENT-SEARCH] Failed to get metadata for ${fileId}:`, error);
          return { fileId, metadata: null };
        }
      });

      const metadataResults = await Promise.all(metadataPromises);
      const metadataMap = new Map(
        metadataResults.map(({ fileId, metadata }) => [
          fileId,
          metadata?.name || metadata?.filename || fileId
        ])
      );

      // filename 업데이트
      validImages.forEach(image => {
        image.filename = metadataMap.get(image.file_id) || image.file_id;
      });
    }

    console.log(`[SEGMENT-SEARCH] Valid images: ${validImages.length}`);

    // segments에 coordinates 포함 여부 확인
    const segmentsWithCoordinates = segments.filter((s: any) => s.coordinates && s.coordinates.length > 0);
    console.log(`[SEGMENT-SEARCH] Segments with coordinates: ${segmentsWithCoordinates.length}/${segments.length}`);
    
    // 페이지별 분포 확인 (디버깅용)
    const pageDistribution: {[key: string]: number} = {};
    segments.forEach(segment => {
      const key = `${segment.file_id}-page${segment.target_page || 'unknown'}`;
      pageDistribution[key] = (pageDistribution[key] || 0) + 1;
    });
    console.log(`[SEGMENT-SEARCH] Page distribution:`, pageDistribution);

    return NextResponse.json({
      images: validImages,
      segments: segments, // processed segments 반환 (target_page 포함, coordinates 파싱된 데이터)
      total: validImages.length,
      message: `Found ${validImages.length} related segments (${segmentsWithCoordinates.length} with coordinates)`
    });

  } catch (error) {
    console.error('[SEGMENT-SEARCH] API error:', error);
    return NextResponse.json(
      { 
        error: 'Error occurred during segment search processing.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
