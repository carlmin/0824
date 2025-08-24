import {
  Globe,
  Building2,
  Calendar,
  Hash,
  Search,
  Users,
  TrendingUp,
  BarChart3,
  FileText,
  Newspaper,
  BookOpen,
  Target,
  Briefcase,
  Database,
  Zap,
  Flag,
  MapPin,
} from "lucide-react";

// 국가별 국기 이모지 매핑
export const getCountryFlag = (countryCode: string) => {
  switch (countryCode) {
    case 'KR': return '🇰🇷'; // 대한민국
    case 'US': return '🇺🇸'; // 미국
    case 'JP': return '🇯🇵'; // 일본
    case 'CN': return '🇨🇳'; // 중국
    case 'FR': return '🇫🇷'; // 프랑스
    case 'TH': return '🇹🇭'; // 태국
    case 'ID': return '🇮🇩'; // 인도네시아
    case 'VN': return '🇻🇳'; // 베트남
    case 'SG': return '🇸🇬'; // 싱가포르
    case 'IT': return '🇮🇹'; // 이탈리아
    case 'MY': return '🇲🇾'; // 말레이시아
    case 'GB': return '🇬🇧'; // 영국
    case 'DE': return '🇩🇪'; // 독일
    case 'IN': return '🇮🇳'; // 인도
    case 'BR': return '🇧🇷'; // 브라질
    case 'MX': return '🇲🇽'; // 멕시코
    case 'ES': return '🇪🇸'; // 스페인
    case 'CA': return '🇨🇦'; // 캐나다
    case 'AU': return '🇦🇺'; // 호주
    case 'TR': return '🇹🇷'; // 터키
    default: return '🌍';
  }
};

// 기존 아이콘 함수는 유지 (백업용)
export const getCountryIcon = (countryCode: string) => {
  return Globe; // 모든 국가에 같은 아이콘
};

// 소스 아이콘 제거 - 아이콘 없이 텍스트만
export const getSourceIcon = (source: string) => {
  return null; // 아이콘 없음
};

// 필터 카테고리별 아이콘
export const filterCategoryIcons = {
  country: Globe,
  source: () => <span className="text-base">📄</span>, // 문서 이모지
  period: Calendar,
  amount: Hash,
};
