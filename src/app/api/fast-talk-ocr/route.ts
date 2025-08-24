import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const BASE_URL = "http://ec2-3-37-235-10.ap-northeast-2.compute.amazonaws.com:8888/api/v1/market-trends";

// API keys (for demo - replace with your actual keys)
const OPENAI_API_KEY = "your-openai-api-key-here";
const ANTHROPIC_API_KEY = "your-anthropic-api-key-here";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

interface FastTalkOCRRequest {
  query: string;
  limit?: number;
  step?: 'search' | 'analyze' | 'visualize';
  imageUrls?: string[];
  gptAnalysis?: string;
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

  console.log(`[SEARCH] Starting segment search: ${query}`);
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
async function getPageInfoForOCR(pageId: number): Promise<PageInfo | null> {
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





// Download image and convert to base64 for fallback
async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    console.log(`[DOWNLOAD] Attempting to download: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CDI-Bot/1.0)',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });
    
    if (!response.ok) {
      console.log(`[DOWNLOAD] Response not OK: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/png';
    console.log(`[DOWNLOAD] Content-Type: ${contentType}`);
    
    // Only process if it's an image
    if (!contentType.startsWith('image/')) {
      console.log(`[DOWNLOAD] Not an image: ${contentType}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    console.log(`[DOWNLOAD] Downloaded ${buffer.byteLength} bytes`);
    
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;
    
    console.log(`[DOWNLOAD] Successfully converted to base64, length: ${base64.length}`);
    return dataUrl;
  } catch (error) {
    console.error(`[DOWNLOAD] Failed to download image: ${url}`, error);
    return null;
  }
}

// Fallback image analysis when raw_text is not available
async function analyzeImagesAsTextFallback(query: string, imageUrls: string[]): Promise<string> {
  try {
    console.log(`[FALLBACK] Starting image analysis fallback: ${imageUrls.length} images`);
    
    // Download images as base64
    const base64Images = await Promise.all(
      imageUrls.slice(0, 3).map(url => downloadImageAsBase64(url)) // Limit to 3 images for fallback
    );
    
    const validBase64Images = base64Images.filter(img => img !== null);
    console.log(`[FALLBACK] Successfully downloaded: ${validBase64Images.length}/${imageUrls.length} images`);
    
    if (validBase64Images.length === 0) {
      return `"${query}" 관련 문서를 찾았지만 텍스트 분석이 불가능합니다. 이미지를 직접 확인해주세요.

## 주요 발견사항
- 관련 문서들이 검색되었습니다
- OCR 텍스트가 아직 처리되지 않은 문서들입니다

## 권장사항
- 이미지를 직접 확인하여 내용을 파악해주세요
- Deep Research 기능을 사용하여 이미지 분석을 시도해보세요`;
    }
    
    const imageMessages = validBase64Images.map(base64Url => ({
      type: "image_url" as const,
      image_url: {
        url: base64Url,
        detail: "high" as const
      }
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `다음 이미지들을 분석하여 "${query}" 질문에 답변해주세요.

이미지에서 텍스트를 읽고 내용을 분석해주세요.

다음 형식으로 한국어로 응답해주세요:

## 주요 발견사항
## 트렌드 분석  
## 실무 적용 방안
## 추가 고려사항

이미지에서 보이는 차트, 데이터, 텍스트를 중심으로 분석해주세요.`
            },
            ...imageMessages
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });

    const analysis = completion.choices[0]?.message?.content || "분석 결과를 가져올 수 없습니다.";
    console.log(`[FALLBACK] Analysis completed`);
    
    return analysis;
  } catch (error) {
    console.error('[FALLBACK] Analysis error:', error);
    return `"${query}" 관련 문서를 찾았지만 분석 중 오류가 발생했습니다.

## 주요 발견사항
- 관련 문서들이 검색되었습니다
- 현재 자동 분석이 일시적으로 불가능합니다

## 권장사항
- 이미지를 직접 확인하여 내용을 파악해주세요
- 잠시 후 다시 시도해보세요`;
  }
}

// Enhanced OCR analysis using raw text from database
async function analyzeRawTextsWithGPT4o(query: string, rawTexts: string[]): Promise<string> {
  try {
    console.log(`[GPT-4o-RAW] Starting raw text analysis: ${rawTexts.length} documents`);
    
    // Filter out empty raw texts
    const validRawTexts = rawTexts.filter(text => text && text.trim().length > 0);
    console.log(`[GPT-4o-RAW] Valid raw texts: ${validRawTexts.length}/${rawTexts.length}`);
    
    if (validRawTexts.length === 0) {
      throw new Error('No valid raw text available for analysis');
    }
    
    // Combine all raw texts
    const combinedText = validRawTexts.join('\n\n--- 다음 문서 ---\n\n');
    console.log(`[GPT-4o-RAW] Combined text length: ${combinedText.length} characters`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `다음은 비즈니스 연구 문서들에서 OCR로 추출된 원본 텍스트입니다. 이 텍스트들을 분석하여 다음 질문에 답변해주세요: "${query}"

이 텍스트들은 정당한 비즈니스 연구 문서에서 추출된 것으로, 시장 데이터, 트렌드, 산업 분석이 포함되어 있습니다.

원본 OCR 텍스트:
${combinedText}

다음 형식으로 한국어로 응답해주세요:

## 주요 발견사항
(텍스트에서 발견한 핵심 내용과 데이터)

## 트렌드 분석
(트렌드와 패턴 분석)

## 실무 적용 방안  
(실제 비즈니스에 적용할 수 있는 방안)

## 추가 고려사항
(추가로 고려해야 할 사항들)

## 참조 데이터
(분석에 사용된 주요 데이터나 수치들)

텍스트에서 언급된 구체적인 데이터, 수치, 브랜드명, 카테고리 등을 활용해서 분석해주세요.`
        }
      ],
      max_tokens: 3000,
      temperature: 0.3
    });

    const analysis = completion.choices[0]?.message?.content || "분석 결과를 가져올 수 없습니다.";
    console.log(`[GPT-4o-RAW] Analysis completed`);
    console.log(`[GPT-4o-RAW] Response preview:`, analysis.substring(0, 200));
    
    return analysis;
  } catch (error) {
    console.error('[GPT-4o-RAW] Analysis error:', error);
    throw new Error('원본 텍스트 분석 중 오류가 발생했습니다.');
  }
}

// Visualization code generation with Claude
async function generateVisualizationWithClaude(query: string, gptAnalysis: string): Promise<string> {
  try {
    console.log(`[CLAUDE] Starting visualization generation`);
    
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `Please generate Python code to visualize data based on the following question and GPT-4o OCR analysis results.

Question: "${query}"

GPT-4o OCR Analysis Results:
${gptAnalysis}

Requirements:
1. Use matplotlib and seaborn for visualization
2. Visualize key data points or trends mentioned in the analysis results
3. DO NOT use Korean fonts - use English for all text (Korean fonts not available)
4. Graph titles and labels should be in English
5. Use professional and visually appealing colors
6. Provide complete executable code

Notes:
- Generate reasonable sample data based on analysis results since actual data is not available
- Code must be immediately executable
- Include base64 encoding and print() output at the end
- Required libraries: matplotlib, seaborn, pandas, numpy, base64, io
- Convert graph to base64 string and output with print()
- Example output format: print(base64_string)
- IMPORTANT: Do not use any Korean font settings, use default matplotlib fonts

Code structure:
1. Import libraries
2. NO font settings (use default)
3. Generate sample data
4. Create visualization with English labels
5. Base64 encoding and output

Please provide only Python code (without python code blocks, just pure code).`
        }
      ]
    });

    const visualizationCode = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log(`[CLAUDE] Visualization code generation completed`);
    
    return visualizationCode;
  } catch (error) {
    console.error('[CLAUDE] Visualization generation error:', error);
    throw new Error('시각화 코드 생성 중 오류가 발생했습니다.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: FastTalkOCRRequest = await request.json();
    const { query, limit = 10, step = 'search', imageUrls, gptAnalysis } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required.' },
        { status: 400 }
      );
    }

    console.log(`[FAST-TALK-OCR] Query: "${query}", limit: ${limit}, step: ${step}`);

    if (step === 'search') {
      // Step 1: Segment search and return documents with images
      const segments = await searchSegments(query.trim(), limit);
      console.log(`[FAST-TALK-OCR] Found segments: ${segments.length}`);

      if (segments.length === 0) {
        return NextResponse.json({
          step: 'search',
          images: [],
          message: '관련 세그먼트를 찾을 수 없습니다.'
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

      // Convert segments to pages format and get images
      const pagePromises = segments.map(async (segment) => {
        const pageInfo = await getPageInfoForOCR(segment.page_id);
        return pageInfo ? {
          file_id: segment.file_id,
          page: pageInfo.page,
          title: segment.title,
          similarity_score: segment.similarity_score,
          raw_text: pageInfo.raw_text
        } : null;
      });

      const pagesWithInfo = await Promise.all(pagePromises);
      const validPages = pagesWithInfo.filter(page => page !== null);

      const imagePromises = validPages.map(async (page): Promise<ImageResult | null> => {
        try {
          const imageUrl = await getImageUrl(page.file_id, page.page);
          const fileMetadata = fileMetadataMap.get(page.file_id);
          
          if (imageUrl) {
            return {
              file_id: page.file_id,
              page: page.page,
              url: imageUrl,
              title: page.title,
              filename: fileMetadata?.name || fileMetadata?.filename
            };
          }
          return null;
        } catch (error) {
          console.error(`[ERROR] Image URL fetch failed (file: ${page.file_id}, page: ${page.page}):`, error);
          return null;
        }
      });

      const imageResults = await Promise.all(imagePromises);
      const validImages = imageResults.filter((img): img is ImageResult => img !== null);

      console.log(`[FAST-TALK-OCR] Valid images: ${validImages.length}`);

      return NextResponse.json({
        step: 'search',
        images: validImages,
        pages: validPages, // pages 데이터 (raw_text 포함)
        total: validImages.length,
        message: `${validImages.length}개의 관련 세그먼트를 찾았습니다`
      });

    } else if (step === 'analyze') {
      // Step 2: Analyze raw texts with GPT-4o
      const { pages } = body as any;
      
      if (!pages || !Array.isArray(pages)) {
        return NextResponse.json(
          { error: 'Pages data is required for analysis.' },
          { status: 400 }
        );
      }

      console.log(`[FAST-TALK-OCR] Analyzing raw texts for ${pages.length} pages`);
      
      // Extract raw texts from pages data (already retrieved in search step)
      const rawTexts = pages.map((page: any) => page.raw_text || '').filter((text: string) => text.trim().length > 0);
      console.log(`[FAST-TALK-OCR] Found ${rawTexts.length} valid raw texts`);
      
      // raw_text가 없으면 이미지 기반 분석으로 fallback
      let gptAnalysis;
      if (rawTexts.length === 0) {
        console.log(`[FAST-TALK-OCR] No raw text available, using image analysis as fallback`);
        // Get image URLs from the search response
        const { images } = body as any;
        const imageUrls = images ? images.map((img: any) => img.url).filter((url: string) => url.trim().length > 0) : [];
        gptAnalysis = await analyzeImagesAsTextFallback(query, imageUrls);
      } else {
        gptAnalysis = await analyzeRawTextsWithGPT4o(query, rawTexts);
      }

      return NextResponse.json({
        step: 'analyze',
        gptAnalysis,
        message: 'OCR 텍스트 분석이 완료되었습니다'
      });

    } else if (step === 'visualize') {
      // Step 3: Generate visualization
      if (!gptAnalysis) {
        return NextResponse.json(
          { error: 'GPT analysis is required for visualization.' },
          { status: 400 }
        );
      }

      const visualizationCode = await generateVisualizationWithClaude(query, gptAnalysis);

      return NextResponse.json({
        step: 'visualize',
        visualizationCode,
        message: '시각화 코드가 생성되었습니다'
      });
    }

    return NextResponse.json(
      { error: 'Invalid step parameter.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[FAST-TALK-OCR] API error:', error);
    return NextResponse.json(
      { 
        error: 'Fast Talk OCR 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
