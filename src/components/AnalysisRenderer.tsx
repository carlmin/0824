'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, Target, Lightbulb, AlertCircle, BarChart3, Users } from 'lucide-react';

interface AnalysisRendererProps {
  content: string;
  type: 'fast-talk' | 'deep-research';
}

const AnalysisRenderer: React.FC<AnalysisRendererProps> = ({ content, type }) => {
  // 마크다운 헤더와 내용을 파싱하는 함수
  const parseMarkdown = (text: string) => {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = { title: '', content: '', icon: null as any };
    
    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentSection.title) {
          sections.push(currentSection);
        }
        const title = line.replace('## ', '').trim();
        currentSection = {
          title,
          content: '',
          icon: getIconForSection(title)
        };
      } else if (line.trim()) {
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection.title) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  // 섹션 제목에 따라 아이콘 반환
  const getIconForSection = (title: string) => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('핵심') || lowerTitle.includes('답변') || lowerTitle.includes('발견')) {
      return <Target className="w-5 h-5 text-blue-600" />;
    }
    if (lowerTitle.includes('트렌드') || lowerTitle.includes('분석')) {
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    }
    if (lowerTitle.includes('마케팅') || lowerTitle.includes('인사이트')) {
      return <Lightbulb className="w-5 h-5 text-yellow-600" />;
    }
    if (lowerTitle.includes('실무') || lowerTitle.includes('적용') || lowerTitle.includes('포인트')) {
      return <Users className="w-5 h-5 text-purple-600" />;
    }
    if (lowerTitle.includes('전망') || lowerTitle.includes('시장')) {
      return <BarChart3 className="w-5 h-5 text-indigo-600" />;
    }
    if (lowerTitle.includes('고려') || lowerTitle.includes('추가')) {
      return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
    
    return <Target className="w-5 h-5 text-gray-600" />;
  };

  // 내용에서 리스트 아이템 파싱
  const parseContent = (content: string) => {
    const lines = content.trim().split('\n');
    const items = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        items.push({
          type: 'bullet',
          text: trimmed.substring(2).trim()
        });
      } else if (trimmed.match(/^\d+\./)) {
        items.push({
          type: 'number',
          text: trimmed.replace(/^\d+\.\s*/, '').trim()
        });
      } else if (trimmed) {
        items.push({
          type: 'text',
          text: trimmed
        });
      }
    }
    
    return items;
  };

  // 텍스트에서 강조 표시 (볼드, 해시태그 등) 처리
  const renderFormattedText = (text: string) => {
    // 해시태그 강조
    text = text.replace(/#(\w+)/g, '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mx-1">#$1</span>');
    
    // 볼드 텍스트 강조
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    
    // 브랜드명이나 제품명 강조 (대문자로 시작하는 단어들)
    text = text.replace(/\b([A-Z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)*)\b/g, '<span class="font-medium text-indigo-700">$1</span>');
    
    // 숫자와 퍼센트 강조
    text = text.replace(/(\d+(?:\.\d+)?%?)/g, '<span class="font-bold text-green-600">$1</span>');
    
    return text;
  };

  const sections = parseMarkdown(content);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center space-x-3 mb-6">
        {type === 'fast-talk' ? (
          <>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">⚡ Fast Talk 빠른 텍스트 분석 결과</h2>
              <p className="text-sm text-gray-600">핵심 답변</p>
            </div>
          </>
        ) : (
          <>
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">🔍 AI 분석 결과</h2>
              <p className="text-sm text-gray-600">심층 분석 리포트</p>
            </div>
          </>
        )}
      </div>

      {/* 섹션들 */}
      <div className="grid gap-4">
        {sections.map((section, index) => (
          <Card key={index} className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                {section.icon}
                <span>{section.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {parseContent(section.content).map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-start space-x-3">
                    {item.type === 'bullet' && (
                      <>
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p 
                          className="text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderFormattedText(item.text) }}
                        />
                      </>
                    )}
                    {item.type === 'number' && (
                      <>
                        <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700 border-blue-200">
                          {itemIndex + 1}
                        </Badge>
                        <p 
                          className="text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderFormattedText(item.text) }}
                        />
                      </>
                    )}
                    {item.type === 'text' && (
                      <p 
                        className="text-gray-700 leading-relaxed w-full"
                        dangerouslySetInnerHTML={{ __html: renderFormattedText(item.text) }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AnalysisRenderer;
