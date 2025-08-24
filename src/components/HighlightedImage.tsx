'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface Coordinate {
  x: number;
  y: number;
}

interface HighlightedImageProps {
  src: string;
  alt: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  width?: number;
  height?: number;
  fill?: boolean;
  forceAspectRatio?: number; // width/height 비율 (선택적)
}

const HighlightedImage: React.FC<HighlightedImageProps> = ({
  src,
  alt,
  className = '',
  onError,
  width,
  height,
  fill,
  forceAspectRatio
}) => {
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [imageUrl, setImageUrl] = useState<string>(src);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [imageScale, setImageScale] = useState<{ scaleX: number; scaleY: number; offsetX: number; offsetY: number }>({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // URL에서 coordinates 파라미터 추출
    try {
      const url = new URL(src);
      const coordinatesParam = url.searchParams.get('coordinates');
      const highlightParam = url.searchParams.get('highlight');
      
      if (coordinatesParam && highlightParam === 'true') {
        const decodedCoordinates = JSON.parse(decodeURIComponent(coordinatesParam));
        setCoordinates(decodedCoordinates);
        console.log('[HIGHLIGHTED-IMAGE] Coordinates loaded:', decodedCoordinates.length);
        
        // 하이라이트 파라미터들을 제거한 순수 이미지 URL
        url.searchParams.delete('coordinates');
        url.searchParams.delete('highlight');
        url.searchParams.delete('overlay');
        setImageUrl(url.toString());
      } else {
        setCoordinates([]);
        setImageUrl(src);
      }
    } catch (error) {
      console.warn('[HIGHLIGHTED-IMAGE] Failed to parse coordinates from URL:', error);
      setCoordinates([]);
      setImageUrl(src);
    }
  }, [src]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    setImageDimensions({
      width: naturalWidth,
      height: naturalHeight
    });

    // 컨테이너 크기 계산
    updateDisplayDimensions(naturalWidth, naturalHeight);
  };

  const updateDisplayDimensions = (naturalWidth: number, naturalHeight: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // object-contain 방식으로 실제 이미지가 표시되는 영역 계산
    const containerAspect = containerWidth / containerHeight;
    const imageAspect = naturalWidth / naturalHeight;

    let displayWidth, displayHeight, offsetX = 0, offsetY = 0;

    if (imageAspect > containerAspect) {
      // 이미지가 더 넓음 - 가로 기준으로 맞춤
      displayWidth = containerWidth;
      displayHeight = containerWidth / imageAspect;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // 이미지가 더 높음 - 세로 기준으로 맞춤
      displayHeight = containerHeight;
      displayWidth = containerHeight * imageAspect;
      offsetX = (containerWidth - displayWidth) / 2;
    }

    setDisplayDimensions({ width: displayWidth, height: displayHeight });
    setImageScale({
      scaleX: displayWidth / naturalWidth,
      scaleY: displayHeight / naturalHeight,
      offsetX,
      offsetY
    });

    console.log(`[HIGHLIGHT-SCALE] Natural: ${naturalWidth}x${naturalHeight}, Display: ${displayWidth.toFixed(1)}x${displayHeight.toFixed(1)}, Offset: ${offsetX.toFixed(1)},${offsetY.toFixed(1)}`);
  };

  // 컨테이너 크기 변경 감지
  useEffect(() => {
    if (imageDimensions.width > 0 && imageDimensions.height > 0) {
      updateDisplayDimensions(imageDimensions.width, imageDimensions.height);
    }
  }, [imageDimensions.width, imageDimensions.height]);

  // 윈도우 리사이즈 감지
  useEffect(() => {
    const handleResize = () => {
      if (imageDimensions.width > 0 && imageDimensions.height > 0) {
        updateDisplayDimensions(imageDimensions.width, imageDimensions.height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageDimensions.width, imageDimensions.height]);

  // coordinates를 실제 표시 영역에 맞게 변환 (0-1 정규화된 좌표를 픽셀 좌표로)
  const getActualCoordinates = (coord: Coordinate): { x: number; y: number } => {
    // 새로운 정확한 스케일링 사용
    const pixelX = coord.x * displayDimensions.width + imageScale.offsetX;
    const pixelY = coord.y * displayDimensions.height + imageScale.offsetY;

    console.log(`[HIGHLIGHT] Converting normalized coords (${coord.x.toFixed(3)}, ${coord.y.toFixed(3)}) to pixel coords (${pixelX.toFixed(1)}, ${pixelY.toFixed(1)})`);

    return {
      x: pixelX,
      y: pixelY
    };
  };

  // 단일 좌표 그룹에서 bounding box 계산 (4개 점으로 구성된 사각형)
  const getBoundingBoxFromGroup = (coords: Coordinate[]) => {
    if (coords.length !== 4) {
      console.warn(`[HIGHLIGHT] Expected 4 coordinates for bounding box, got ${coords.length}`);
      return null;
    }

    const actualCoords = coords.map(getActualCoordinates);
    
    const xs = actualCoords.map(c => c.x);
    const ys = actualCoords.map(c => c.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const boundingBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    console.log(`[HIGHLIGHT] Bounding box calculated:`, boundingBox);

    return boundingBox;
  };

  // 4개의 coordinates를 하나의 사각형으로 그룹화
  const groupCoordinatesIntoBoxes = (coords: Coordinate[]): Coordinate[][] => {
    const boxes: Coordinate[][] = [];
    
    console.log(`[HIGHLIGHT] Grouping ${coords.length} coordinates into boxes`);
    
    // 4개씩 그룹화 (사각형 하나당 4개 점)
    for (let i = 0; i < coords.length; i += 4) {
      const box = coords.slice(i, i + 4);
      if (box.length === 4) {
        boxes.push(box);
        console.log(`[HIGHLIGHT] Box ${boxes.length}:`, box);
      } else if (box.length > 0) {
        console.warn(`[HIGHLIGHT] Incomplete box with ${box.length} coordinates:`, box);
      }
    }
    
    return boxes;
  };

  const coordinateBoxes = groupCoordinatesIntoBoxes(coordinates);
  
  // 디버깅: 좌표 정보 출력
  if (coordinates.length > 0) {
    console.log(`[HIGHLIGHT] Total coordinates: ${coordinates.length}, Boxes: ${coordinateBoxes.length}`);
    console.log(`[HIGHLIGHT] First few coordinates:`, coordinates.slice(0, 8));
  }

  // 동적 비율 계산 (이미지 원본 비율 또는 forceAspectRatio 사용)
  const getAspectRatio = () => {
    if (forceAspectRatio) return forceAspectRatio;
    if (imageDimensions.width > 0 && imageDimensions.height > 0) {
      return imageDimensions.width / imageDimensions.height;
    }
    return 1; // 기본값
  };

  const aspectRatio = getAspectRatio();

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={
        !fill && aspectRatio
          ? {
              aspectRatio: aspectRatio.toString(),
              width: '100%',
              height: 'auto'
            }
          : undefined
      }
    >
      {fill ? (
        <Image
          ref={imageRef}
          src={imageUrl}
          alt={alt}
          fill
          className="object-contain"
          onLoad={handleImageLoad}
          onError={onError}
        />
      ) : (
        <Image
          ref={imageRef}
          src={imageUrl}
          alt={alt}
          width={width || 800}
          height={height || (width ? width / aspectRatio : 600)}
          className="object-contain w-full h-full"
          onLoad={handleImageLoad}
          onError={onError}
        />
      )}
      
      {/* 하이라이트 박스들 */}
      {coordinateBoxes.length > 0 && displayDimensions.width > 0 && displayDimensions.height > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {coordinateBoxes.map((box, index) => {
            const boundingBox = getBoundingBoxFromGroup(box);
            if (!boundingBox) return null;

            // 이미지 크기에 따른 동적 테두리 두께 계산
            const baseBorderWidth = 4; // 모달 크기 기준 (1000px)
            const baseImageWidth = 1000;
            const currentImageWidth = displayDimensions.width;
            const scaledBorderWidth = Math.max(1, Math.round(baseBorderWidth * (currentImageWidth / baseImageWidth)));
            const scaledRadius = Math.max(2, Math.round(4 * (currentImageWidth / baseImageWidth)));
            
            return (
              <div
                key={index}
                className="absolute bg-yellow-400 bg-opacity-30 animate-pulse"
                style={{
                  left: `${boundingBox.x}px`,
                  top: `${boundingBox.y}px`,
                  width: `${boundingBox.width}px`,
                  height: `${boundingBox.height}px`,
                  border: `${scaledBorderWidth}px solid #FBBF24`,
                  backgroundColor: 'rgba(251, 191, 36, 0.3)',
                  borderRadius: `${scaledRadius}px`,
                  boxShadow: `0 0 ${scaledBorderWidth * 2.5}px rgba(251, 191, 36, 0.5)`,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HighlightedImage;
