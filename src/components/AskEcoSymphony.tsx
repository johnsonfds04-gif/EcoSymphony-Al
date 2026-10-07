import React, { useState } from 'react';
import { MessageSquare, Send, Database, HelpCircle } from 'lucide-react';
import { WasteIncident } from '../types';
import { answerQuestionFromStoredData } from '../utils/priorityEngine';

interface AskEcoSymphonyProps {
  incidents: WasteIncident[];
  isDemoMode: boolean;
}

const EXAMPLE_QUESTIONS = [
  'Which waste type is most common?',
  'Which location has the most reports?',
  'How many reports are still pending?',
  'Which incidents should be handled first?',
];

interface ChatTurn {
  question: string;
  answer: string;
  timestamp: string;
}

export const AskEcoSymphony: React.FC<AskEcoSymphonyProps> = ({
  incidents,
  isDemoMode,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>(() => [
    {
      question: 'Which incidents should be handled first?',
      answer: answerQuestionFromStoredData('Which incidents should be handled first?', incidents),
      timestamp: 'Initial Dataset Summary',
    },
  ]);

  const handleAsk = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setInput('');

    let answer = '';
    try {
      const response = await fetch('/api/ask-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          incidents,
          dataMode: isDemoMode ? 'DEMO DATA' : 'USER REPORTS',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        answer = data.answer || answerQuestionFromStoredData(trimmed, incidents);
      } else {
        answer = answerQuestionFromStoredData(trimmed, incidents);
      }
    } catch {
      answer = answerQuestionFromStoredData(trimmed, incidents);
    } finally {
      setIsLoading(false);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      setHistory((prev) => [
        {
          question: trimmed,
          answer,
          timestamp: timeStr,
        },
        ...prev,
      ]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">
              Ask EcoSymphony AI (Stored-Data Dashboard Assistant)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Answers strictly using the {incidents.length} incident record(s) stored in this application. Returns &ldquo;Insufficient data.&rdquo; if information is not in the dataset.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-700" />
          <span>Grounded in {incidents.length} records</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Try asking:</span>
        </span>
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleAsk(q)}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg border border-slate-200 transition-colors whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the stored waste reports..."
          className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isLoading ? 'Querying...' : 'Ask AI'}</span>
        </button>
      </form>

      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {history.map((turn, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1.5"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-800">Q: {turn.question}</span>
              <span className="font-mono text-[11px]">{turn.timestamp}</span>
            </div>
            <p className="text-slate-700 leading-relaxed">{turn.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
