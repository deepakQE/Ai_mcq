// Simple local question generator for offline use
export function generateQuestions({ topic = 'General', subtopics = '', difficulty = 'Mixed', count = 5 }) {
  const base = [
    {
      prompt: `Which of the following is NOT a core data type in ${topic}?`,
      options: ['Integer', 'Float', 'Boolean', 'Character'],
      answer: 'D',
      explanation: `${topic} uses 'string' to represent sequences of characters, not a dedicated 'character' type.`
    },
    {
      prompt: 'What is the output of the following code snippet: `print(type(5/2))`?',
      options: ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'bool'>"],
      answer: 'B',
      explanation: 'Division in Python 3 results in a float.'
    },
    {
      prompt: 'Which keyword is used to create a function in Python?',
      options: ['def', 'func', 'function', 'lambda'],
      answer: 'A',
      explanation: 'Use def to define functions.'
    },
  ];

  const out = [];
  for (let i = 0; i < count; i++) {
    const q = base[i % base.length];
    // shallow clone
    const cloned = { ...q, options: [...q.options] };
    // shuffle options
    cloned.options = shuffleArray(cloned.options);
    // recompute answer label
    const ansIndex = cloned.options.findIndex(o => o === q.options[q.answer.charCodeAt(0) - 65]);
    cloned.answer = String.fromCharCode(65 + ansIndex);
    out.push(cloned);
  }
  return out;
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function exportToJSON(data, filename = 'export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
