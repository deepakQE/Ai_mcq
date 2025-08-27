import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import './index.css';
import QuestionCard from './components/QuestionCard';
import QuizSummary from './components/QuizSummary';
import { generateQuestions, shuffleArray } from './utils';

// 🔹 Render backend URL
const API_BASE = "https://ai-mcq-5c6u.onrender.com/api";  

function App() {
  const [topic, setTopic] = useState('python');
  const [subtopics, setSubtopics] = useState('');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [useBackend, setUseBackend] = useState(true); 
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [useLLM, setUseLLM] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mcq_dark') === '1');
  const questionRef = useRef(null);
  const [history, setHistory] = useState([]);

  // 🔹 Load history
  useEffect(() => {
    if (useBackend) {
      axios.get(`${API_BASE}/history`)
        .then(res => setHistory(res.data.history || []))
        .catch(() => {
          try {
            setHistory(JSON.parse(localStorage.getItem('mcq_history') || '[]'));
          } catch {
            setHistory([]);
          }
        });
    } else {
      try {
        setHistory(JSON.parse(localStorage.getItem('mcq_history') || '[]'));
      } catch {
        setHistory([]);
      }
    }
  }, [useBackend]);

  // 🔹 Dark mode
  useEffect(() => {
    const classes = ['theme-meditation', 'dark-mode'];
    classes.forEach(c => document.body.classList.remove(c));
    document.body.classList.add('theme-meditation');
    if (darkMode) document.body.classList.add('dark-mode');
    localStorage.setItem('mcq_dark', darkMode ? '1' : '0');
  }, [darkMode]);

  // 🔹 Generate questions
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
        try {
          const payload = { text: sourceText, count };
          const res = await axios.post(`${API_BASE}/generate-from-text`, payload);
          qs = res.data.questions || [];
        } catch {
          qs = generateQuestions({ topic, subtopics, difficulty, count });
        }
      } else if (useBackend) {
        try {
          const payload = { topic, count };
          const res = await axios.post(`${API_BASE}/generate`, payload);
          qs = res.data.questions || [];
        } catch {
          qs = generateQuestions({ topic, subtopics, difficulty, count });
        }
      } else {
        qs = generateQuestions({ topic, subtopics, difficulty, count });
      }

      if (shuffleQuestions) qs = shuffleArray(qs);
      setQuestions(qs);

      // save history
      const entry = { id: Date.now(), topic, subtopics, difficulty, count, questions: qs, createdAt: new Date().toISOString() };
      if (!useBackend) {
        let newHist = [...history];
        const qHash = JSON.stringify(qs);
        const existingIndex = newHist.findIndex(h => h.topic === topic && JSON.stringify(h.questions) === qHash);
        if (existingIndex !== -1) {
          const existing = newHist.splice(existingIndex, 1)[0];
          existing.createdAt = entry.createdAt;
          newHist.unshift(existing);
        } else {
          newHist = [entry, ...newHist];
        }
        newHist = newHist.slice(0, 50);
        setHistory(newHist);
        localStorage.setItem('mcq_history', JSON.stringify(newHist));
      } else {
        axios.get(`${API_BASE}/history`).then(res => setHistory(res.data.history || []));
      }

      localStorage.setItem('mcq_last_quiz', JSON.stringify({ topic, subtopics, difficulty, count, questions: qs }));

      setTimeout(() => {
        if (questionRef.current) {
          questionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);

    } catch (err) {
      console.error(err);
      alert('Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Render UI
  return (
    <div className="App">
      <h1>AI MCQ Generator</h1>

      <div className="controls">
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic (e.g. Python)" />
        <input value={subtopics} onChange={e => setSubtopics(e.target.value)} placeholder="Subtopics" />
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
          <option>Mixed</option>
        </select>
        <input type="number" value={count} onChange={e => setCount(e.target.value)} min="1" max="20" />
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {questions.length > 0 && (
        <div ref={questionRef}>
          {questions.map((q, i) => (
            <QuestionCard
              key={i}
              question={q}
              index={i}
              selectedAnswer={answers[i]}
              setAnswers={setAnswers}
            />
          ))}
        </div>
      )}

      {showSummary && (
        <QuizSummary questions={questions} answers={answers} />
      )}
    </div>
  );
}

export default App;
