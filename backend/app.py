import os
import json
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
HISTORY_FILE = os.path.join(BASE_DIR, 'history.json')
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ✅ Define app only once
app = Flask(__name__)
CORS(app)   # enable CORS

# Simple deterministic local generator (fallback)
def local_generate_mcqs(source_text_or_topic, count=5):
    # ... your original function body unchanged ...
    questions = []
    for i in range(count):
        q = {
            "question": f"Sample question {i+1} based on {source_text_or_topic[:30]}...",
            "options": [
                f"Option A{i+1}", f"Option B{i+1}",
                f"Option C{i+1}", f"Option D{i+1}"
            ],
            "answer": f"Option A{i+1}"
        }
        questions.append(q)
    return questions

def normalize_questions(questions, fallback_text=''):
    if not isinstance(questions, list):
        return local_generate_mcqs(fallback_text)
    norm = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        question = q.get("question")
        options = q.get("options")
        answer = q.get("answer")
        if not question or not options or not answer:
            continue
        norm.append(q)
    if not norm:
        return local_generate_mcqs(fallback_text)
    return norm

# History helpers
def load_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    with open(HISTORY_FILE, 'r') as f:
        return json.load(f)

def save_history(hist):
    with open(HISTORY_FILE, 'w') as f:
        json.dump(hist, f)

# Routes
@app.route('/')
def index():
    return jsonify({'status': 'ok', 'service': 'mcq-generator-backend'})

@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.json
    topic = data.get('topic', '')
    count = int(data.get('count', 5))
    questions = local_generate_mcqs(topic, count)
    hist = load_history()
    hist.append({'topic': topic, 'questions': questions, 'timestamp': time.time()})
    save_history(hist)
    return jsonify({'questions': questions})

@app.route('/api/generate-from-text', methods=['POST'])
def generate_from_text():
    data = request.json
    text = data.get('text', '')
    count = int(data.get('count', 5))
    questions = local_generate_mcqs(text, count)
    hist = load_history()
    hist.append({'text': text, 'questions': questions, 'timestamp': time.time()})
    save_history(hist)
    return jsonify({'questions': questions})

@app.route('/api/generate-from-file', methods=['POST'])
def generate_from_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_DIR, filename)
    file.save(filepath)
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    count = int(request.form.get('count', 5))
    questions = local_generate_mcqs(content, count)
    hist = load_history()
    hist.append({'file': filename, 'questions': questions, 'timestamp': time.time()})
    save_history(hist)
    return jsonify({'questions': questions})

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify({'history': load_history()})

# ✅ Only one app.run at the bottom
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
