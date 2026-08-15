import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Wrench,
  User as UserIcon,
  RefreshCw,
  AlertCircle,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { getChatTicketsApi, getTicketMessagesApi, sendChatMessageApi } from '../../api/chat';
import { ChatTicket, ChatMessage } from '../../types';

interface TicketChatSectionProps {
  userRole: 'OPERATOR' | 'ENGINEER';
}

const ACTIVE_STATUSES = ['IN_PROGRESS', 'RESOLVED', 'NEEDS_REWORK', 'ASSIGNED'];

export const TicketChatSection: React.FC<TicketChatSectionProps> = ({ userRole }) => {
  const [tickets, setTickets] = useState<ChatTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ChatTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const prevMsgCountRef = useRef<number>(0);

  // Fetch ticket chat list
  const fetchTickets = async () => {
    try {
      const data = await getChatTicketsApi();
      setTickets(data);
      if (data.length > 0) {
        setSelectedTicket((prev) => {
          if (!prev) return data[0];
          const exists = data.find((t) => t.id === prev.id);
          return exists || data[0];
        });
      } else {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error('Failed to fetch chat tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Fetch messages for selected ticket
  const fetchMessages = async (ticketId: string, isInitial = false) => {
    try {
      const data = await getTicketMessagesApi(ticketId);
      
      setMessages((prev) => {
        if (data.length !== prev.length || (data.length > 0 && data[data.length - 1].id !== prev[prev.length - 1]?.id)) {
          return data;
        }
        return prev;
      });

      if (isInitial) {
        prevMsgCountRef.current = data.length;
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTickets();
  }, []);

  // Message polling (every 3s)
  useEffect(() => {
    if (!selectedTicket) return;
    setLoadingMessages(true);
    fetchMessages(selectedTicket.id, true);

    const interval = setInterval(() => {
      fetchMessages(selectedTicket.id, false);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

  // Smart scroll: only scroll down when message count increases
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevMsgCountRef.current = messages.length;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim() || sending) return;

    if (!ACTIVE_STATUSES.includes(selectedTicket.status)) {
      alert('Chat is disabled. Chat is active only when ticket work is IN_PROGRESS or RESOLVED.');
      return;
    }

    try {
      setSending(true);
      const text = newMessage;
      setNewMessage('');
      const sentMsg = await sendChatMessageApi(selectedTicket.id, text);
      setMessages((prev) => [...prev, sentMsg]);
      prevMsgCountRef.current += 1;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const isChatActiveForTicket = selectedTicket ? ACTIVE_STATUSES.includes(selectedTicket.status) : false;

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-h-[510px] bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
      {/* Integrated Header Bar: Title + Dropdown Selector */}
      <div className="p-3 bg-slate-900 text-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center space-x-2">
              <span>Ticket Maintenance Chat</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">
              Direct chat between Operator & Engineer for active work tickets
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
          {/* Machine Dropdown */}
          <div className="relative flex-1 sm:w-72">
            <select
              value={selectedTicket?.id || ''}
              onChange={(e) => {
                const found = tickets.find((t) => t.id === e.target.value);
                if (found) {
                  setSelectedTicket(found);
                  prevMsgCountRef.current = 0;
                }
              }}
              disabled={loadingTickets || tickets.length === 0}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-1.5 pr-8 focus:outline-none focus:border-blue-500 transition cursor-pointer appearance-none shadow-xs disabled:opacity-50"
            >
              {loadingTickets ? (
                <option value="">Loading machines...</option>
              ) : tickets.length === 0 ? (
                <option value="">No active IN_PROGRESS or RESOLVED tickets</option>
              ) : (
                tickets.map((t) => {
                  const partner = userRole === 'OPERATOR' ? t.engineer?.name || 'Engineer' : t.operator?.name || 'Operator';
                  return (
                    <option key={t.id} value={t.id}>
                      [{t.ticketNumber}] {t.machineName} ({t.status})
                    </option>
                  );
                })
              )}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={() => {
              setLoadingTickets(true);
              fetchTickets();
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center shrink-0"
            title="Refresh active tickets"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active Ticket Partner Bar */}
      {selectedTicket ? (
        <>
          <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-[10px] shadow-xs">
                {(userRole === 'OPERATOR' ? selectedTicket.engineer?.name : selectedTicket.operator?.name)?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                  <span>
                    {userRole === 'OPERATOR'
                      ? `Eng. ${selectedTicket.engineer?.name || 'Assigned Engineer'}`
                      : `Op. ${selectedTicket.operator?.name || 'Ticket Operator'}`}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {selectedTicket.ticketNumber}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 font-medium flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-700">{selectedTicket.machineName}</span>
                  <span>•</span>
                  <span>{selectedTicket.departmentName}</span>
                </p>
              </div>
            </div>

            {isChatActiveForTicket ? (
              <div className="flex items-center space-x-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                  Active ({selectedTicket.status})
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <Lock className="h-3 w-3 text-amber-600" />
                <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">
                  Locked ({selectedTicket.status})
                </span>
              </div>
            )}
          </div>

          {!isChatActiveForTicket && (
            <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-3 py-1.5 text-[11px] font-semibold flex items-center space-x-2 shrink-0">
              <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                Chat is disabled for ticket <strong>{selectedTicket.ticketNumber}</strong> ({selectedTicket.status}). Chat is active only for IN_PROGRESS or RESOLVED tickets.
              </span>
            </div>
          )}

          {/* Messages Stream (ONLY THIS SCROLLS!) */}
          <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {loadingMessages && messages.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading conversation history...</div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Start the conversation</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Type a message below to discuss repair progress, diagnostics, or work updates for {selectedTicket.machineName}.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isSelf = m.sender?.role === userRole;

                return (
                  <div key={m.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center space-x-1.5 mb-0.5 px-1">
                      <span className="text-[10px] font-bold text-slate-600">
                        {m.sender?.name || (isSelf ? 'You' : 'Partner')}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-xl p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-xs ${
                        isSelf
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Always Visible Fixed Bottom Input Bar */}
          <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-200 bg-white flex items-center space-x-2 shrink-0">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!isChatActiveForTicket}
              placeholder={
                isChatActiveForTicket
                  ? `Type a message to ${userRole === 'OPERATOR' ? selectedTicket.engineer?.name || 'Engineer' : selectedTicket.operator?.name || 'Operator'}...`
                  : 'Chat is locked for closed / inactive tickets'
              }
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white shadow-xs disabled:opacity-50 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || !isChatActiveForTicket}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 text-xs shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sending ? 'Sending...' : 'Send'}</span>
            </button>
          </form>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <AlertCircle className="h-10 w-10 text-slate-300 mb-3" />
          <h4 className="font-bold text-slate-800 text-xs">No Active Machine Ticket Selected</h4>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
            Select an active machine ticket in <span className="font-semibold text-amber-600">IN_PROGRESS</span> or <span className="font-semibold text-blue-600">RESOLVED</span> status from the top dropdown.
          </p>
        </div>
      )}
    </div>
  );
};
