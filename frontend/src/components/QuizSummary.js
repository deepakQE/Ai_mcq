import React from 'react';

export default function QuizSummary({ questions, answers, onRestart }) {
  const score = questions.reduce((acc, q, idx) => acc + (answers[idx] === q.answer ? 1 : 0), 0);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-2xl font-semibold mb-2">Quiz Summary</h2>
      <div className="mb-4">Score: <strong>{score}</strong> / {questions.length}</div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={idx} className="p-3 border rounded">
            <div className="font-semibold mb-1" dangerouslySetInnerHTML={{ __html: `${idx + 1}. ${q.prompt}` }} />
            <div className="text-sm mb-2">Your answer: {answers[idx] || '—'}. Correct: {q.answer}</div>
            {q.explanation && <div className="text-sm text-gray-700">{q.explanation}</div>}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => { onRestart(); }} className="px-3 py-1 bg-blue-600 text-white rounded">Start New</button>
        <button onClick={() => { const data = { questions, answers, createdAt: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'quiz_results.json'; a.click(); URL.revokeObjectURL(url); }} className="px-3 py-1 bg-gray-200 rounded">Export Results</button>
      </div>
    </div>
  );
}
