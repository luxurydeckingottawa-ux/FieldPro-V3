import React, { useState, useMemo, useEffect } from 'react';

import { 
  X, 
  Send, 
  MessageSquare, 
  Mail, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  ChevronDown,
  Layout,
  Sparkles,
  RefreshCw,
  Type,
  User,
  Clock,
  Check
} from 'lucide-react';
import { MESSAGE_TEMPLATES } from '../constants';
import { COMPANY } from '../config/company';
import { Job } from '../types';
import { aiCommunicationService, ToneAction } from '../services/aiCommunicationService';

interface QuickMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (type: 'sms' | 'email', content: string) => void;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  initialType?: 'sms' | 'email';
  initialMessage?: string;
  job?: Job;
  disableEmail?: boolean;
}

const QuickMessageModal: React.FC<QuickMessageModalProps> = ({
  isOpen,
  onClose,
  onSend,
  clientName,
  clientPhone,
  clientEmail,
  initialType = 'sms',
  initialMessage = '',
  job,
  disableEmail = false
}) => {
  const [type, setType] = useState<'sms' | 'email'>(disableEmail ? 'sms' : initialType);
  const [content, setContent] = useState(initialMessage);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiOptions, setShowAiOptions] = useState(false);

  // Seed content from initialMessage when modal opens
  useEffect(() => {
    if (isOpen && initialMessage) {
      setContent(initialMessage);
    }
  }, [isOpen, initialMessage]);

  const filteredTemplates = useMemo(() => {
    return MESSAGE_TEMPLATES.filter(t => t.type === 'both' || t.type === type);
  }, [type]);

  const applyTemplate = (template: typeof MESSAGE_TEMPLATES[0]) => {
    let text = template.content
      .replace('{clientName}', clientName)
      .replace('{jobNumber}', job?.jobNumber || 'N/A')
      .replace(/\{companyName\}/g, COMPANY.name);
    
    if (job?.plannedStartDate) {
      text = text.replace('{startDate}', new Date(job.plannedStartDate).toLocaleDateString());
    }
    
    setContent(text);
    setShowTemplates(false);
  };

  const handleAiDraft = async () => {
    if (!job) return;
    setIsAiLoading(true);
    try {
      const draft = await aiCommunicationService.draftMessage(job, type === 'sms' ? 'SMS' : 'Email');
      setContent(draft);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiRewrite = async (action: ToneAction) => {
    if (!content.trim()) return;
    setIsAiLoading(true);
    try {
      const rewritten = await aiCommunicationService.rewriteMessage(content, action);
      setContent(rewritten);
    } finally {
      setIsAiLoading(false);
      setShowAiOptions(false);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    setIsSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSend(type, content);
    setIsSending(false);
    setIsSent(true);
    setTimeout(() => {
      onClose();
      setIsSent(false);
      setContent('');
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div



          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal shell — capped at 90vh and split into header / scrollable body /
            sticky footer so the Send button is always reachable even on short
            laptop viewports. */}
        <div



          className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[2rem] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[var(--border-color)]/60 flex items-center justify-between bg-gradient-to-br from-[var(--brand-gold)]/5 to-transparent shrink-0">
            <div>
              <h3 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                <Zap size={14} /> Quick Communication
              </h3>
              <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Message {clientName}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-secondary)] rounded-xl text-[var(--text-tertiary)] transition-all"
            >
              <X size={24} />
            </button>
          </div>

          {/* Scrollable body — contains everything between header and the
              sticky Send footer. */}
          <div className="flex-1 overflow-y-auto">

          {/* AI Drafting Toolbar */}
          <div className="px-6 mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={handleAiDraft}
              disabled={isAiLoading || !job}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 rounded-xl text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest hover:bg-[var(--brand-gold)]/20 transition-all whitespace-nowrap disabled:opacity-50"
            >
              {isAiLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Draft with AI
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowAiOptions(!showAiOptions)}
                disabled={isAiLoading || !content.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest hover:bg-[var(--bg-secondary)]/80 transition-all whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw size={12} />
                Rewrite with AI
              </button>
              
              
                {showAiOptions && (
                  <div
                    
                    
                    
                    className="absolute left-0 bottom-full mb-2 w-48 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-2 z-50"
                  >
                    <div className="grid grid-cols-1 gap-1">
                      {[
                        { id: 'professional', label: 'Professional', icon: ShieldCheck },
                        { id: 'warmer', label: 'Warmer', icon: User },
                        { id: 'shorter', label: 'Shorter', icon: Type },
                        { id: 'clearer', label: 'Clearer', icon: Sparkles },
                        { id: 'concise', label: 'Concise', icon: Clock },
                        { id: 'grammar', label: 'Fix Grammar', icon: Check },
                      ].map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleAiRewrite(action.id as ToneAction)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-secondary)] rounded-xl transition-all text-left group"
                        >
                          <action.icon size={12} className="text-[var(--text-tertiary)] group-hover:text-[var(--brand-gold)]" />
                          <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest group-hover:text-[var(--text-primary)]">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-2 bg-[var(--bg-secondary)] mx-6 mt-4 rounded-2xl border border-[var(--border-color)]/60">
            <button 
              disabled={type === 'sms' && !clientPhone && !clientName} // Always allow name-based chat if phone is hidden
              onClick={() => setType('sms')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                type === 'sms' ? 'bg-[var(--brand-gold)] text-black shadow-lg' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30'
              }`}
            >
              <MessageSquare size={14} /> SMS Text
            </button>
            {!disableEmail && (
              <button 
                disabled={!clientEmail}
                onClick={() => setType('email')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  type === 'email' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30'
                }`}
              >
                <Mail size={14} /> Email
              </button>
            )}
          </div>

          {/* Contact Info Display (Conditional) */}
          {(clientPhone || clientEmail) && (
            <div className="mx-6 mt-3 p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--bg-secondary)] rounded-lg">
                  {type === 'sms' ? <MessageSquare size={12} className="text-[var(--brand-gold)]" /> : <Mail size={12} className="text-blue-500" />}
                </div>
                <div>
                  <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">{type === 'sms' ? 'Phone Number' : 'Email Address'}</p>
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {type === 'sms' ? (clientPhone || 'Number Hidden') : (clientEmail || 'No Email')}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 rounded-full">
                <span className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-widest">Verified</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                  <Layout size={12} />
                  <span>Templates</span>
                </div>
                <button 
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[9px] font-black uppercase tracking-widest text-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/10 transition-all"
                >
                  Select Template <ChevronDown size={12} className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showTemplates && (
                <div 
                  
                  
                  className="grid grid-cols-1 gap-2 overflow-hidden"
                >
                  {filteredTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="w-full text-left p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]/60 hover:border-[var(--brand-gold)]/30 hover:bg-[var(--bg-secondary)]/90 transition-all group"
                    >
                      <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest group-hover:text-[var(--brand-gold)]">{t.title}</p>
                      <p className="text-[9px] text-[var(--text-tertiary)] mt-1 line-clamp-1">{t.content}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-[var(--text-tertiary)]">Recipient</span>
                <span className="text-[var(--text-primary)]">{type === 'sms' ? clientPhone : clientEmail}</span>
              </div>

              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={type === 'sms' ? "Type your SMS message..." : "Type your email content..."}
                  className="w-full h-32 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all resize-none shadow-inner"
                />
                {isAiLoading && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl">
                      <RefreshCw size={14} className="text-[var(--brand-gold)] animate-spin" />
                      <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">AI is thinking...</span>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 right-4 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">
                  {content.length} characters
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]/60">
              <ShieldCheck size={14} className="text-[var(--brand-gold)] shrink-0" />
              <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest leading-relaxed">
                {type === 'sms'
                  ? "Sent from your business number. History saved in Chat Portal."
                  : "Sent from office@luxurydecking.ca with your signature."}
              </p>
            </div>
          </div>
          {/* /scrollable body */}
          </div>

          {/* Sticky footer — Send button always visible regardless of viewport
              height. Sits OUTSIDE the scrollable body. */}
          <div className="px-6 py-4 border-t border-[var(--border-color)]/60 bg-[var(--bg-primary)] shrink-0">
            <button
              onClick={handleSend}
              disabled={!content.trim() || isSending || isSent || isAiLoading}
              className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${
                isSent
                  ? 'bg-[var(--brand-gold)] text-black'
                  : type === 'sms'
                    ? 'bg-[var(--brand-gold)] text-black hover:bg-[var(--brand-gold)]'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
              } disabled:opacity-50`}
            >
              {isSending ? (
                <Zap size={18} />
              ) : isSent ? (
                <>
                  <CheckCircle2 size={18} /> Message Sent
                </>
              ) : (
                <>
                  <Send size={18} /> Send {type === 'sms' ? 'SMS' : 'Email'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

  );
};

export default QuickMessageModal;
