import json
import time
import requests
from playwright.sync_api import sync_playwright
import os
import xml.etree.ElementTree as ET
import re

# 로그인 페이지 URL과 목표 페이지 URL
login_url = 'https://login.afreecatv.com/afreeca/login.php?szFrom=full&request_uri=https%3A%2F%2Fwww.afreecatv.com%2F'
url = input("url 주소 입력: ")

# 전역 변수 선언
all_timestamp = []
broadcast_title = ''
# 파일 경로 설정
desktop_path = os.path.expanduser("~/Desktop")
storage_file = os.path.join(desktop_path, 'code', 'getaf', 'storage_state.json')
result_folder = os.path.join(desktop_path, 'result')
# final_output_file = os.path.join(desktop_path, 'final_result.html')
# final_output_file = desktop_path

# 결과 폴더가 존재하지 않으면 생성
if not os.path.exists(result_folder):
    os.makedirs(result_folder)


def format_timestamp(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60
    return f"{round(hours):02}:{round(minutes):02}:{round(seconds):02}"

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
    global broadcast_title
    try:
        with sync_playwright() as p:
            browser = p.firefox.launch(headless=True)  # headless=True로 설정하여 브라우저가 보이지 않게 함
            context = browser.new_context(storage_state=storage_file)
            page = context.new_page()
            
            # 목표 페이지로 이동
            page.goto(url)
            time.sleep(2)

            # broadcast_title 클래스의 title 속성 값 가져오기
            title_selector = ".broadcast_title"
            title_element = page.query_selector(title_selector)
            if title_element:
                broadcast_title = title_element.get_attribute("title")
                print(f"Broadcast Title: {broadcast_title}")
            else:
                print("Broadcast title element not found.")

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


def fetch_data(row_keys, durations):
    file_counter = 1  # 파일 카운터 초기화
    for row_key, duration in zip(row_keys, durations):
        iterations = duration // 300
        
        # startTime을 0부터 300씩 증가시키며 (iterations * 300)까지만 순회
        for start_time in range(0, (iterations + 1) * 300, 300):
            try:
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
                continue


# XML 파일에서 필요한 데이터 추출
def extract_required_data_from_xml(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    extracted_data = []
    total_sum = 0
    
    for element in root:
        if element.tag in ['chat', 'balloon', 'adballoon', 'ogq']:
            nickname = ''
            user_id = ''
            message = ''
            timestamp = ''
            
            if element.tag == 'ogq':
                user_id = element.find('s').text if element.find('s') is not None else ''
                nickname = element.find('sn').text if element.find('sn') is not None else ''
                message = element.find('m').text if element.find('m') is not None else ''
                timestamp = element.find('t').text if element.find('t') is not None else ''
            elif element.tag in ['balloon', 'adballoon']:
                nickname = element.find('n').text if element.find('n') is not None else ''
                user_id = element.find('u').text if element.find('u') is not None else ''
                message = element.find('c').text if element.find('c') is not None else ''
                timestamp = element.find('t').text if element.find('t') is not None else ''
                
                # c 필드의 값을 숫자로 변환하여 합산
                if message and message.isdigit():
                    total_sum += int(message)
                message = f'<span style="color: red;">{message}</span>'
            else:
                nickname = element.find('n').text if element.find('n') is not None else ''
                user_id = element.find('u').text if element.find('u') is not None else ''
                message = element.find('m').text if element.find('m') is not None else ''
                timestamp = element.find('t').text if element.find('t') is not None else ''
            
            # all_timestamp에 timestamp 저장
            all_timestamp.append(timestamp)
            
            extracted_data.append({
                'tag': element.tag,
                'nickname': nickname,
                'user_id': user_id,
                'message': message,
                'timestamp': timestamp
            })
    
    return extracted_data, total_sum

# 모든 XML 파일 처리 및 결과 저장
def process_all_xml_files():
    all_extracted_data = []
    total_sum = 0

    # result 폴더의 모든 XML 파일 처리
    for filename in sorted(os.listdir(result_folder)):
        if filename.endswith('.xml'):
            file_path = os.path.join(result_folder, filename)
            extracted_data, file_sum = extract_required_data_from_xml(file_path)
            total_sum += file_sum
            all_extracted_data.extend(extracted_data)
    
    # 주어진 로직을 사용하여 c 배열 계산
    b = all_timestamp
    c = []

    # 초기값 설정
    prev_value = 0

    for i in range(len(b)):
        # 문자열을 float로 변환
        current_value = float(b[i])
        
        if i == 0:
            c.append(float(current_value))
        else:
            if current_value < float(b[i - 1]):
                prev_value = c[-1]
            c.append(float(prev_value + current_value))

    # HTML 파일 생성 및 저장
    with open(os.path.join(desktop_path, 'result', f'{broadcast_title}.html'), 'w', encoding='utf-8') as output_file:
        output_file.write(f"""
        <html>
        <head>
            <title>{broadcast_title}</title>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
            <style>
                .hidden {{ display: none; }}
                .filter-button {{ margin-bottom: 10px; }}
                .following-messages {{ margin-top: 10px; color: grey; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>{broadcast_title}</h1>
                <h1>Total Sum of balloon: {total_sum}</h1>
                <div class="checkbox-container">
                    <label><input type="checkbox" class="column-toggle" data-column="0" checked> Timestamp</label>
                    <label><input type="checkbox" class="column-toggle" data-column="1" checked> Nickname</label>
                    <label><input type="checkbox" class="column-toggle" data-column="2" checked> User ID</label>
                    <label><input type="checkbox" class="column-toggle" data-column="3" checked> Message</label>
                    <label><input type="checkbox" class="column-toggle" data-column="4"> Accumulated</label>
                    <label><input type="checkbox" class="following-toggle" checked> Show Following Messages</label>
                </div>
                <button class="btn btn-primary filter-button" onclick="toggleFilter()">Show Only Red Rows</button>
                <button class="btn btn-secondary filter-button" onclick="toggleHighValueFilter()">Show Only Red Rows with Value >= 100</button>
                <table class="table table-bordered" id="dataTable">
                    <thead class="thead-dark">
                        <tr>
                            <th>Timestamp</th>
                            <th>Nickname</th>
                            <th>User ID</th>
                            <th>Message</th>
                            <th class="hidden">Accumulated</th>
                        </tr>
                    </thead>
                    <tbody>
        """)
        accumulated_sum = 0
        for idx, (data, timestamp) in enumerate(zip(all_extracted_data, c)):
            message = data['message']
            if message and 'color: red' in message:
                number_match = re.search(r'>(\d+)<', message)
                if number_match:
                    accumulated_sum += int(number_match.group(1))
            timestamp_url = f"{url}?change_second={timestamp-3}"
            output_file.write(f"""
                        <tr>
                            <td><a href="{timestamp_url}" target="_blank">{format_timestamp(timestamp)}</a></td>
                            <td>{data['nickname']}</td>
                            <td>{data['user_id']}</td>
                            <td>{data['message']}
            """)
            if message and 'color: red' in message:
                number_match = re.search(r'>(\d+)<', message)
                if number_match and int(number_match.group(1)) >= 100:
                    next_messages = []
                    next_messages_count = 0
                    for next_idx in range(idx + 1, len(all_extracted_data)):
                        if next_messages_count >= 3:
                            break
                        if all_extracted_data[next_idx]['user_id'] == data['user_id']:
                            next_messages.append(all_extracted_data[next_idx]['message'])
                            next_messages_count += 1
                    if next_messages_count > 0:
                        output_file.write(f"""
                            <div class="following-messages">
                                {''.join([f"<br>{msg}" for msg in next_messages])}
                            </div>
                        """)
            output_file.write(f"""
                            </td>
                            <td class="hidden">{accumulated_sum}</td>
                        </tr>
            """)
        output_file.write("""
                    </tbody>
                </table>
            </div>
            <script>
                let isFiltered = false;
                let isHighValueFiltered = false;

                function toggleFilter() {
                    const rows = document.querySelectorAll('#dataTable tbody tr');
                    isFiltered = !isFiltered;

                    rows.forEach(row => {
                        const messageCell = row.cells[3];
                        if (isFiltered) {
                            if (messageCell.innerHTML.includes('color: red')) {
                                row.classList.remove('hidden');
                            } else {
                                row.classList.add('hidden');
                            }
                        } else {
                            row.classList.remove('hidden');
                        }
                    });

                    document.querySelector('.filter-button').innerText = isFiltered ? 'Show All Rows' : 'Show Only Red Rows';
                }

                function toggleHighValueFilter() {
                    const rows = document.querySelectorAll('#dataTable tbody tr');
                    isHighValueFiltered = !isHighValueFiltered;

                    rows.forEach(row => {
                        const messageCell = row.cells[3];
                        if (isHighValueFiltered) {
                            const numberMatch = messageCell.innerHTML.match(/>(\\d+)</);
                            if (messageCell.innerHTML.includes('color: red') && numberMatch && parseInt(numberMatch[1]) >= 100) {
                                row.classList.remove('hidden');
                            } else {
                                row.classList.add('hidden');
                            }
                        } else {
                            row.classList.remove('hidden');
                        }
                    });

                    document.querySelectorAll('.filter-button')[1].innerText = isHighValueFiltered ? 'Show All Rows' : 'Show Only Red Rows with Value >= 100';
                }

                document.querySelectorAll('.column-toggle').forEach(checkbox => {
                    checkbox.addEventListener('change', function() {
                        const column = this.dataset.column;
                        const isChecked = this.checked;
                        const table = document.getElementById('dataTable');
                        const rows = table.querySelectorAll('tr');
                        
                        rows.forEach(row => {
                            if (isChecked) {
                                row.cells[column].classList.remove('hidden');
                            } else {
                                row.cells[column].classList.add('hidden');
                            }
                        });
                    });
                });

                document.querySelector('.following-toggle').addEventListener('change', function() {
                    const isChecked = this.checked;
                    const messages = document.querySelectorAll('.following-messages');
                    
                    messages.forEach(message => {
                        if (isChecked) {
                            message.classList.remove('hidden');
                        } else {
                            message.classList.add('hidden');
                        }
                    });
                });
            </script>
        </body>
        </html>
        """)

    print(f"저장되었습니다.")

# 로그인 상태가 저장되어 있는지 확인하고 없으면 저장하도록 유도
if not os.path.exists(storage_file):
    save_login_state()

# 데이터 추출
extract_data()

# 모든 XML 파일에서 필요한 정보 추출 및 저장
process_all_xml_files()
