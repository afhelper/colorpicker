

import json
import time
from playwright.sync_api import sync_playwright

# url =  ''

with sync_playwright() as p:
    # Firefox 브라우저를 실행합니다.
    browser = p.firefox.launch(headless=False)
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

    # vodCore 객체 출력
    # print(json.dumps(vodcore_json, indent=2))

    # print(vodcore_json['fileItems'])



    fileInfoKeys = [item['fileInfoKey'] for item in vodcore_json['fileItems']]
    durations = [item['duration'] for item in vodcore_json['fileItems']]
    print(fileInfoKeys)
    print(durations)



    # 브라우저 종료
    browser.close()
