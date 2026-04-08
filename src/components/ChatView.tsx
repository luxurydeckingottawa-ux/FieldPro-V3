import React, { useState, useMemo } from 'react';

import { 
  Search, 
  MessageSquare, 
  Send, 
  Mail, 
  CheckCheck, 
  Check, 
  MoreVertical,
  Activity,
  Phone,
  Calendar,
  MapPin,
  User as UserIcon,
  ChevronRight,
  Clock,
  Sparkles,
  RefreshCw,
  FileText
} from 'lucide-react';
import { ChatSession, User as AppUser, Job, Role } from '../types';
import { format } from 'date-fns';
import { aiCommunicationService } from '../services/aiCommunicationService';


interface ChatViewProps {
  sessions: ChatSession[];
  currentUser: AppUser;
  jobs: Job[];
  onSendMessage: (sessionId: string, text: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ sessions, currentUser, jobs, onSendMessage }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessions[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchesSearch = s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || s.unreadCount > 0;
      return matchesSearch && matchesFilter;
    });
  }, [sessions, searchTerm, filter]);

  const selectedSession = useMemo(() => 
    sessions.find(s => s.id === selectedSessionId), 
    [sessions, selectedSessionId]
  );

  const selectedJob = useMemo(() => {
    if (!selectedSession) return null;
    return jobs.find(j => j.id === selectedSession.jobId);
  }, [jobs, selectedSession]);

  const handleSend = () => {
    if (!newMessage.trim() || !selectedSessionId) return;
    onSendMessage(selectedSessionId, newMessage);
    setNewMessage('');
  };

  const isOfficeUser = currentUser.role === Role.ADMIN;

  const handleSummarize = async () => {
    if (!selectedSession) return;
    setIsAiLoading(true);
    try {
      const result = await aiCommunicationService.summarizeConversation(selectedSession.messages);
      setSummary(result);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSuggestReply = async () => {
    if (!selectedSession || !selectedJob) return;
    setIsAiLoading(true);
    try {
      const result = await aiCommunicationService.suggestReply(selectedSession.messages, selectedJob);
      setSuggestedReply(result);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Sidebar: Session List */}
      <div className="w-80 border-r border-[var(--border-color)] flex flex-col bg-[var(--bg-primary)] z-10 shrink-0">
        <div className="p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--brand-gold)]/10 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[var(--brand-gold)]" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white uppercase tracking-tight italic">Chat Portal</h1>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Customer SMS History</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <button 
                onClick={() => setFilter('all')}
                className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${filter === 'all' ? 'bg-[var(--brand-gold)] text-black' : 'text-gray-500 hover:text-white'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('unread')}
                className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${filter === 'unread' ? 'bg-[var(--brand-gold)] text-black' : 'text-gray-500 hover:text-white'}`}
              >
                Unread
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredSessions.map(session => (
            <button
              key={session.id}
              onClick={() => setSelectedSessionId(session.id)}
              className={`w-full p-4 flex gap-4 transition-all border-b border-white/[0.02] hover:bg-white/[0.02] relative ${
                selectedSessionId === session.id ? 'bg-white/[0.05] border-l-4 border-l-[var(--brand-gold)]' : ''
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-black text-lg shadow-lg">
                  {session.clientName.charAt(0)}
                </div>
                {session.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--brand-gold)] rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center text-[10px] font-black text-black">
                    {session.unreadCount}
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-black text-sm text-white truncate uppercase tracking-tight">{session.clientName}</h3>
                  <span className="text-[9px] font-black text-gray-500 uppercase">
                    {session.lastMessageTimestamp ? format(new Date(session.lastMessageTimestamp), 'h:mm a') : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500 truncate font-medium flex-1">
                    {session.lastMessage || 'No messages yet'}
                  </p>
                  {jobs.find(j => j.id === session.jobId) && (
                    <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-md text-[7px] font-black text-gray-500 uppercase tracking-widest shrink-0">
                      Stage {jobs.find(j => j.id === session.jobId)!.currentStage + 1}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)] relative border-r border-[var(--border-color)]">
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--brand-gold)]/20 to-[var(--brand-gold)]/5 flex items-center justify-center text-[var(--brand-gold)] font-black text-xl border border-[var(--brand-gold)]/20 shadow-lg">
                  {selectedSession.clientName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight italic">{selectedSession.clientName}</h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    {isOfficeUser && selectedSession.clientPhone && (
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <Phone size={10} /> {selectedSession.clientPhone}
                      </span>
                    )}
                    {isOfficeUser && selectedSession.clientPhone && <span className="w-1 h-1 rounded-full bg-gray-700" />}
                    <span className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest flex items-center gap-1">
                      <Activity size={10} /> Active SMS Session
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isOfficeUser && (
                  <>
                    <button className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all">
                      <Phone size={20} />
                    </button>
                    <button className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all">
                      <Mail size={20} />
                    </button>
                  </>
                )}
                <button 
                  onClick={handleSummarize}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 rounded-lg text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest hover:bg-[var(--brand-gold)]/20 transition-all disabled:opacity-50"
                >
                  {isAiLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  AI Summary
                </button>
                <button className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* AI Summary Panel (Conditional) */}
            
              {summary && (
                <div
                  
                  
                  
                  className="mx-8 mt-4 bg-[var(--brand-gold)]/5 border border-[var(--brand-gold)]/10 rounded-2xl overflow-hidden"
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className="p-2 bg-[var(--brand-gold)]/10 rounded-lg shrink-0">
                      <FileText size={14} className="text-[var(--brand-gold)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em]">AI Conversation Summary</h4>
                        <button onClick={() => setSummary(null)} className="text-gray-500 hover:text-white transition-all">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 font-medium leading-relaxed whitespace-pre-wrap">
                        {summary}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar flex flex-col-reverse">
              <div className="space-y-6">
                {selectedSession.messages.map((msg) => (
                  <div
                    key={msg.id}
                    
                    
                    className={`flex ${msg.isFromClient ? 'justify-start' : 'justify-end'}`}
                  >
                      <div className={`max-w-[70%] flex flex-col ${msg.isFromClient ? 'items-start' : 'items-end'}`}>
                        <div className={`px-5 py-3 rounded-[1.5rem] text-sm font-medium shadow-lg ${
                          msg.isFromClient 
                            ? 'bg-white/5 border border-white/10 text-white rounded-bl-none' 
                            : 'bg-[var(--brand-gold)] text-black font-bold rounded-br-none'
                        }`}>
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 px-1">
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                            {format(new Date(msg.timestamp), 'h:mm a')}
                          </span>
                          {!msg.isFromClient && (
                            <span className="text-[var(--brand-gold)]">
                              {msg.status === 'read' ? <CheckCheck size={12} /> : <Check size={12} />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Quick Templates */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                  <button
                    onClick={handleSuggestReply}
                    disabled={isAiLoading}
                    className="px-3 py-1.5 bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 rounded-full text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest hover:bg-[var(--brand-gold)]/20 transition-all shrink-0 flex items-center gap-2"
                  >
                    {isAiLoading ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    Suggest Reply
                  </button>
                  {['Confirm Start', 'Material Update', 'Schedule Delay', 'Review Request'].map(t => (
                    <button
                      key={t}
                      onClick={() => setNewMessage(prev => prev + (prev ? ' ' : '') + t + ': ')}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-[var(--brand-gold)]/10 hover:text-[var(--brand-gold)] hover:border-[var(--brand-gold)]/30 transition-all shrink-0"
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* AI Suggested Reply (Conditional) */}
                
                  {suggestedReply && (
                    <div
                      
                      
                      
                      className="p-4 bg-white/5 border border-white/10 rounded-2xl relative group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles size={12} className="text-[var(--brand-gold)]" />
                          <span className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest">AI Suggested Reply</span>
                        </div>
                        <button onClick={() => setSuggestedReply(null)} className="text-gray-500 hover:text-white transition-all">
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 font-medium leading-relaxed mb-3 italic">"{suggestedReply}"</p>
                      <button
                        onClick={() => {
                          setNewMessage(suggestedReply);
                          setSuggestedReply(null);
                        }}
                        className="px-3 py-1.5 bg-[var(--brand-gold)] text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[var(--brand-gold)] transition-all"
                      >
                        Use This Reply
                      </button>
                    </div>
                  )}
                

                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      placeholder={`Message ${selectedSession.clientName}...`}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all text-white pr-12 shadow-inner"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!newMessage.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[var(--brand-gold)] text-black rounded-xl hover:bg-[var(--brand-gold)] transition-all disabled:opacity-50 disabled:hover:bg-[var(--brand-gold)] shadow-lg"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-center text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mt-4">
                SMS messages are sent from (343) 314-4019
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-gray-600 mb-6 border border-white/5">
              <MessageSquare size={40} />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Select a Conversation</h2>
            <p className="text-sm text-gray-500 max-w-xs mt-2 font-medium">
              Choose a customer from the list to view their SMS history and send messages.
            </p>
          </div>
        )}
      </div>

      {/* Right Panel: Job Context */}
      <div className="w-80 bg-[var(--bg-primary)] p-6 overflow-y-auto custom-scrollbar shrink-0">
        {selectedJob ? (
          <div className="space-y-8">
            <div>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Job Context</h3>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[var(--brand-gold)]/10 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-[var(--brand-gold)]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Current Stage</p>
                    <p className="text-sm font-black text-white uppercase tracking-tight italic">Stage {selectedJob.currentStage + 1}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-400">
                    <Calendar size={14} className="shrink-0" />
                    <span className="text-xs font-medium truncate">{selectedJob.scheduledDate}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <MapPin size={14} className="shrink-0" />
                    <span className="text-xs font-medium truncate">{selectedJob.projectAddress}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <UserIcon size={14} className="shrink-0" />
                    <span className="text-xs font-medium truncate">{selectedJob.assignedCrewOrSubcontractor}</span>
                  </div>
                </div>
                <button className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  View Full Job <ChevronRight size={12} />
                </button>
              </div>
            </div>

            {isOfficeUser && (
              <div>
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Client Details</h3>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Phone</span>
                    <span className="text-sm font-bold text-white">{selectedJob.clientPhone || 'Not provided'}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Email</span>
                    <span className="text-sm font-bold text-white truncate">{selectedJob.clientEmail || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-gold)] mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white leading-snug">Message sent to client</p>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Today at 10:30 AM</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-700 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 leading-snug">Job moved to Stage 3</p>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Yesterday</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
            <Clock size={40} className="text-gray-500 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">No Context</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
