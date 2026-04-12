import React, { useState } from 'react';

import { Sparkles, Check, ChevronRight, X, Loader2, MessageSquare } from 'lucide-react';
import { Job } from '../types';
import { geminiService } from '../services/geminiService';

interface AISalesAssistantProps {
  job: Job;
}

const GOALS = [
  { id: 'value', label: 'Best Value', icon: '💰' },
  { id: 'maintenance', label: 'Low Maintenance', icon: '🧹' },
  { id: 'premium', label: 'Premium Finish', icon: '✨' },
  { id: 'durability', label: 'Long-term Durability', icon: '🛡️' },
  { id: 'eco', label: 'Eco-Friendly', icon: '🌱' },
  { id: 'heat', label: 'Stays Cool', icon: '☀️' },
];

export const AISalesAssistant: React.FC<AISalesAssistantProps> = ({ job }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const handleGetRecommendation = async () => {
    if (selectedGoals.length === 0) return;
    setIsLoading(true);
    const result = await geminiService.generateHelpMeChoose(job, selectedGoals);
    setRecommendation(result);
    setIsLoading(false);
  };

  const reset = () => {
    setSelectedGoals([]);
    setRecommendation(null);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-6 py-3 bg-[var(--brand-gold)] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[var(--brand-gold)]/20 hover:scale-105 transition-all active:scale-95"
      >
        <Sparkles className="w-4 h-4" />
        Help Me Choose
      </button>

      
        {isOpen && (
          <>
            <div 
              
              
              
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <div 
              
              
              
              className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-ml-[300px] md:w-[600px] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden border border-slate-100"
            >
              <div className="p-8 md:p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                      <Sparkles className="w-5 h-5" />
                      <span className="text-xs font-black uppercase tracking-widest">AI Sales Assistant</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900">Help Me Choose</h3>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                {!recommendation ? (
                  <div className="space-y-8">
                    <p className="text-slate-600 leading-relaxed">
                      Tell us what matters most to you, and our AI assistant will analyze your estimate options to find the perfect fit.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {GOALS.map(goal => (
                        <button
                          key={goal.id}
                          onClick={() => toggleGoal(goal.label)}
                          className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                            selectedGoals.includes(goal.label)
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                              : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                          }`}
                        >
                          <span className="text-xl">{goal.icon}</span>
                          <span className="font-bold text-sm">{goal.label}</span>
                          {selectedGoals.includes(goal.label) && (
                            <Check className="w-4 h-4 ml-auto text-indigo-600" />
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={selectedGoals.length === 0 || isLoading}
                      onClick={handleGetRecommendation}
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analyzing Options...
                        </>
                      ) : (
                        <>
                          Get Recommendation
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="p-8 bg-indigo-50 rounded-3xl border border-indigo-100 italic text-indigo-900 leading-relaxed">
                      {recommendation}
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={reset}
                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                      >
                        Start Over
                      </button>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all"
                      >
                        Got it, thanks!
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xs text-slate-500 font-medium italic">
                  "I'm here to guide you, but the final choice is always yours."
                </p>
              </div>
            </div>
          </>
        )}
      
    </div>
  );
};
