import re
import urllib.parse
from prettytable import PrettyTable
import csv

def extract_audio_and_stars(data):
    # 결과를 저장할 리스트
    results = []
    
    # donation 항목에서 데이터 추출
    donation_pattern = r'data%5Bdonation%5D%5Bitem_alert_donation%5D%5B(\d+)%5D%5B.*?%5D'
    donations = re.finditer(donation_pattern, data)
    
    for donation in donations:
        donation_idx = donation.group(1)
        donation_section = data[donation.start():]
        
        # giftmin 추출
        giftmin_pattern = rf'donation%5D%5B{donation_idx}%5D%5Btext%5D%5Bsetup_alert_giftmin%5D=(\d+)'
        giftmin_match = re.search(giftmin_pattern, donation_section)
        giftmin = giftmin_match.group(1) if giftmin_match else ""
        
        # giftmax 추출
        giftmax_pattern = rf'donation%5D%5B{donation_idx}%5D%5Btext%5D%5Bsetup_alert_giftmax%5D=([^&]*)'
        giftmax_match = re.search(giftmax_pattern, donation_section)
        giftmax = urllib.parse.unquote(giftmax_match.group(1)) if giftmax_match else ""
        
        # 오디오 URL 추출 (mp3 또는 wav)
        audio_pattern = rf'donation%5D%5B{donation_idx}%5D%5Bupload%5D%5Bsetup_alert_uploadsound%5D%5Burl%5D=([^&]*?(?:mp3|wav)[^&]*)'
        audio_match = re.search(audio_pattern, donation_section)
        audio_url = urllib.parse.unquote(audio_match.group(1)) if audio_match else ""
        
        if audio_url:  # 오디오 URL이 있는 경우만 추가
            results.append({
                'minstar': giftmin,
                'maxstar': giftmax,
                'audio_url': audio_url
            })
    
    return results

def create_table(results):
    # PrettyTable로 표 생성
    table = PrettyTable()
    table.field_names = ["MinStar", "MaxStar", "Audio URL"]
    
    for result in results:
        table.add_row([result['minstar'], result['maxstar'], result['audio_url']])
    
    return table

# 파일 읽기
file_path = "/Users/air/Desktop/data.txt"
try:
    with open(file_path, 'r', encoding='utf-8') as file:
        data = file.read()
except FileNotFoundError:
    print(f"Error: File not found at {file_path}")
    exit(1)
except Exception as e:
    print(f"Error reading file: {e}")
    exit(1)

# 데이터 분석 및 표 생성
results = extract_audio_and_stars(data)
table = create_table(results)

# 결과 출력
print(table)

# 결과를 CSV 파일로 저장
output_csv = "/Users/air/Desktop/audio_stars.csv"
with open(output_csv, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['MinStar', 'MaxStar', 'Audio URL'])
    for result in results:
        writer.writerow([result['minstar'], result['maxstar'], result['audio_url']])
print(f"Data has been saved to '{output_csv}'")