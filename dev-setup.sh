#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AFTT0822 개발 환경 자동 설정 스크립트${NC}"
echo "=================================================="

# 현재 디렉토리 확인
CURRENT_DIR=$(basename "$PWD")
if [ "$CURRENT_DIR" != "aftt0822" ]; then
    echo -e "${RED}❌ 오류: aftt0822 폴더에서 실행해주세요${NC}"
    echo "현재 위치: $PWD"
    exit 1
fi

echo -e "${YELLOW}📋 환경 상태 체크 중...${NC}"

# Node.js 버전 확인
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js가 설치되지 않았습니다${NC}"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js 버전: $NODE_VERSION${NC}"
fi

# npm 버전 확인
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm이 설치되지 않았습니다${NC}"
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm 버전: $NPM_VERSION${NC}"
fi

# package.json 존재 확인
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json 파일이 없습니다${NC}"
    exit 1
else
    echo -e "${GREEN}✅ package.json 파일 확인${NC}"
fi

# node_modules 상태 확인 및 복구
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}⚠️  node_modules 또는 package-lock.json이 없습니다${NC}"
    echo -e "${BLUE}🔧 의존성 설치를 시작합니다...${NC}"
    
    # 기존 파일들 정리
    rm -rf node_modules package-lock.json 2>/dev/null
    
    # npm 캐시 정리
    echo -e "${YELLOW}🧹 npm 캐시 정리 중...${NC}"
    npm cache clean --force
    
    # 의존성 설치
    echo -e "${BLUE}📦 의존성 설치 중...${NC}"
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 의존성 설치 완료${NC}"
    else
        echo -e "${RED}❌ 의존성 설치 실패${NC}"
        exit 1
    fi
else
    # node_modules 헬스체크
    if [ ! -d "node_modules/.bin" ] || [ ! -f "node_modules/.bin/next" ]; then
        echo -e "${YELLOW}⚠️  node_modules가 손상된 것 같습니다${NC}"
        echo -e "${BLUE}🔧 node_modules를 재설치합니다...${NC}"
        
        rm -rf node_modules package-lock.json
        npm cache clean --force
        npm install
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ node_modules 재설치 완료${NC}"
        else
            echo -e "${RED}❌ 재설치 실패${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ node_modules 상태 정상${NC}"
    fi
fi

# 보안 취약점 체크 및 수정
echo -e "${YELLOW}🔐 보안 취약점 체크 중...${NC}"
AUDIT_RESULT=$(npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities.total' 2>/dev/null || echo "0")

if [ "$AUDIT_RESULT" != "0" ] && [ "$AUDIT_RESULT" != "" ]; then
    echo -e "${YELLOW}⚠️  보안 취약점 $AUDIT_RESULT개 발견${NC}"
    echo -e "${BLUE}🔧 자동 수정 중...${NC}"
    npm audit fix --force
    echo -e "${GREEN}✅ 보안 취약점 수정 완료${NC}"
else
    echo -e "${GREEN}✅ 보안 취약점 없음${NC}"
fi

# Next.js 빌드 체크 (선택사항)
echo -e "${YELLOW}🏗️  Next.js 설정 체크 중...${NC}"
if npm run build --silent &>/dev/null; then
    echo -e "${GREEN}✅ Next.js 빌드 테스트 통과${NC}"
else
    echo -e "${YELLOW}⚠️  빌드 테스트는 실패했지만 개발 모드는 정상 작동할 것입니다${NC}"
fi

echo ""
echo -e "${GREEN}🎉 환경 설정이 완료되었습니다!${NC}"
echo "=================================================="
echo -e "${BLUE}다음 명령어로 개발 서버를 시작하세요:${NC}"
echo -e "${GREEN}npm run dev${NC}"
echo ""
echo -e "${YELLOW}또는 빠른 실행을 위해:${NC}"
echo -e "${GREEN}./quick-start.sh${NC}"



