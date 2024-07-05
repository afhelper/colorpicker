import json
import time
import requests
import xmltodict
from playwright.sync_api import sync_playwright
import os

# 로그인 페이지 URL과 목표 페이지 URL
login_url = 'https://login.afreecatv.com/afreeca/login.php?szFrom=full&request_uri=https%3A%2F%2Fwww.afreecatv.com%2F'
url = "https://vod.afreecatv.com/player/129493479"

# 파일 경로 설정
desktop_path = os.path.expanduser("~/Desktop")
storage_file = os.path.join(desktop_path, 'storage_state.json')
result_folder = os.path.join(desktop_path, 'result')

# 결과 폴더가 존재하지 않으면 생성
if not os.path.exists(result_folder):
    os.makedirs(result_folder)

def save_login_state():
    with sync_playwright() as p:
        browser = p.firefox.launch(headless=False)  # headless=False로 설정하여 사용자가 브라우저를 볼 수 있게 함
        context = browser.new_context()
        page = context.new_page()
        
        # 로그인 페이지로 이동
        page.goto(login_url)
        
        # 사용자가 로그인할 시간을 줌
        print("로그인 후 계속 진행하려면 Enter 키를 누르세요...")
        input()
        
        # 로그인 상태 저장
        context.storage_state(path=storage_file)
        browser.close()
        print("로그인 상태가 저장되었습니다.")

# 로그인 상태를 유지하며 데이터 추출
def extract_data():
    try:
        with sync_playwright() as p:
            browser = p.firefox.launch(headless=True)  # headless=True로 설정하여 브라우저가 보이지 않게 함
            context = browser.new_context(storage_state=storage_file)
            page = context.new_page()
            
            # 목표 페이지로 이동
            page.goto(url)
            time.sleep(2)

            # JavaScript 실행하여 vodCore 객체 추출
            script = """
            () => {
                function getCircularReplacer() {
                    const seen = new WeakSet();
                    return (key, value) => {
                        if (typeof value === "object" && value !== null) {
                            if (seen.has(value)) {
                                return;
                            }
                            seen.add(value);
                        }
                        return value;
                    };
                }
                return JSON.stringify(window.vodCore, getCircularReplacer());
            }
            """
            vodcore_data = page.evaluate(script)

            # JSON 형식으로 변환
            vodcore_json = json.loads(vodcore_data)

            row_keys = [item['fileInfoKey'] for item in vodcore_json['fileItems']]
            durations = [item['duration'] for item in vodcore_json['fileItems']]

            print(row_keys)
            print(durations)
            fetch_data(row_keys, durations)
            browser.close()
    except Exception as e:
        print(f"에러가 발생했습니다: {e}")
        save_login_state()
        extract_data()

# 주어진 URL 템플릿
url_template = 'https://videoimg.afreecatv.com/php/ChatLoadSplit.php?rowKey={row_key}_c&startTime={start_time}'

# 모든 XML 데이터를 담을 리스트
all_data = []

def fetch_data(row_keys, durations):
    try:
        file_counter = 1  # 파일 카운터 초기화
        for row_key, duration in zip(row_keys, durations):
            iterations = duration // 300
            
            # startTime을 0부터 300씩 증가시키며 (iterations * 300)까지만 순회
            for start_time in range(0, (iterations + 1) * 300, 300):
                url = url_template.format(row_key=row_key, start_time=start_time)
                response = requests.get(url)
                response.raise_for_status()
                
                xml_data = response.content
                
                # 파일 이름을 동적으로 설정
                file_name = f"chat_{file_counter:04}.xml"  # 파일 이름 형식 설정
                file_counter += 1
                xml_file_path = os.path.join(result_folder, file_name)
                
                # XML 데이터를 파일로 저장
                with open(xml_file_path, "wb") as xml_file:
                    xml_file.write(xml_data)

                print(f'{url}\n진행중: {xml_file_path}')
                # 다음 요청 전 1초 대기
                time.sleep(0.7)

    except Exception as e:
        print(f"데이터 추출 중 오류가 발생했습니다: {str(e)}")



# 로그인 상태가 저장되어 있는지 확인하고 없으면 저장하도록 유도
if not os.path.exists(storage_file):
    save_login_state()

# 데이터 추출
extract_data()
