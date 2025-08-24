import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const BASE_URL = "http://ec2-3-37-235-10.ap-northeast-2.compute.amazonaws.com:8888/api/v1/market-trends";

// API keys (for demo - replace with your actual key)
const OPENAI_API_KEY = "your-openai-api-key-here";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

interface FastTalkRequest {
  query: string;
  limit?: number;
  step?: 'search' | 'analyze';
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
  coordinates?: Array<{x: number; y: number}>; // 하이라이트를 위한 coordinates 추가
}

interface PageInfo {
  page_id: number;
  page: number;
  file_id: string;
  image_storage_path?: string;
  raw_text?: string;
}

interface ImageResult {
  file_id: string;
  page: number;
  url: string;
  title?: string;
  filename?: string;
}

// Segment search function
async function searchSegments(query: string, limit: number = 10): Promise<SegmentResult[]> {
  const url = `${BASE_URL}/segments/search`;
  const payload = {
    query: query,
    layout_types: ["table", "chart"],
    limit: limit,
    search_type: "similarity",
    include_coordinates: true // coordinates 정보도 포함하여 반환
  };

  console.log(`[FAST-TALK] Starting segment search: ${query}`);
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
  return results;
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

// Fast analysis using segments data (description, marketing_insight, markdown)
async function analyzeSegmentsWithGPT(query: string, segments: SegmentResult[]): Promise<string> {
  try {
    console.log(`[FAST-TALK] Starting segments analysis: ${segments.length} segments`);
    
    // Extract description, marketing_insight, and markdown from segments
    const segmentData = segments.map((segment, index) => {
      const data = [];
      if (segment.title) data.push(`제목: ${segment.title}`);
      if (segment.description) data.push(`설명: ${segment.description}`);
      if (segment.marketing_insight) data.push(`마케팅 인사이트: ${segment.marketing_insight}`);
      if (segment.markdown) data.push(`상세 내용: ${segment.markdown}`);
      
      return data.length > 0 ? `[문서 ${index + 1}]\n${data.join('\n')}` : null;
    }).filter(data => data !== null);
    
    console.log(`[FAST-TALK] Valid segments data: ${segmentData.length}/${segments.length}`);
    
    if (segmentData.length === 0) {
      return `"${query}" 관련 문서를 찾았지만 상세 정보가 아직 처리되지 않았습니다.

## 빠른 답변
- ${segments.length}개의 관련 문서가 검색되었습니다
- 현재 상세 분석 데이터가 준비되지 않은 상태입니다

## 권장사항
- 이미지를 직접 확인해주세요
- Deep Research 기능을 사용하면 이미지 분석이 가능합니다`;
    }
    
    // Combine all segment data
    const combinedData = segmentData.join('\n\n--- 다음 문서 ---\n\n');
    console.log(`[FAST-TALK] Combined data length: ${combinedData.length} characters`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `다음은 비즈니스 연구 문서들에서 추출된 정보입니다. "${query}" 질문에 대해 빠르고 간결하게 답변해주세요.

문서 정보:
${combinedData}

다음 형식으로 한국어로 간결하게 답변해주세요:

## 핵심 답변
(질문에 대한 직접적이고 간결한 답변)

## 주요 데이터
(문서에서 발견한 중요한 수치나 정보)

## 마케팅 인사이트
(마케팅 관점에서의 핵심 통찰)

## 실무 포인트
(실제 업무에 바로 적용할 수 있는 핵심 포인트 2-3개)

문서에서 언급된 구체적인 데이터, 브랜드명, 수치, 마케팅 인사이트를 활용해서 빠르고 정확하게 답변해주세요.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.2
    });

    const analysis = completion.choices[0]?.message?.content || "분석 결과를 가져올 수 없습니다.";
    console.log(`[FAST-TALK] Analysis completed`);
    console.log(`[FAST-TALK] Response preview:`, analysis.substring(0, 200));
    
    return analysis;
  } catch (error) {
    console.error('[FAST-TALK] Analysis error:', error);
    throw new Error('빠른 분석 중 오류가 발생했습니다.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: FastTalkRequest = await request.json();
    const { query, limit = 10, step = 'search' } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required.' },
        { status: 400 }
      );
    }

    console.log(`[FAST-TALK] Query: "${query}", limit: ${limit}, step: ${step}`);

    if (step === 'search') {
      // Step 1: Segment search and return documents
      const segments = await searchSegments(query.trim(), limit);
      console.log(`[FAST-TALK] Found segments: ${segments.length}`);

      if (segments.length === 0) {
        return NextResponse.json({
          step: 'search',
          images: [],
          message: 'No related segments found.'
        });
      }

      // Get file metadata and image URLs
      const uniqueFileIds = [...new Set(segments.map(segment => segment.file_id))];
      
      const fileMetadataPromises = uniqueFileIds.map(async (fileId) => {
        const metadata = await getFileMetadata(fileId);
        return { fileId, metadata };
      });
      
      const fileMetadataResults = await Promise.all(fileMetadataPromises);
      const fileMetadataMap = new Map();
      fileMetadataResults.forEach(({ fileId, metadata }) => {
        fileMetadataMap.set(fileId, metadata);
      });

      const imagePromises = segments.map(async (segment): Promise<ImageResult | null> => {
        try {
          const pageInfo = await getPageInfo(segment.page_id);
          if (!pageInfo) {
            console.error(`[ERROR] Page info not found for page_id: ${segment.page_id}`);
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
          console.error(`[ERROR] Image URL fetch failed (segment page_id: ${segment.page_id}):`, error);
          return null;
        }
      });

      const imageResults = await Promise.all(imagePromises);
      const validImages = imageResults.filter((img): img is ImageResult => img !== null);

      console.log(`[FAST-TALK] Valid images: ${validImages.length}`);

      // segments에 page 정보 추가
      const segmentsWithPageInfo = await Promise.all(segments.map(async (segment) => {
        try {
          const pageInfo = await getPageInfo(segment.page_id);
          return {
            ...segment,
            page: pageInfo?.page // page 정보 추가
          };
        } catch (error) {
          console.warn(`[WARNING] Page info fetch failed for segment ${segment.page_id}`);
          return segment;
        }
      }));

      return NextResponse.json({
        step: 'search',
        images: validImages,
        segments: segmentsWithPageInfo, // page 정보가 포함된 segments 데이터 반환
        total: validImages.length,
        message: `Found ${validImages.length} related segments`
      });

    } else if (step === 'analyze') {
      // Step 2: Analyze segments data with GPT-4o
      const { segments } = body as any;
      
      if (!segments || !Array.isArray(segments)) {
        return NextResponse.json(
          { error: 'Segments data is required for analysis.' },
          { status: 400 }
        );
      }

      const gptAnalysis = await analyzeSegmentsWithGPT(query, segments);

      return NextResponse.json({
        step: 'analyze',
        gptAnalysis,
        message: 'Fast Talk analysis completed'
      });
    }

    return NextResponse.json(
      { error: 'Invalid step parameter.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[FAST-TALK] API error:', error);
    return NextResponse.json(
      { 
        error: 'Fast Talk 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}