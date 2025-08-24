import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { params: string[] } }
) {
  const [width = '400', height = '300'] = params.params;

  // SVG placeholder 이미지 생성
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">
        이미지를 불러올 수 없습니다
      </text>
      <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">
        ${width} × ${height}
      </text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400', // 1일 캐시
    },
  });
}
