import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import './index.css';
import QuestionCard from './components/QuestionCard';
import QuizSummary from './components/QuizSummary';
import { generateQuestions, shuffleArray, exportToJSON } from './utils';
const API_BASE = "https://ai-mcq-5c6u.onrender.com";  // your Render backend URL

function App() {
  const [topic, setTopic] = useState('python');
  const [subtopics, setSubtopics] = useState('');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [useBackend, setUseBackend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [useLLM, setUseLLM] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mcq_dark') === '1');
  const questionRef = useRef(null);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mcq_history') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    // load last session if present
    const saved = localStorage.getItem('mcq_last_quiz');
    if (saved) {
      // do not auto-restore, just keep available
    }
  }, []);

  useEffect(() => {
    // apply theme and dark-mode classes on body
    const classes = ['theme-meditation', 'dark-mode'];
    classes.forEach(c => document.body.classList.remove(c));
    document.body.classList.add('theme-meditation');
    if (darkMode) document.body.classList.add('dark-mode');
    localStorage.setItem('mcq_dark', darkMode ? '1' : '0');
  }, [darkMode]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setShowSummary(false);

    try {
      let qs = [];
      if (useBackend && sourceText.trim()) {
        // send text to backend generate-from-text endpoint
        try {
          const payload = { topic, subtopics, difficulty, count, text: sourceText, useLLM: useLLM ? '1' : '0' };
          const res = await axios.post(`${API_BASE}/api/generate-from-text`, payload);

          qs = res.data.questions || [];
        } catch (e) {
          console.warn('Backend text-generation failed, falling back to local generator', e);
          qs = generateQuestions({ topic, subtopics, difficulty, count });
        }
      } else if (useBackend) {
        // Try backend generic endpoint, fallback to frontend
        try {
          const payload = { topic, subtopics, difficulty, count };
          const res = await axios.post(`${API_BASE}/api/generate`, payload);

          qs = res.data.questions || [];
        } catch (e) {
          console.warn('Backend generation failed, falling back to local generator', e);
          qs = generateQuestions({ topic, subtopics, difficulty, count });
        }
      } else {
        qs = generateQuestions({ topic, subtopics, difficulty, count });
      }

      if (shuffleQuestions) qs = shuffleArray(qs);
      setQuestions(qs);
      // add to local history with deduplication by topic + question set
      const entry = { id: Date.now(), topic, subtopics, difficulty, count, questions: qs, createdAt: new Date().toISOString() };
      const qHash = JSON.stringify(qs);
      let newHist = [...history];
      const existingIndex = newHist.findIndex(h => h.topic === topic && JSON.stringify(h.questions) === qHash);
      if (existingIndex !== -1) {
        // move existing to top and update timestamp
        const existing = newHist.splice(existingIndex, 1)[0];
        existing.createdAt = entry.createdAt;
        newHist.unshift(existing);
      } else {
        newHist = [entry, ...newHist];
      }
      newHist = newHist.slice(0, 50);
      setHistory(newHist);
      localStorage.setItem('mcq_history', JSON.stringify(newHist));
      // persist last quiz
      localStorage.setItem('mcq_last_quiz', JSON.stringify({ topic, subtopics, difficulty, count, questions: qs }));
      // scroll to question area after rendering
      setTimeout(() => { if (questionRef.current) questionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200);
    } catch (err) {
      console.error(err);
      alert('Failed to generate questions. See console.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qIndex, selected) => {
    setAnswers(prev => ({ ...prev, [qIndex]: selected }));
  };

  const handleNext = () => {
    // manual navigation
    if (currentIndex + 1 < questions.length) setCurrentIndex(currentIndex + 1);
    else setShowSummary(true);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleFinish = () => {
    setShowSummary(true);
  };

  const handleExport = () => {
    const data = { meta: { topic, subtopics, difficulty, count, generatedAt: new Date().toISOString() }, questions };
    exportToJSON(data, `mcq_${topic.replace(/\s+/g, '_')}_${Date.now()}.json`);
  };

  const handleLoadHistory = (entry) => {
    setTopic(entry.topic || '');
    setSubtopics(entry.subtopics || '');
    setDifficulty(entry.difficulty || 'Mixed');
    setCount(entry.count || 5);
    setQuestions(entry.questions || []);
    setShowSummary(false);
    setAnswers({});
    setCurrentIndex(0);
  };

  const exportHistory = () => {
    // export entire history JSON
    try {
      const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mcq_history_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert('Export failed'); }
  };

  const score = questions.reduce((acc, q, idx) => {
    const ans = answers[idx];
    if (!ans) return acc;
    return acc + (ans === q.answer ? 1 : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-4">
          <h1 className="text-3xl font-bold text-blue-700">MCQ Generator Pro</h1>
          <p className="text-sm text-gray-600">Generate, take, and export multiple-choice quizzes quickly.</p>
          <div className="dev-toolbar mt-4 p-2 rounded">
            <div className="flex items-center gap-3">
              <strong className="text-sm">Developer</strong>
              <div className="text-sm">Theme: Meditation</div>
              <label className="inline-flex items-center text-sm"> <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} className="mr-2" /> Dark mode</label>
              <button onClick={() => { if (window.confirm('Clear local history?')) { localStorage.removeItem('mcq_history'); setHistory([]); } }} className="px-2 py-1 bg-red-500 text-white rounded text-sm">Clear History</button>
              <button onClick={exportHistory} className="px-2 py-1 bg-gray-200 rounded text-sm">Export History</button>
            </div>
          </div>
        </header>

        <section className="bg-white p-4 rounded shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Topic</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={2} className="mt-1 block w-full border rounded p-2" />
              <label className="block text-sm font-medium text-gray-700 mt-2">Subtopics (comma separated)</label>
              <input value={subtopics} onChange={e => setSubtopics(e.target.value)} className="mt-1 block w-full border rounded p-2" />
              <label className="block text-sm font-medium text-gray-700 mt-2">Source text (paste content here, optional)</label>
              <textarea value={sourceText} onChange={e => setSourceText(e.target.value)} rows={6} className="mt-1 block w-full border rounded p-2" placeholder="Paste text from a document to generate questions from it" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="mt-1 block w-full border rounded p-2">
                <option>Mixed</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>

              <label className="block text-sm font-medium text-gray-700 mt-2">Number of Questions</label>
              <input type="number" min={1} max={50} value={count} onChange={e => setCount(Number(e.target.value))} className="mt-1 block w-full border rounded p-2" />

              <div className="mt-3 space-y-2">
                <label className="inline-flex items-center">
                  <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} className="mr-2" /> Shuffle
                </label>
                <label className="inline-flex items-center">
                  <input type="checkbox" checked={useLLM} onChange={e => setUseLLM(e.target.checked)} className="mr-2" /> Use LLM (Gemini/OpenAI via backend)
                </label>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button onClick={handleGenerate} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {loading ? 'Generating...' : 'Generate MCQs'}
                </button>
                <button onClick={handleExport} disabled={!questions.length} className="px-4 py-2 bg-gray-200 rounded">Export JSON</button>
              </div>
            </div>
          </div>
        </section>

        <section>
          {questions.length === 0 && (
            <div className="text-center text-gray-500">No questions yet. Generate to begin.</div>
          )}

          {questions.length > 0 && !showSummary && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-700">Question {currentIndex + 1} of {questions.length}</div>
                <div className="text-sm text-gray-700">Score: {score} / {questions.length}</div>
              </div>

              <div ref={questionRef}>
                <QuestionCard
                  qIndex={currentIndex}
                  question={questions[currentIndex]}
                  selected={answers[currentIndex]}
                  onSelect={selected => handleAnswer(currentIndex, selected)}
                />
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={handlePrev} disabled={currentIndex === 0} className="px-3 py-1 bg-white border rounded">Prev</button>
                <button onClick={handleNext} disabled={currentIndex === questions.length - 1} className="px-3 py-1 bg-white border rounded">Next</button>
                <button onClick={handleFinish} className="ml-auto px-3 py-1 bg-green-600 text-white rounded">Finish Quiz</button>
              </div>
            </div>
          )}

          {showSummary && (
            <QuizSummary questions={questions} answers={answers} onRestart={() => { setShowSummary(false); setQuestions([]); setAnswers({}); }} />
          )}
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">History</h3>
          </div>
          {history.length === 0 && <div className="text-sm text-gray-500">No history yet.</div>}
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="p-3 border rounded flex items-center justify-between bg-white shadow-sm">
                 <div>
                   <div className="font-semibold">{h.topic} <span className="text-xs text-gray-500">({h.sourceFile || 'manual'})</span></div>
                   <div className="text-xs text-gray-600">{new Date(h.createdAt).toLocaleString()} — {h.questions.length} questions</div>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => handleLoadHistory(h)} className="px-2 py-1 bg-white border rounded text-sm">Load</button>
                   <button onClick={() => { const blob = new Blob([JSON.stringify(h, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `history_${h.id}.json`; a.click(); URL.revokeObjectURL(url); }} className="px-2 py-1 bg-gray-200 rounded text-sm">Export</button>
                 </div>
               </div>
             ))}
           </div>
         </section>
      </div>
    </div>
  );
}

export default App;
