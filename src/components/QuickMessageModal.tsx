import React, { useState, useMemo } from 'react';

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
  job,
  disableEmail = false
}) => {
  const [type, setType] = useState<'sms' | 'email'>(disableEmail ? 'sms' : initialType);
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiOptions, setShowAiOptions] = useState(false);

  const filteredTemplates = useMemo(() => {
    return MESSAGE_TEMPLATES.filter(t => t.type === 'both' || t.type === type);
  }, [type]);

  const applyTemplate = (template: typeof MESSAGE_TEMPLATES[0]) => {
    let text = template.content
      .replace('{clientName}', clientName)
      .replace('{jobNumber}', job?.jobNumber || 'N/A');
    
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
        
        <div 
          
          
          
          className="relative w-full max-w-lg bg-[var(--bg-primary)] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-[var(--brand-gold)]/5 to-transparent">
            <div>
              <h3 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                <Zap size={14} /> Quick Communication
              </h3>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Message {clientName}</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all"
            >
              <X size={24} />
            </button>
          </div>

          {/* AI Drafting Toolbar */}
          <div className="px-8 mt-6 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
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
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-white/10 transition-all whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw size={12} />
                Rewrite with AI
              </button>
              
              
                {showAiOptions && (
                  <div
                    
                    
                    
                    className="absolute left-0 bottom-full mb-2 w-48 bg-[var(--bg-primary)] border border-white/10 rounded-2xl shadow-2xl p-2 z-50"
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
                          className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all text-left group"
                        >
                          <action.icon size={12} className="text-gray-500 group-hover:text-[var(--brand-gold)]" />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-2 bg-white/5 mx-8 mt-6 rounded-2xl border border-white/5">
            <button 
              disabled={type === 'sms' && !clientPhone && !clientName} // Always allow name-based chat if phone is hidden
              onClick={() => setType('sms')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                type === 'sms' ? 'bg-[var(--brand-gold)] text-black shadow-lg' : 'text-gray-500 hover:text-white disabled:opacity-30'
              }`}
            >
              <MessageSquare size={14} /> SMS Text
            </button>
            {!disableEmail && (
              <button 
                disabled={!clientEmail}
                onClick={() => setType('email')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  type === 'email' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white disabled:opacity-30'
                }`}
              >
                <Mail size={14} /> Email
              </button>
            )}
          </div>

          {/* Contact Info Display (Conditional) */}
          {(clientPhone || clientEmail) && (
            <div className="mx-8 mt-4 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg">
                  {type === 'sms' ? <MessageSquare size={12} className="text-[var(--brand-gold)]" /> : <Mail size={12} className="text-blue-500" />}
                </div>
                <div>
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{type === 'sms' ? 'Phone Number' : 'Email Address'}</p>
                  <p className="text-xs font-bold text-white">
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
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <Layout size={12} />
                  <span>Templates</span>
                </div>
                <button 
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/10 transition-all"
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
                      className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[var(--brand-gold)]/30 hover:bg-white/[0.08] transition-all group"
                    >
                      <p className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-[var(--brand-gold)]">{t.title}</p>
                      <p className="text-[9px] text-gray-500 mt-1 line-clamp-1">{t.content}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-gray-500">Recipient</span>
                <span className="text-white">{type === 'sms' ? clientPhone : clientEmail}</span>
              </div>

              <div className="relative">
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={type === 'sms' ? "Type your SMS message..." : "Type your email content..."}
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-medium text-white focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all resize-none shadow-inner"
                />
                {isAiLoading && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-primary)] border border-white/10 rounded-xl shadow-2xl">
                      <RefreshCw size={14} className="text-[var(--brand-gold)] animate-spin" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">AI is thinking...</span>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 right-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                  {content.length} characters
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
              <ShieldCheck size={16} className="text-[var(--brand-gold)] shrink-0" />
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">
                {type === 'sms' 
                  ? "This text will be sent from your business number. History will be saved in the Chat Portal."
                  : "This email will be sent from office@luxurydecking.ca with your signature."}
              </p>
            </div>

            <button 
              onClick={handleSend}
              disabled={!content.trim() || isSending || isSent || isAiLoading}
              className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${
                isSent 
                  ? 'bg-[var(--brand-gold)] text-black' 
                  : type === 'sms' 
                    ? 'bg-[var(--brand-gold)] text-black hover:bg-[var(--brand-gold)]' 
                    : 'bg-blue-600 text-white hover:bg-blue-500'
              } disabled:opacity-50`}
            >
              {isSending ? (
                <div 
                  
                  
                >
                  <Zap size={18} />
                </div>
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
