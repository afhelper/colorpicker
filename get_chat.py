import json
import time
import requests
import xmltodict
from playwright.sync_api import sync_playwright
import os

# Playwright를 사용하여 row_keys와 durations을 가져오기
url = ''

with sync_playwright() as p:
    # Firefox 브라우저를 실행합니다.
    browser = p.firefox.launch(headless=True)
    page = browser.new_page()

    # 웹 페이지를 엽니다.
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
    # 브라우저 종료
    browser.close()

# 주어진 URL 템플릿
url_template = 'https://videoimg.afreecatv.com/php/ChatLoadSplit.php?rowKey={row_key}_c&startTime={start_time}'

# 모든 XML 데이터를 담을 리스트
all_chats = []

# 각 rowKey와 duration에 대해 데이터를 수집
for row_key, duration in zip(row_keys, durations):
    iterations = duration // 300
    
    # startTime을 0부터 300씩 증가시키며 (iterations * 300)까지만 순회
    for start_time in range(0, (iterations + 1) * 300, 300):
        url = url_template.format(row_key=row_key, start_time=start_time)
        response = requests.get(url)
        response.raise_for_status()
        
        xml_data = response.content
        dict_data = xmltodict.parse(xml_data)
        
        # chat 노드가 리스트인지 단일 객체인지 확인 후 리스트로 변환
        chat_data = dict_data['root'].get('chat', [])
        if isinstance(chat_data, list):
            all_chats.extend(chat_data)
        else:
            all_chats.append(chat_data)
        
        # 다음 요청 전 1초 대기
        time.sleep(0.7)

# 전체 데이터를 딕셔너리 형태로 만들기
full_data = {'root': {'chat': all_chats}}

# JSON 형식으로 변환
json_data = json.dumps(full_data, ensure_ascii=False, indent=4)

# 파일 이름을 동적으로 설정
file_name = "chat.txt"
desktop_path = os.path.expanduser("~/Desktop")
json_file_path = os.path.join(desktop_path, file_name)

# JSON 데이터를 파일로 저장
with open(json_file_path, "w", encoding="utf-8") as json_file:
    json_file.write(json_data)

print(f"JSON 데이터가 바탕화면에 {json_file_path} 파일로 저장되었습니다.")
