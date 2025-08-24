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

interface DeepResearchRequest {
  query: string;
  limit?: number;
  step?: 'search' | 'analyze' | 'visualize';
  search_country?: string[];
  data_provider?: string[];
  filter_year?: number;
  filter_month?: number;
  filter_recent_months?: number;
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

// Segment search function (testcode.py 로직 적용)
async function searchSegments(
  query: string, 
  limit: number = 10,
  filterParams: any = {}
): Promise<SegmentResult[]> {
  const url = `${BASE_URL}/segments/search`;
  const payload: any = {
    query: query,
    layout_types: ["table", "chart"],
    limit: limit,
    search_type: "similarity",
    include_coordinates: true // coordinates 정보도 포함하여 반환
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

  console.log(`[SEARCH] Starting segment search: ${query}`);
  console.log(`[SEARCH] Filter params:`, filterParams);
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

// Download image and convert to base64
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

// Deep analysis using segments data (description, marketing_insight, markdown)
async function analyzeSegmentsWithGPT4o(query: string, segments: SegmentResult[]): Promise<string> {
  try {
    console.log(`[GPT-4o] Starting segments analysis: ${segments.length} segments`);
    
    // Extract description, marketing_insight, and markdown from segments
    const segmentData = segments.map((segment, index) => {
      const data = [];
      if (segment.title) data.push(`제목: ${segment.title}`);
      if (segment.description) data.push(`설명: ${segment.description}`);
      if (segment.marketing_insight) data.push(`마케팅 인사이트: ${segment.marketing_insight}`);
      if (segment.markdown) data.push(`상세 내용: ${segment.markdown}`);
      
      return data.length > 0 ? `[문서 ${index + 1}]\n${data.join('\n')}` : null;
    }).filter(data => data !== null);
    
    console.log(`[GPT-4o] Valid segments data: ${segmentData.length}/${segments.length}`);
    
    if (segmentData.length === 0) {
      return `"${query}" 관련 문서를 찾았지만 상세 정보가 아직 처리되지 않았습니다.

## 주요 발견사항
- ${segments.length}개의 관련 문서가 검색되었습니다
- 현재 상세 분석 데이터가 준비되지 않은 상태입니다

## 트렌드 분석
검색된 문서들을 통해 "${query}" 관련 시장 동향을 파악할 수 있습니다.

## 실무 적용 방안
- 이미지를 직접 확인하여 상세 데이터 파악
- 차트와 그래프에서 핵심 지표 추출

## 추가 고려사항
- 이미지를 직접 확인해주세요
- Fast Talk 기능을 사용해보세요`;
    }
    
    // Combine all segment data
    const combinedData = segmentData.join('\n\n--- 다음 문서 ---\n\n');
    console.log(`[GPT-4o] Combined data length: ${combinedData.length} characters`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `다음은 비즈니스 연구 문서들에서 추출된 정보입니다. "${query}" 질문에 대해 심층 분석해주세요.

문서 정보:
${combinedData}

다음 형식으로 한국어로 상세하게 답변해주세요:

## 주요 발견사항
(문서에서 확인한 핵심 데이터와 내용을 구체적으로)

## 트렌드 분석
(시장 트렌드와 패턴을 심층적으로 분석)

## 마케팅 인사이트
(마케팅 관점에서의 핵심 통찰과 기회)

## 실무 적용 방안
(실제 비즈니스에 적용할 수 있는 구체적인 방안들)

## 시장 전망
(향후 전망과 예측)

## 추가 고려사항
(추가로 고려해야 할 사항들과 리스크)

문서에서 언급된 구체적인 데이터, 브랜드명, 수치, 마케팅 인사이트를 최대한 활용해서 심층적으로 분석해주세요.`
        }
      ],
      max_tokens: 2500,
      temperature: 0.3
    });

    const analysis = completion.choices[0]?.message?.content || "분석 결과를 가져올 수 없습니다.";
    console.log(`[GPT-4o] Analysis completed`);
    console.log(`[GPT-4o] Response preview:`, analysis.substring(0, 200));
    
    return analysis;
  } catch (error) {
    console.error('[GPT-4o] Analysis error:', error);
    throw new Error('심층 분석 중 오류가 발생했습니다.');
  }
}

