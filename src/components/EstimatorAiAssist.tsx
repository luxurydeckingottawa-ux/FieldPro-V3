import React, { useState } from 'react';
import { AiFlag, EstimatorIntake } from '../types';
import { 
  Sparkles, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  RefreshCw,
  Search,
  FileText,
  Camera,
  PenTool,
  Loader2
} from 'lucide-react';

import { estimatorAiService } from '../services/estimatorAiService';

interface EstimatorAiAssistProps {
  intake: EstimatorIntake;
  onUpdateAiInsights: (updates: Partial<EstimatorIntake['aiInsights']>) => void;
}

const EstimatorAiAssist: React.FC<EstimatorAiAssistProps> = ({ intake, onUpdateAiInsights }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const [missingFlags, mismatchFlags, photoFlags] = await Promise.all([
        estimatorAiService.detectMissingInfo(intake),
        estimatorAiService.crossCheckSketchAndQuantities(intake),
        estimatorAiService.getPhotoReminders(intake)
      ]);

      const allFlags = [...missingFlags, ...mismatchFlags, ...photoFlags];
      onUpdateAiInsights({
        flags: allFlags,
        lastCheckedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("AI Analysis failed:", err);
      setError(err.message || "AI Analysis failed. Please check your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSummarizeNotes = async () => {
    if (!intake.notes.trim()) return;
    setIsSummarizing(true);
    setError(null);
    try {
      const summary = await estimatorAiService.summarizeSiteNotes(intake.notes);
      onUpdateAiInsights({ summary });
    } catch (err: any) {
      console.error("AI Summarization failed:", err);
      setError(err.message || "AI Summarization failed. Please check your API key.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const flags = intake.aiInsights?.flags || [];
  const summary = intake.aiInsights?.summary;

  const getCategoryIcon = (category: AiFlag['category']) => {
    switch (category) {
      case 'intake': return <Search className="w-4 h-4" />;
      case 'measures': return <FileText className="w-4 h-4" />;
      case 'sketch': return <PenTool className="w-4 h-4" />;
      case 'photos': return <Camera className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: AiFlag['severity']) => {
    switch (severity) {
      case 'high': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center justify-center gap-2 p-4 bg-[var(--brand-gold)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--brand-gold)]/20 hover:bg-[var(--brand-gold-dark)] transition-all disabled:opacity-50"
        >
          {isAnalyzing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {isAnalyzing ? 'Analyzing...' : 'Run AI Audit'}
        </button>

        <button
          onClick={handleSummarizeNotes}
          disabled={isSummarizing || !intake.notes.trim()}
          className="flex items-center justify-center gap-2 p-4 bg-white border-2 border-[var(--brand-gold)] text-[var(--brand-gold)] rounded-2xl font-bold hover:bg-[var(--brand-gold)]/5 transition-all disabled:opacity-50"
        >
          {isSummarizing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5" />
          )}
          {isSummarizing ? 'Summarizing...' : 'Summarize Notes'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-600">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">AI Error</p>
            <p className="opacity-80 leading-tight">{error}</p>
          </div>
        </div>
      )}

      {/* AI Insights Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brand-gold)]" />
            AI Estimator Assist
          </h3>
          {intake.aiInsights?.lastCheckedAt && (
            <span className="text-[10px] text-[var(--text-secondary)]">
              Last check: {new Date(intake.aiInsights.lastCheckedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        
          {flags.length > 0 ? (
            <div className="space-y-3">
              {flags.map((flag, index) => (
                <div
                  key={`${flag.id}-${index}`}
                  
                  
                  
                  className={`p-4 rounded-2xl border flex gap-3 ${getSeverityColor(flag.severity)}`}
                >
                  <div className="mt-0.5">
                    {flag.severity === 'high' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 flex items-center gap-1">
                        {getCategoryIcon(flag.category)}
                        {flag.category}
                      </span>
                      {flag.type === 'mismatch' && (
                        <span className="text-[10px] bg-white/50 px-1.5 py-0.5 rounded font-bold uppercase">Mismatch</span>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-tight">{flag.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : !isAnalyzing && intake.aiInsights?.lastCheckedAt ? (
            <div className="p-8 bg-[var(--brand-gold)]/5 rounded-3xl border border-[var(--brand-gold)]/10 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-[var(--brand-gold)]" />
              </div>
              <div>
                <p className="font-bold text-[#4A3E10]">Intake Looks Solid</p>
                <p className="text-sm text-[#8B7520] opacity-80">AI didn't find any obvious missing items or mismatches.</p>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-[var(--bg-secondary)] rounded-3xl border border-dashed border-[var(--border-color)] flex flex-col items-center text-center gap-3">
              <Sparkles className="w-8 h-8 text-[var(--text-secondary)] opacity-30" />
              <p className="text-sm text-[var(--text-secondary)]">Run AI Audit to check for missing info or mismatches.</p>
            </div>
          )}
        

        {/* AI Summary Card */}
        {summary && (
          <div
            
            
            className="bg-white p-6 rounded-3xl border border-[var(--border-color)] shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2 text-[var(--brand-gold)]">
              <FileText className="w-5 h-5" />
              <h4 className="font-bold">AI Site Summary</h4>
            </div>
            <div className="prose prose-sm max-w-none text-[var(--text-primary)]">
              <div className="whitespace-pre-wrap leading-relaxed opacity-90">
                {summary}
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border-color)] flex justify-end">
              <button 
                onClick={() => onUpdateAiInsights({ summary: undefined })}
                className="text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:opacity-70"
              >
                Clear Summary
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimatorAiAssist;
