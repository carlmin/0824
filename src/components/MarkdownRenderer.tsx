'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // 인라인 요소 렌더링 - 미니멀한 스타일로 변경
  const renderInlineElements = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining) {
      // **볼드** 텍스트 찾기
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        // 앞의 텍스트 추가
        if (boldMatch.index > 0) {
          const beforeText = remaining.substring(0, boldMatch.index);
          elements.push(...renderSimpleInlines(beforeText, key));
          key += beforeText.length;
        }
        
        // 볼드 요소 추가 - 단순한 굵기만
        elements.push(
          <strong key={key++} className="font-semibold text-gray-900">
            {boldMatch[1]}
          </strong>
        );
        
        remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
        continue;
      }

      // 나머지 텍스트를 간단한 인라인으로 처리
      elements.push(...renderSimpleInlines(remaining, key));
      break;
    }

    return elements;
  };

  // 간단한 인라인 요소들 - 강조 없이 일반 텍스트로 처리
  const renderSimpleInlines = (text: string, startKey: number): React.ReactNode[] => {
    // 굳이 강조하지 않고 그냥 텍스트 그대로 반환
    return [text];
  };

  // 메인 마크다운 렌더링 - 미니멀 디자인
  const renderMarkdown = (): React.ReactNode[] => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let listType: 'bullet' | 'number' | null = null;
    let listId = 0;

    const flushList = () => {
      if (currentList.length > 0) {
        const listKey = `list-${listId++}`;
        if (listType === 'bullet') {
          elements.push(
            <ul key={listKey} className="space-y-2 mb-4">
              {currentList}
            </ul>
          );
        } else if (listType === 'number') {
          elements.push(
            <ol key={listKey} className="space-y-2 mb-4">
              {currentList}
            </ol>
          );
        }
        currentList = [];
        listType = null;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // 빈 줄
      if (trimmedLine === '') {
        flushList();
        elements.push(<div key={`empty-${index}`} className="mb-3"></div>);
        return;
      }

      // ## 헤더 - 큰 제목
      if (trimmedLine.startsWith('## ')) {
        flushList();
        const headerText = trimmedLine.substring(3);
        elements.push(
          <h2 key={`h2-${index}`} className="text-lg font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-100">
            {renderInlineElements(headerText)}
          </h2>
        );
        return;
      }

      // ### 헤더 - 중간 제목
      if (trimmedLine.startsWith('### ')) {
        flushList();
        const headerText = trimmedLine.substring(4);
        elements.push(
          <h3 key={`h3-${index}`} className="text-base font-medium text-gray-900 mb-2">
            {renderInlineElements(headerText)}
          </h3>
        );
        return;
      }

      // - 불릿 포인트 - 단순한 스타일
      if (trimmedLine.startsWith('- ')) {
        if (listType !== 'bullet') {
          flushList();
          listType = 'bullet';
        }
        const listText = trimmedLine.substring(2);
        currentList.push(
          <li key={`bullet-${index}`} className="flex items-start space-x-2">
            <span className="text-gray-400 mt-1">•</span>
            <span className="text-sm text-gray-700 leading-relaxed">{renderInlineElements(listText)}</span>
          </li>
        );
        return;
      }

      // 숫자 리스트 - 단순한 번호
      const numberMatch = trimmedLine.match(/^(\d+)\. (.+)$/);
      if (numberMatch) {
        if (listType !== 'number') {
          flushList();
          listType = 'number';
        }
        const [, number, listText] = numberMatch;
        currentList.push(
          <li key={`number-${index}`} className="flex items-start space-x-2">
            <span className="text-gray-700 font-medium text-sm min-w-[1.25rem]">
              {number}.
            </span>
            <span className="text-sm text-gray-700 leading-relaxed">{renderInlineElements(listText)}</span>
          </li>
        );
        return;
      }

      // 일반 텍스트
      flushList();
      elements.push(
        <p key={`p-${index}`} className="text-sm text-gray-700 leading-relaxed mb-3">
          {renderInlineElements(trimmedLine)}
        </p>
      );
    });

    flushList(); // 마지막에 남은 리스트 처리
    return elements;
  };

  return (
    <div className="max-w-none">
      {renderMarkdown()}
    </div>
  );
};

export default MarkdownRenderer;
