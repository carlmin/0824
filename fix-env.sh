#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🛠️  AFTT0822 환경 복구 스크립트${NC}"
echo "======================================="
echo -e "${YELLOW}환경이 꼬였을 때 사용하는 강력한 복구 도구입니다${NC}"
echo ""

# 현재 디렉토리 확인
CURRENT_DIR=$(basename "$PWD")
if [ "$CURRENT_DIR" != "aftt0822" ]; then
    echo -e "${RED}❌ 오류: aftt0822 폴더에서 실행해주세요${NC}"
    echo "현재 위치: $PWD"
    exit 1
fi

# 확인 메시지
echo -e "${YELLOW}⚠️  이 스크립트는 다음 작업을 수행합니다:${NC}"
echo "1. node_modules 완전 삭제"
echo "2. package-lock.json 삭제" 
echo "3. npm 캐시 완전 정리"
echo "4. 의존성 완전 재설치"
echo "5. 보안 취약점 자동 수정"
echo ""

read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}작업이 취소되었습니다${NC}"
    exit 0
fi

echo -e "${BLUE}🧹 환경 완전 정리 시작...${NC}"

# Step 1: 기존 파일들 완전 삭제
echo -e "${YELLOW}1/5: 기존 파일들 삭제 중...${NC}"
rm -rf node_modules
rm -rf package-lock.json
rm -rf .next
rm -rf .turbo
echo -e "${GREEN}✅ 기존 파일들 삭제 완료${NC}"

# Step 2: npm 캐시 완전 정리
echo -e "${YELLOW}2/5: npm 캐시 완전 정리 중...${NC}"
npm cache clean --force
npm cache verify
echo -e "${GREEN}✅ npm 캐시 정리 완료${NC}"

# Step 3: npm 설정 확인 및 복구
echo -e "${YELLOW}3/5: npm 설정 확인 중...${NC}"
npm config list
# registry가 이상하면 기본값으로 복구
npm config set registry https://registry.npmjs.org/
echo -e "${GREEN}✅ npm 설정 확인 완료${NC}"

# Step 4: 의존성 완전 재설치
echo -e "${YELLOW}4/5: 의존성 완전 재설치 중...${NC}"
npm install --no-cache --prefer-offline=false
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 의존성 재설치 완료${NC}"
else
    echo -e "${RED}❌ 의존성 설치 실패${NC}"
    echo -e "${YELLOW}다음을 시도해보세요:${NC}"
    echo "- Node.js 버전 확인: node -v"
    echo "- npm 버전 확인: npm -v"
    echo "- 인터넷 연결 확인"
    exit 1
fi

# Step 5: 보안 취약점 수정
echo -e "${YELLOW}5/5: 보안 취약점 확인 및 수정...${NC}"
npm audit fix --force
echo -e "${GREEN}✅ 보안 취약점 수정 완료${NC}"

# 최종 상태 확인
echo ""
echo -e "${PURPLE}🎯 최종 상태 확인${NC}"
echo "================================"

# Next.js 바이너리 확인
if [ -f "node_modules/.bin/next" ]; then
    echo -e "${GREEN}✅ Next.js 바이너리 정상${NC}"
else
    echo -e "${RED}❌ Next.js 바이너리 문제${NC}"
fi

# 주요 의존성 확인
NEXT_VERSION=$(npm list next --depth=0 2>/dev/null | grep next | head -1)
if [ ! -z "$NEXT_VERSION" ]; then
    echo -e "${GREEN}✅ $NEXT_VERSION${NC}"
else
    echo -e "${RED}❌ Next.js 버전 확인 실패${NC}"
fi

# TypeScript 확인
TS_VERSION=$(npm list typescript --depth=0 2>/dev/null | grep typescript | head -1)
if [ ! -z "$TS_VERSION" ]; then
    echo -e "${GREEN}✅ $TS_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  TypeScript 미설치 (선택사항)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 환경 복구가 완료되었습니다!${NC}"
echo "==============================="
echo -e "${BLUE}다음 명령어로 개발 서버를 시작하세요:${NC}"
echo -e "${GREEN}./quick-start.sh${NC}"
echo ""
echo -e "${YELLOW}앞으로는 다음 명령어를 사용하세요:${NC}"
echo -e "${CYAN}• 빠른 시작: ./quick-start.sh${NC}"
echo -e "${CYAN}• 환경 체크: ./dev-setup.sh${NC}"
echo -e "${CYAN}• 문제 발생 시: ./fix-env.sh${NC}"



