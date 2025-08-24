#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}⚡ AFTT0822 빠른 시작 스크립트${NC}"
echo "=================================="

# 현재 디렉토리 확인
CURRENT_DIR=$(basename "$PWD")
if [ "$CURRENT_DIR" != "aftt0822" ]; then
    echo -e "${RED}❌ 오류: aftt0822 폴더에서 실행해주세요${NC}"
    echo "현재 위치: $PWD"
    exit 1
fi

# 환경 빠른 체크
echo -e "${YELLOW}🔍 빠른 환경 체크...${NC}"

# 중요 파일들 체크
NEED_SETUP=false

if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/next" ]; then
    echo -e "${YELLOW}⚠️  node_modules 문제 감지${NC}"
    NEED_SETUP=true
fi

if [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}⚠️  package-lock.json 누락${NC}"
    NEED_SETUP=true
fi

# 문제가 있으면 자동 설정 실행
if [ "$NEED_SETUP" = true ]; then
    echo -e "${BLUE}🔧 환경 문제가 감지되어 자동 설정을 실행합니다...${NC}"
    ./dev-setup.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 환경 설정 실패${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ 환경 상태 양호${NC}"
fi

# 개발 서버 실행
echo ""
echo -e "${GREEN}🚀 개발 서버를 시작합니다...${NC}"
echo -e "${CYAN}URL: http://localhost:3000${NC}"
echo -e "${YELLOW}중지하려면 Ctrl+C를 누르세요${NC}"
echo ""

# 개발 서버 실행 (포트가 사용 중이면 자동으로 다른 포트 사용)
npm run dev



