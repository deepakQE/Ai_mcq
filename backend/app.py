import os
import json
import time
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
HISTORY_FILE = os.path.join(BASE_DIR, 'history.json')
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)

# Simple deterministic local generator (fallback) -------------------------------------------------
def local_generate_mcqs(source_text_or_topic, count=5):
    """Return a list of simple MCQ dicts based on topic/text."""
    out = []
    topic_hint = (source_text_or_topic or '').strip()[:40] or 'Topic'
    for i in range(int(count) if count else 5):
        prompt = f"{topic_hint} — Question {i+1}: Explain the concept in one sentence."""
        options = [f"Option {chr(65 + j)} for {topic_hint}" for j in range(4)]
        out.append({
            'prompt': prompt,
            'options': options,
            'answer': 'A',
            'explanation': f"Short explanation for question {i+1}."
        })
    return out


def normalize_questions(questions, fallback_text=''):
    """Ensure each question has prompt, 4 options, and answer A-D."""
    import random, re
    out = []
    for q in (questions or []):
        try:
            if isinstance(q, dict):
                prompt = str(q.get('prompt') or q.get('question') or '')
            else:
                prompt = str(q)
        except Exception:
            prompt = ''
        if not prompt:
            prompt = (fallback_text or 'Question').strip()
        # collect options
        opts = []
        if isinstance(q, dict):
            raw_opts = q.get('options') or q.get('choices') or q.get('answers') or []
            if isinstance(raw_opts, list):
                opts = [str(x) for x in raw_opts if x is not None]
            elif isinstance(raw_opts, str):
                opts = [s.strip() for s in re.split(r'[\n;]+', raw_opts) if s.strip()]
        # fallback: create four generic options
        if not opts:
            opts = [f"{prompt} - distractor {i+1}" for i in range(4)]
        # ensure unique and trim
        seen = set(); uniq = []
        for o in opts:
            s = o.strip()
            if s and s not in seen:
                uniq.append(s); seen.add(s)
        opts = uniq[:4]
        while len(opts) < 4:
            opts.append(f"None of the above {len(opts)+1}")
        # answer
        ans = None
        if isinstance(q, dict):
            a = q.get('answer') or q.get('correct') or q.get('answer_key')
            if isinstance(a, int):
                if 0 <= a < len(opts): ans = chr(65 + a)
            elif isinstance(a, str) and a.strip():
                s = a.strip()
                if re.fullmatch(r'[A-Da-d]', s):
                    ans = s.upper()
                else:
                    for idx, o in enumerate(opts):
                        if o.lower() == s.lower(): ans = chr(65 + idx); break
        if not ans:
            ans = 'A'
        idx = ord(ans) - 65
        if idx < 0 or idx >= len(opts):
            ans = 'A'
        explanation = ''
        if isinstance(q, dict):
            explanation = q.get('explanation') or q.get('explain') or ''
        if not explanation:
            explanation = f"Based on: {prompt[:120]}"
        out.append({'prompt': prompt, 'options': opts, 'answer': ans, 'explanation': explanation})
    return out


# History helpers -------------------------------------------------------------------------------
def load_history():
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return []


def save_history(hist):
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(hist, f, indent=2)
    except Exception:
        pass


# Routes -----------------------------------------------------------------------------------------
@app.route('/')
def index():
    return jsonify({'status': 'ok', 'service': 'mcq-generator-backend'})


@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.get_json(force=True, silent=True) or {}
    topic = data.get('topic') or data.get('q') or ''
    count = int(data.get('count', 5) or 5)
    questions = local_generate_mcqs(topic, count)
    questions = normalize_questions(questions, fallback_text=topic)
    # save to history
    hist = load_history()
    entry = {'id': int(time.time()*1000), 'topic': topic, 'questions': questions, 'createdAt': time.ctime()}
    hist.insert(0, entry)
    save_history(hist[:200])
    return jsonify({'questions': questions})


@app.route('/api/generate-from-text', methods=['POST'])
def generate_from_text():
    data = request.get_json(force=True, silent=True) or {}
    text = data.get('text') or data.get('sourceText') or ''
    topic = data.get('topic') or ''
    count = int(data.get('count', 5) or 5)
    if not text or len(text.strip()) < 5:
        return jsonify({'error': 'no text provided'}), 400
    questions = local_generate_mcqs(text[:200], count)
    questions = normalize_questions(questions, fallback_text=text[:200])
    hist = load_history()
    entry = {'id': int(time.time()*1000), 'topic': topic or 'from-text', 'questions': questions, 'createdAt': time.ctime()}
    hist.insert(0, entry)
    save_history(hist[:200])
    return jsonify({'questions': questions})


@app.route('/api/generate-from-file', methods=['POST'])
def generate_from_file():
    # Accepts form-data with 'file' and optional fields
    file = request.files.get('file')
    topic = request.form.get('topic') or ''
    count = int(request.form.get('count', 5) or 5)
    if not file:
        return jsonify({'error': 'no file uploaded'}), 400
    filename = secure_filename(file.filename)
    path = os.path.join(UPLOAD_DIR, filename)
    try:
        file.save(path)
    except Exception as e:
        return jsonify({'error': 'failed to save file', 'details': str(e)}), 500
    # only support plain text uploads in this trimmed backend
    ext = os.path.splitext(filename)[1].lower()
    text = ''
    if ext in ('.txt', '.md'):
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        except Exception:
            text = ''
    else:
        # do not attempt heavy extraction here; return helpful message
        return jsonify({'error': 'unsupported file type for automatic extraction — upload .txt or use /api/generate-from-text'}), 422
    if not text or len(text.strip()) < 5:
        return jsonify({'error': 'extracted text too short'}), 422
    questions = local_generate_mcqs(text[:200], count)
    questions = normalize_questions(questions, fallback_text=text[:200])
    hist = load_history()
    entry = {'id': int(time.time()*1000), 'topic': topic or filename, 'questions': questions, 'createdAt': time.ctime(), 'sourceFile': filename}
    hist.insert(0, entry)
    save_history(hist[:200])
    return jsonify({'questions': questions})


@app.route('/api/history', methods=['GET'])
def get_history():
    hist = load_history()
    return jsonify({'history': hist})


# Run --------------------------------------------------------------------------------------------
if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

