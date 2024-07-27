from flask import Flask, request, jsonify, render_template
from openai import OpenAI
import json
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)

with open('/home/ubuntu/bot/config.json') as config_file:
    config = json.load(config_file)
    api_key = config['chatGPT']['apiKey']
    sql_local = config['my_sql']['local']
    sql_remote = config['my_sql']['remote']
    sql_database = config['my_sql']['sql_database']
    sql_user = config['my_sql']['sql_user']
    sql_password = config['my_sql']['sql_password']

def insert_chat(q, a):
    global sql_local, sql_remote, sql_database, sql_user, sql_password
    connection = None  # 연결을 None으로 초기화
    try:
        # MySQL 데이터베이스에 연결
        connection = mysql.connector.connect(
            host=sql_local,
            database=sql_database,
            user=sql_user,
            password=sql_password
        )

        if connection.is_connected():
            cursor = connection.cursor()
            insert_query = "INSERT INTO chats (q, a) VALUES (%s, %s)"
            cursor.execute(insert_query, (q, a))
            connection.commit() 
            # print("Record inserted successfully")

    except Error as e:
        print(f"Error: {e}")
    
    finally:
        if connection is not None and connection.is_connected():
            cursor.close()
            connection.close()
            # print("MySQL connection is closed")

def get_chat_from_db():
    global sql_local, sql_remote, sql_database, sql_user, sql_password
    connection = None
    try:
        connection = mysql.connector.connect(
            host=sql_local,
            database=sql_database,
            user=sql_user,
            password=sql_password
        )

        if connection.is_connected():
            cursor = connection.cursor(dictionary=True)
            select_query = "SELECT seq, q, a FROM chats ORDER BY seq DESC LIMIT 30"
            cursor.execute(select_query)
            result = cursor.fetchall()
            chats = [{'seq': row['seq'], 'q': row['q'], 'a': row['a']} for row in result]
            return jsonify(chats)


    except Error as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)})

    finally:
        if connection is not None and connection.is_connected():
            cursor.close()
            connection.close()


@app.route('/get_answer/<int:seq>', methods=['GET'])
def get_answer(seq):
    global sql_local, sql_database, sql_user, sql_password
    connection = None
    try:
        connection = mysql.connector.connect(
            host=sql_local,
            database=sql_database,
            user=sql_user,
            password=sql_password
        )

        if connection.is_connected():
            cursor = connection.cursor(dictionary=True)
            query = "SELECT q, a FROM chats WHERE seq = %s"
            cursor.execute(query, (seq,))
            result = cursor.fetchone()

            if result:
                return jsonify({
                    "seq": seq,
                    "q": result['q'],
                    "a": result['a']
                })
            else:
                return jsonify({"error": "Answer not found"}), 404

    except Error as e:
        print(f"Error: {e}")
        return jsonify({"error": "Database error"}), 500

    finally:
        if connection is not None and connection.is_connected():
            cursor.close()
            connection.close()








client = OpenAI(api_key=api_key)

# 최근 메시지를 저장할 리스트
recent_messages = []

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/index2')
def home2():
    return render_template('index2.html')

@app.route('/recent_questions', methods=['GET'])
def recent_questions():
    return get_chat_from_db()

@app.route('/aid')
def get_key():
    aid = request.args.get('aid')
    with open('/home/ubuntu/bot/app_id.txt', 'w', encoding='utf-8') as f:
        f.write(aid)
    return aid

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
#    print(f'{user_message}\n')
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
#    print(response_text)
    # 응답 메시지 추가
    recent_messages.append({'role': 'assistant', 'content': response_text})
    insert_chat(user_message, response_text)
    return jsonify({'response': response_text})



#if __name__ == "__main__":
#    app.run(host='0.0.0.0',port=5001,debug = False,threaded=True)

