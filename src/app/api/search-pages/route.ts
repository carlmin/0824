import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = "http://ec2-3-37-235-10.ap-northeast-2.compute.amazonaws.com:8888/api/v1/market-trends";

interface SearchPagesRequest {
  query: string;
  limit?: number;
}

interface PageSearchResult {
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

interface SegmentResult {
  file_id: string;
  page_id: number;
  title?: string;
  similarity_score?: number;
  layout_type?: string;
}

interface PageInfo {
  page_id: number;
  page: number;
  file_id: string;
  image_storage_path?: string;
  raw_text?: string;
}

// Segment search function (testcode.py 로직 적용)
async function searchSegments(query: string, limit: number = 10): Promise<SegmentResult[]> {
  const url = `${BASE_URL}/segments/search`;
  const payload = {
    query: query,
    layout_types: ["table", "chart"],
    limit: limit,
    search_type: "similarity"
  };

  console.log(`🔍 세그먼트 검색 시작: ${query}`);
  const startTime = Date.now();
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`세그먼트 검색 실패: ${response.status} ${response.statusText}`);
  }

  const endTime = Date.now();
  console.log(`⏱️ 세그먼트 검색 소요시간: ${(endTime - startTime) / 1000}초`);
  
  const results = await response.json();
  return results;
}

// Get page info by page_id
async function getPageInfo(pageId: number): Promise<PageInfo | null> {
  try {
    const url = `${BASE_URL}/page/${pageId}`;
    console.log(`페이지 정보 요청: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      console.warn(`페이지 정보 가져오기 실패: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    console.log(`페이지 정보 응답:`, result);
    
    return result;
  } catch (error) {
    console.error(`페이지 정보 가져오기 오류:`, error);
    return null;
  }
}

async function getImageUrl(fileId: string, page: number): Promise<string> {
  const url = `${BASE_URL}/file/${fileId}/images/pages/${page}`;
  const params = new URLSearchParams({ expires_in: '3600' });

  console.log(`이미지 URL 요청: ${url}?${params}`);
  
  const response = await fetch(`${url}?${params}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`이미지 URL 가져오기 실패: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`이미지 API 응답:`, result);
  
  return result.url || '';
}

async function getFileMetadata(fileId: string): Promise<{ filename?: string; name?: string } | null> {
  try {
    const url = `${BASE_URL}/file/${fileId}/metadata`;

    console.log(`파일 메타데이터 요청: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      console.warn(`파일 메타데이터 가져오기 실패: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    console.log(`파일 메타데이터 API 응답:`, result);
    
    return {
      filename: result.filename || result.file_name,
      name: result.name
    };
  } catch (error) {
    console.error(`파일 메타데이터 가져오기 오류:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchPagesRequest = await request.json();
    const { query, limit = 10 } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: '검색 질문이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log(`검색 쿼리: "${query}", 제한: ${limit}`);

    // 1. 세그먼트 검색 (testcode.py 로직)
    const segments = await searchSegments(query.trim(), limit);
    console.log(`검색된 세그먼트 수: ${segments.length}`);

    if (segments.length === 0) {
      return NextResponse.json({
        images: [],
        message: '관련된 문서를 찾을 수 없습니다.'
      });
    }

    // 2. 고유한 파일 ID들 추출
    const uniqueFileIds = [...new Set(segments.map(segment => segment.file_id))];
    
    // 3. 파일 메타데이터 한 번에 가져오기
    const fileMetadataPromises = uniqueFileIds.map(async (fileId) => {
      const metadata = await getFileMetadata(fileId);
      return { fileId, metadata };
    });
    
    const fileMetadataResults = await Promise.all(fileMetadataPromises);
    const fileMetadataMap = new Map();
    fileMetadataResults.forEach(({ fileId, metadata }) => {
      fileMetadataMap.set(fileId, metadata);
    });

    // 4. 각 세그먼트의 이미지 URL 가져오기
    const imagePromises = segments.map(async (segment): Promise<ImageResult | null> => {
      try {
        // 페이지 정보를 가져와서 실제 page 번호 확인
        const pageInfo = await getPageInfo(segment.page_id);
        if (!pageInfo) {
          console.error(`페이지 정보 없음 (page_id: ${segment.page_id})`);
          return null;
        }

        const imageUrl = await getImageUrl(segment.file_id, pageInfo.page);
        const fileMetadata = fileMetadataMap.get(segment.file_id);
        
        if (imageUrl) {
          return {
            file_id: segment.file_id,
            page: pageInfo.page,
            url: imageUrl,
            title: segment.title,
            filename: fileMetadata?.name || fileMetadata?.filename
          };
        }
        return null;
      } catch (error) {
        console.error(`이미지 URL 가져오기 실패 (segment page_id: ${segment.page_id}):`, error);
        return null;
      }
    });

    const imageResults = await Promise.all(imagePromises);
    const validImages = imageResults.filter((img): img is ImageResult => img !== null);

    console.log(`유효한 이미지 수: ${validImages.length}`);

    return NextResponse.json({
      images: validImages,
      total: validImages.length,
      message: `${validImages.length}개의 관련 문서를 찾았습니다.`
    });

  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { 
        error: '검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
