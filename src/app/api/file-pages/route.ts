import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정
const supabaseUrl = 'https://supabase.artlab.ai';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTE1NTQ4MDAsImV4cCI6MTkwOTMyMTIwMH0._L0uj4ZUpCXTDIwXrvS10URE69V4DMBtWjGDFFe829Y';

const supabase = createClient(supabaseUrl, supabaseKey);

// Market Trends API 기본 URL
const BASE_URL = "http://ec2-3-37-235-10.ap-northeast-2.compute.amazonaws.com:8888/api/v1/market-trends";

interface PageInfo {
  page: number;
  file_id: string;
  image_storage_path: string;
}

interface ImageResult {
  file_id: string;
  page: number;
  url: string;
  title?: string;
  filename?: string;
}

// Supabase에서 file_id에 해당하는 모든 페이지 정보 조회
async function getAllPagesForFile(fileId: string): Promise<PageInfo[]> {
  console.log(`[FILE-PAGES] Fetching all pages for file_id: ${fileId}`);
  
  try {
    const { data, error } = await supabase
      .from('market_trend_pages')
      .select('page, file_id, image_storage_path')
      .eq('file_id', fileId)
      .order('page', { ascending: true });

    if (error) {
      console.error('[FILE-PAGES] Supabase query error:', error);
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.warn(`[FILE-PAGES] No pages found for file_id: ${fileId}`);
      return [];
    }

    console.log(`[FILE-PAGES] Found ${data.length} pages for file_id: ${fileId}`);
    return data;
  } catch (error) {
    console.error('[FILE-PAGES] Error fetching pages from Supabase:', error);
    throw error;
  }
}

// Market Trends API로 이미지 URL 가져오기
async function getImageUrl(fileId: string, page: number): Promise<string> {
  const url = `${BASE_URL}/file/${fileId}/images/pages/${page}`;
  const params = new URLSearchParams({ expires_in: '3600' });

  console.log(`[IMAGE] Requesting image URL: ${url}?${params}`);
  
  try {
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error(`[IMAGE] Image URL fetch failed: ${response.status} ${response.statusText}`);
      throw new Error(`Image URL fetch failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[IMAGE] Image API response for page ${page}:`, result);
    
    return result.url || '';
  } catch (error) {
    console.error(`[IMAGE] Error fetching image URL for file ${fileId}, page ${page}:`, error);
    return '';
  }
}

// 파일 메타데이터 가져오기 (선택적)
async function getFileMetadata(fileId: string): Promise<{ filename?: string; name?: string } | null> {
  try {
    const url = `${BASE_URL}/file/${fileId}`;
    const response = await fetch(url, { method: 'GET' });
    
    if (!response.ok) {
      console.warn(`[METADATA] File metadata fetch failed: ${response.status}`);
      return null;
    }
    
    const result = await response.json();
    return {
      filename: result.filename || result.name,
      name: result.name
    };
  } catch (error) {
    console.warn('[METADATA] Error fetching file metadata:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('file_id');

    if (!fileId) {
      return NextResponse.json(
        { error: 'file_id parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Getting all pages for file: ${fileId}`);

    // 1. Supabase에서 해당 파일의 모든 페이지 정보 조회
    const pages = await getAllPagesForFile(fileId);
    
    if (pages.length === 0) {
      return NextResponse.json({
        file_id: fileId,
        pages: [],
        total: 0,
        message: 'No pages found for this file'
      });
    }

    // 2. 각 페이지에 대해 이미지 URL 가져오기
    const imagePromises = pages.map(async (pageInfo): Promise<ImageResult | null> => {
      try {
        const imageUrl = await getImageUrl(pageInfo.file_id, pageInfo.page);
        
        if (!imageUrl) {
          console.warn(`[API] No image URL for page ${pageInfo.page}`);
          return null;
        }

        return {
          file_id: pageInfo.file_id,
          page: pageInfo.page,
          url: imageUrl,
          title: `페이지 ${pageInfo.page}`,
        };
      } catch (error) {
        console.error(`[API] Failed to get image for page ${pageInfo.page}:`, error);
        return null;
      }
    });

    const imageResults = await Promise.all(imagePromises);
    const validImages = imageResults.filter((img): img is ImageResult => img !== null);

    // 3. 파일 메타데이터 가져오기 (선택적)
    let fileMetadata = null;
    try {
      fileMetadata = await getFileMetadata(fileId);
    } catch (error) {
      console.warn('[API] Failed to fetch file metadata:', error);
    }

    // 메타데이터가 있으면 각 이미지 결과에 파일명 추가
    if (fileMetadata?.filename) {
      validImages.forEach(img => {
        img.filename = fileMetadata!.filename;
      });
    }

    console.log(`[API] Successfully processed ${validImages.length}/${pages.length} pages for file ${fileId}`);

    return NextResponse.json({
      file_id: fileId,
      filename: fileMetadata?.filename,
      pages: validImages,
      total: validImages.length,
      message: `Found ${validImages.length} pages`
    });

  } catch (error) {
    console.error('[API] Error in file-pages API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
