import React from 'react';

export default function QuestionCard({ qIndex, question, selected, onSelect }) {
  if (!question) return null;

  const handleClick = (opt) => {
    onSelect(opt);
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="mb-2 text-lg font-semibold" dangerouslySetInnerHTML={{ __html: `${qIndex + 1}. ${question.prompt}` }} />

      <ul className="space-y-2">
        {question.options.map((opt, i) => {
          const label = String.fromCharCode(65 + i);
          const isSelected = selected === label;
          const isCorrect = label === question.answer;

          let cls = 'p-3 border rounded cursor-pointer';
          if (isSelected) cls += ' bg-blue-100 border-blue-400';
          if (isSelected && isCorrect) cls += ' bg-green-100 border-green-400';
          if (isSelected && !isCorrect) cls += ' bg-red-100 border-red-400';

          return (
            <li key={i} className={cls} onClick={() => handleClick(label)}>
              <div className="font-semibold">{label}. <span dangerouslySetInnerHTML={{ __html: opt }} /></div>
            </li>
          );
        })}
      </ul>

      {selected && (
        <div className="mt-3 p-3 bg-gray-50 border rounded">
          <div><strong>Answer:</strong> {question.answer}</div>
          {question.explanation && <div className="mt-2 text-sm text-gray-700">{question.explanation}</div>}
        </div>
      )}
    </div>
  );
}
