import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import Alignment
from openpyxl.worksheet.hyperlink import Hyperlink

# 사용자로부터 URL 입력받기
base_url = input("url 주소 입력: ")

# 엑셀 파일 읽기
file_path = '/Users/air/Desktop/result/5337895개.xlsx'  # 원본 엑셀 파일 경로를 지정해주세요
df = pd.read_excel(file_path)

# balloons 열이 100 이상인 행만 필터링
filtered_df = df[df['Balloons'] >= 100]
# filtered_df = filtered_df[filtered_df['Message'].str.contains('하|하플|트|뚱', na=False)]
filtered_df = filtered_df[filtered_df['Message'].str.contains('조|조플|유정|ㅈㅇㅈ', na=False)]
# balloons 열의 합계 계산
balloons_sum = filtered_df['Balloons'].sum()


# 필터링된 데이터를 새 엑셀 파일로 저장
output_file_path = f'/Users/air/Desktop/result/filtered_output_{balloons_sum}개.xlsx'  # 저장할 엑셀 파일 경로를 지정해주세요
filtered_df.to_excel(output_file_path, index=False)

# 엑셀 파일 열기
workbook = load_workbook(output_file_path)
worksheet = workbook.active


# 타임라인 열에 하이퍼링크 추가
for row in worksheet.iter_rows(min_row=2, max_row=worksheet.max_row, min_col=2, max_col=2):
    for cell in row:
        timestamp = cell.value
        if isinstance(timestamp, str):
            h, m, s = map(int, timestamp.split(':'))
            total_seconds = h * 3600 + m * 60 + s
            hyperlink_url = f"{base_url}?change_second={total_seconds}"
            cell.hyperlink = Hyperlink(ref=cell.coordinate, target=hyperlink_url)
            cell.style = "Hyperlink"


# 중앙 정렬 설정
center_alignment = Alignment(horizontal='center', vertical='center')

# 모든 셀을 중앙 정렬
for row in worksheet.iter_rows():
    for cell in row:
        if cell.column_letter not in ['F', 'G']:
            cell.alignment = center_alignment

# 헤더를 중앙 정렬
for cell in worksheet[1]:
    cell.alignment = center_alignment


# 열 길이 조정 및 숨김 처리
for column in worksheet.columns:
    max_length = 0
    column = [cell for cell in column]
    for cell in column:
        try:
            if len(str(cell.value)) > max_length:
                max_length = len(cell.value)
        except:
            pass
    adjusted_width = (max_length + 5)
    column_letter = column[0].column_letter
    if column_letter == 'F' or column_letter == 'G':
        worksheet.column_dimensions[column_letter].width = 80
    elif column_letter == 'A' or column_letter == 'D' or column_letter == 'H':
        worksheet.column_dimensions[column_letter].hidden = True
    else:
        worksheet.column_dimensions[column_letter].width = adjusted_width

worksheet.auto_filter.ref = worksheet.dimensions
workbook.save(output_file_path)


print(balloons_sum)
print(f"필터링된 데이터를 '{output_file_path}'에 저장했습니다.")
