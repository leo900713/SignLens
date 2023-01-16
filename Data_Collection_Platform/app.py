from datetime import datetime
import credentials

import numpy as np
import psycopg2
from flask import Flask, render_template, request
from pypinyin import Style, pinyin

app = Flask(__name__)

BOPOMOFO = [
    'ㄅ', 'ㄆ', 'ㄇ', 'ㄈ',
    'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ',
    'ㄍ', 'ㄎ', 'ㄏ',
    'ㄐ', 'ㄑ', 'ㄒ',
    'ㄓ', 'ㄔ', 'ㄕ', 'ㄖ',
    'ㄗ', 'ㄘ', 'ㄙ',
    'ㄧ', 'ㄨ', 'ㄩ',
    'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ',
    'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ',
    'ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'
]


@app.route("/")
def home():
    conn = psycopg2.connect(database=credentials.DATABASE, user=credentials.USER, password=credentials.PASSWORD,
                            host=credentials.HOST, port=credentials.PORT)
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT c_label, bopomofo FROM signlens;")
    result = cur.fetchall()
    conn.commit()
    cur.close()

    print(result)
    table = [{'bopomofo': b, 'labels': []} for b in BOPOMOFO]
    for label, bopomofo in result:
        table[BOPOMOFO.index(bopomofo)]['labels'].append(label)
    for tr in table:
        tr['labels'] = "、".join(tr['labels'])
    print(table)
    return render_template("index.html", table=table)


@ app.route("/upload", methods=["POST"])
def upload():
    body = request.json
    label = body["label"]
    data = np.array(body["data"]).reshape(-1, 30, 258).tolist()
    time = datetime.now()
    bopomofo = pinyin(label, style=Style.BOPOMOFO_FIRST)[0][0]
    print(time, label)

    conn = psycopg2.connect(database=credentials.DATABASE, user=credentials.USER, password=credentials.PASSWORD,
                            host=credentials.HOST, port=credentials.PORT)
    cur = conn.cursor()
    for keypoints in data:
        cur.execute("INSERT INTO signlens (c_label,keypoint,submission_time,bopomofo) VALUES (%s,%s,%s,%s);",
                    (label, keypoints, time, bopomofo))
    conn.commit()
    cur.close()
    return {"status": True}


if __name__ == "__main__":
    app.run(debug=True)