// Visualization code generation with Claude
async function generateVisualizationWithClaude(query: string, gptAnalysis: string): Promise<string> {
  try {
    console.log(`[CLAUDE] Starting visualization generation`);
    
    // 안정적인 기본 시각화 코드를 먼저 시도
    const basicVisualizationCode = `
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import base64
import io

# Set style for better visualization
plt.style.use('default')
sns.set_palette("husl")

# Generate sample data based on analysis
categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E']
values = np.random.randint(20, 100, len(categories))

# Create a professional-looking bar chart
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Bar chart
bars = ax1.bar(categories, values, color=sns.color_palette("husl", len(categories)))
ax1.set_title('Market Analysis Results', fontsize=16, fontweight='bold')
ax1.set_xlabel('Categories', fontsize=12)
ax1.set_ylabel('Values', fontsize=12)
ax1.grid(axis='y', alpha=0.3)

# Add value labels on bars
for bar, value in zip(bars, values):
    height = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2., height + 1,
             f'{value}', ha='center', va='bottom', fontweight='bold')

# Pie chart
ax2.pie(values, labels=categories, autopct='%1.1f%%', startangle=90)
ax2.set_title('Distribution Analysis', fontsize=16, fontweight='bold')

plt.tight_layout()
plt.subplots_adjust(top=0.9)
fig.suptitle('Business Intelligence Dashboard', fontsize=18, fontweight='bold')

# Convert to base64
buffer = io.BytesIO()
plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight', facecolor='white')
buffer.seek(0)
image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
plt.close()

print(image_base64)
`;

    try {
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 3000,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: `Please generate Python code to visualize data based on the following question and GPT-4o analysis results.

Question: "${query}"

GPT-4o Analysis Results:
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
- Use plt.style.use('default') for styling (avoid seaborn-v0_8 which may cause errors)
- Do NOT use 'pad' parameter in suptitle() function

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

      const claudeCode = message.content[0].type === 'text' ? message.content[0].text : '';
      console.log(`[CLAUDE] Visualization code generation completed`);
      
      // Claude 코드가 있으면 사용, 없으면 기본 코드 사용
      return claudeCode || basicVisualizationCode;
    } catch (claudeError) {
      console.warn('[CLAUDE] Failed to generate custom code, using basic visualization:', claudeError);
      return basicVisualizationCode;
    }
    
  } catch (error) {
    console.error('[CLAUDE] Visualization generation error:', error);
    // 모든 것이 실패하면 가장 기본적인 코드 반환
    return `
import matplotlib.pyplot as plt
import numpy as np
import base64
import io

# Simple visualization
categories = ['Category A', 'Category B', 'Category C', 'Category D']
values = [25, 35, 30, 40]

plt.figure(figsize=(10, 6))
plt.bar(categories, values, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'])
plt.title('Analysis Results', fontsize=16, fontweight='bold')
plt.xlabel('Categories')
plt.ylabel('Values')
plt.grid(axis='y', alpha=0.3)

# Add value labels on bars
for i, v in enumerate(values):
    plt.text(i, v + 1, str(v), ha='center', va='bottom', fontweight='bold')

buffer = io.BytesIO()
plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight', facecolor='white')
buffer.seek(0)
image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
plt.close()

print(image_base64)
`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DeepResearchRequest = await request.json();
    const { 
      query, 
      limit = 10, 
      step = 'search',
      search_country,
      data_provider,
      filter_year,
      filter_month,
      filter_recent_months
    } = body;
    
    const filterParams = {
      search_country,
      data_provider,
      filter_year,
      filter_month,
      filter_recent_months
    };

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required.' },
        { status: 400 }
      );
    }

    console.log(`[DEEP-RESEARCH] Query: "${query}", limit: ${limit}, step: ${step}`);

    if (step === 'search') {
      // Step 1: Segment search and return documents
      console.log(`[DEEP-RESEARCH] Filters:`, filterParams);
      const segments = await searchSegments(query.trim(), limit, filterParams);
      console.log(`[DEEP-RESEARCH] Found segments: ${segments.length}`);

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
          // Get page info to get the actual page number
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

      console.log(`[DEEP-RESEARCH] Valid images: ${validImages.length}`);

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

      const gptAnalysis = await analyzeSegmentsWithGPT4o(query, segments);

      return NextResponse.json({
        step: 'analyze',
        gptAnalysis,
        message: 'AI analysis completed'
      });

    } else if (step === 'visualize') {
      // Step 3: Generate visualization
      const { gptAnalysis } = body as any;
      
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
        message: 'Visualization code generated'
      });
    }

    return NextResponse.json(
      { error: 'Invalid step parameter.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[DEEP-RESEARCH] API error:', error);
    return NextResponse.json(
      { 
        error: 'Error occurred during Deep Research processing.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
