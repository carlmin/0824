import requests
import json
import time
from PIL import Image
from io import BytesIO
import matplotlib.pyplot as plt

# API 기본 URL
BASE_URL = "http://ec2-3-37-235-10.ap-northeast-2.compute.amazonaws.com:8888/api/v1/market-trends"

def search_segments(query, limit=5):
    """세그먼트 검색 API 호출"""
    url = f"{BASE_URL}/segments/search"
    payload = {
        "query": query,
        "layout_types": ["table", "chart"],
        "limit": limit,
        "search_type": "similarity",
        # "search_country": ["KR"]
    }
    
    print(f"🔍 세그먼트 검색 시작...")
    start_time = time.time()
    response = requests.post(url, json=payload)
    end_time = time.time()
    response.raise_for_status()
    
    print(f"⏱️ 세그먼트 검색 소요시간: {end_time - start_time:.2f}초")
    return response.json()

def search_pages(query, limit=5):
    """페이지 검색 API 호출"""
    url = f"{BASE_URL}/pages/search"
    payload = {
        "query": query,
        "limit": limit,
        "search_type": "similarity"
    }
    
    print(f"🔍 페이지 검색 시작...")
    start_time = time.time()
    response = requests.post(url, json=payload)
    end_time = time.time()
    response.raise_for_status()
    
    print(f"⏱️ 페이지 검색 소요시간: {end_time - start_time:.2f}초")
    return response.json()

def get_page_info(page_id):
    """페이지 ID로 페이지 정보 조회"""
    url = f"{BASE_URL}/page/{page_id}"
    
    print(f"페이지 정보 요청: {url}")
    response = requests.get(url)
    response.raise_for_status()
    
    result = response.json()
    print(f"페이지 정보 응답: {json.dumps(result, indent=2)}")
    return result

def get_image_url(file_id, page):
    """이미지 URL 가져오기"""
    url = f"{BASE_URL}/file/{file_id}/images/pages/{page}"
    params = {"expires_in": 3600}
    
    print(f"이미지 URL 요청: {url}")
    response = requests.get(url, params=params)
    response.raise_for_status()
    
    result = response.json()
    print(f"이미지 API 응답: {json.dumps(result, indent=2)}")
    return result

def display_image_from_url(image_url, title=""):
    """URL에서 이미지 다운로드하고 표시"""
    if not image_url:
        print("❌ 이미지 URL이 없습니다!")
        return None
    
    print(f"이미지 다운로드 중: {image_url}")
    response = requests.get(image_url)
    response.raise_for_status()
    
    image = Image.open(BytesIO(response.content))
    
    plt.figure(figsize=(10, 8))
    plt.imshow(image)
    plt.axis('off')
    plt.title(title)
    plt.show()
    
    return image

def main():
    # query = "틱톡에서 뜨는 향수 관련 키워드"
    query = "미국 세포라에서 인기있는 향수 제품"

    # 1. 세그먼트 검색으로 이미지 가져오기
    print("=== 세그먼트 검색 ===")
    segments = search_segments(query)
    
    if segments:
        segment = segments[0]
        file_id = segment.get("file_id")
        page_id = segment.get("page_id")
        
        if file_id and page_id is not None:
            print(f"File ID: {file_id}, Page ID: {page_id}")
            
            # 페이지 정보 조회해서 실제 page 번호 가져오기
            page_info = get_page_info(page_id)
            page_num = page_info.get("page")
            
            if page_num is not None:
                # 이미지 URL 가져오기
                image_data = get_image_url(file_id, page_num)
                image_url = image_data.get("url")
                
                # 이미지 표시
                title = f"세그먼트: {segment.get('title', 'Unknown')}"
                display_image_from_url(image_url, title)
            else:
                print("❌ 페이지 번호를 찾을 수 없습니다!")
    
    # 2. 페이지 검색으로 이미지 가져오기
    print("\n=== 페이지 검색 ===")
    pages = search_pages(query)
    
    if pages:
        page = pages[0]
        file_id = page.get("file_id")
        page_num = page.get("page")
        
        if file_id and page_num is not None:
            print(f"File ID: {file_id}, Page: {page_num}")
            
            # 이미지 URL 가져오기
            image_data = get_image_url(file_id, page_num)
            image_url = image_data.get("url")
            
            # 이미지 표시
            title = f"페이지 {page_num}"
            display_image_from_url(image_url, title)

if __name__ == "__main__":
    main()