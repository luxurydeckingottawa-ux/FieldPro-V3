import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Sparkles, Send, Loader2, Info, ArrowRight } from 'lucide-react';
import { Job } from '../types';
import { geminiService } from '../services/geminiService';

interface AIObjectionHelperProps {
  job: Job;
}

const COMMON_QUESTIONS = [
  "Why does the Signature option cost more?",
  "What is the difference between Composite and PVC?",
  "How long will the project take?",
  "What happens after I accept the proposal?",
  "Why is weather a factor in scheduling?",
  "What upgrades are worth considering for my deck?"
];

export const AIObjectionHelper: React.FC<AIObjectionHelperProps> = ({ job }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (q: string) => {
    setQuestion(q);
    setIsLoading(true);
    const result = await geminiService.answerObjection(job, q);
    setAnswer(result);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setIsLoading(true);
    const result = await geminiService.answerObjection(job, question);
    setAnswer(result);
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <MessageSquare className="w-32 h-32 text-slate-900" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 text-indigo-600 mb-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">AI Sales Copilot</span>
        </div>
        <h3 className="text-3xl font-black text-slate-900 mb-4">Have Questions?</h3>
        <p className="text-slate-600 text-sm mb-10 max-w-xl leading-relaxed">
          Get instant, helpful answers about your estimate, materials, and our process. 
          Our AI assistant is trained on our build standards and project workflows.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Common Questions</p>
            <div className="space-y-3">
              {COMMON_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleAsk(q)}
                  className="w-full text-left p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all group flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-900">{q}</span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col h-full">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ask Anything</p>
            <div className="flex-grow flex flex-col">
              <form onSubmit={handleSubmit} className="relative mb-6">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 pr-16 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>

              <AnimatePresence mode="wait">
                {answer ? (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-8 bg-indigo-50 rounded-3xl border border-indigo-100 flex-grow"
                  >
                    <div className="flex items-center gap-2 text-indigo-600 mb-3">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">AI Answer</span>
                    </div>
                    <p className="text-sm text-indigo-900 leading-relaxed italic">
                      {answer}
                    </p>
                    <button 
                      onClick={() => { setAnswer(null); setQuestion(''); }}
                      className="mt-6 text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                    >
                      Clear Answer
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-100 rounded-3xl flex-grow text-center"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Info className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium italic">
                      Select a common question or type your own above.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
