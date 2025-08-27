import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import './index.css';
import QuestionCard from './components/QuestionCard';
import QuizSummary from './components/QuizSummary';
import { generateQuestions, shuffleArray, exportToJSON } from './utils';

// 🔹 Render backend URL
const API_BASE = "https://ai-mcq-5c6u.onrender.com/api";  

function App() {
  const [topic, setTopic] = useState('python');
  const [subtopics, setSubtopics] = useState('');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [useBackend, setUseBackend] = useState(true); // default ON → backend first
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

  // 🔹 Load history (backend preferred, fallback to localStorage)
  useEffect(() => {
    if (useBackend) {
      axios.get(`${API_BASE}/history`)
        .then(res => setHistory(res.data.history || []))
        .catch(err => {
          console.warn("Backend history fetch failed, using local storage", err);
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

  // 🔹 Dark mode handling
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
        // Backend: generate from text
        try {
          const payload = { text: sourceText, count };
          const res = await axios.post(`${API_BASE}/generate-from-text`, payload);
          qs = res.data.questions || [];
        } catch (e) {
          console.warn('Backend text-generation failed, using local generator', e);
          qs = generateQuestions({ topic, subtopics, difficulty, count });
        }
      } else if (useBackend) {
        // Backend: generate by topic
        try {
          const payload = { topic, count };
          const res = await axios.post(`${API_BASE}/generate`, payload);
          qs = res.data.questions || [];
        } catch (e) {
          console.warn('Backend generation failed, using local generator', e);
          qs = generateQuestions({ topic, subtopics, difficulty, count });
        }
      } else {
        // Local generator
        qs = generateQuestions({ topic, subtopics, difficulty, count });
      }

      if (shuffleQuestions) qs = shuffleArray(qs);
      setQuestions(qs);

      // 🔹 Save history
      const entry = { 
        id: Date.now(), 
        topic, 
        subtopics, 
        difficulty, 
        count, 
        questions: qs, 
        createdAt: new Date().toISOString() 
      };

      if (!useBackend) {
        // Local history
        const qHash = JSON.stringify(qs);
        let newHist = [...history];
        const existingIndex = newHist.findIndex(
          h => h.topic === topic && JSON.stringify(h.questions) === qHash
        );
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
        // Backend handles persistence
        axios.get(`${API_BASE}/history`)
          .then(res => setHistory(res.data.history || []))
          .catch(() => {});
      }

      // Last quiz
      localStorage.setItem(
        'mcq_last_quiz', 
        JSON.stringify({ topic, subtopics, difficulty, count, questions: qs })
      );

      // Scroll to first question
      setTimeout(() => { 
        if (questionRef.current) {
          questionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
        }
      }, 200);

    } catch (err) {
      console.error(err);
      alert('Failed to generate questions. Check console.');
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Rendering logic will stay unchanged
}

export default App;
