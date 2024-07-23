from flask import Flask, request, jsonify, render_template
from openai import OpenAI
import json

app = Flask(__name__)

# config.json 파일에서 API 키 읽어오기
with open('/Users/air/Documents/config.json') as config_file:
    config = json.load(config_file)
    api_key = config['chatGPT']['apiKey']

client = OpenAI(api_key=api_key)

# 최근 메시지를 저장할 리스트
recent_messages = []

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/clear', methods=['POST'])
def clear():
    global recent_messages  # 전역 변수 선언
    recent_messages = []
    return jsonify({'status': 'success'})

@app.route('/chat', methods=['POST'])
def chat():
    global recent_messages  # 전역 변수 선언

    data = request.json
    user_message = data.get('message', '')
    print(f'{user_message}\n')
    # 새 메시지 추가
    recent_messages.append({'role': 'user', 'content': user_message})

    # 메시지 개수 제한 (최근 10개만 유지)
    recent_messages = recent_messages[-10:]

    # API 호출
    completion = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=recent_messages,
        max_tokens=2000
    )

    response_text = completion.choices[0].message.content
    print(response_text)
    # 응답 메시지 추가
    recent_messages.append({'role': 'assistant', 'content': response_text})

    return jsonify({'response': response_text})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
