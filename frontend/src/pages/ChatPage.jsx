import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

function timeStr(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const { matchId }  = useParams();
  const { profile }  = useAuth();
  const navigate     = useNavigate();

  const [messages, setMessages] = useState([]);
  const [other, setOther]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);

  // Load messages and match info
  const loadMessages = useCallback(async () => {
    try {
      const [msgs, matchData] = await Promise.all([
        api.get(`/api/messages/${matchId}`),
        api.get('/api/matches').then((list) => list.find((m) => m.id === matchId)),
      ]);
      setMessages(msgs);
      if (matchData) setOther(matchData.match);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [matchId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    // Optimistic update
    const temp = {
      id: `temp-${Date.now()}`,
      sender_id: profile.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);

    try {
      await api.post(`/api/messages/${matchId}`, { content });
    } catch (err) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setText(content);
      console.error(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Spinner size={10} />
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <button
          onClick={() => navigate('/matches')}
          className="text-slate-400 hover:text-white transition-colors p-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
          {other?.photos?.[0] ? (
            <img src={other.photos[0]} alt={other.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
          )}
        </div>

        <div>
          <p className="font-semibold text-white">{other?.name || 'Your match'}</p>
          <p className="text-xs text-green-400">● Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👋</p>
            <p className="text-slate-400">You matched! Say hello to {other?.name}.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === profile.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[78%]">
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? 'bg-flame text-white rounded-br-sm'
                      : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                  } ${msg.id.startsWith('temp') ? 'opacity-70' : ''}`}
                >
                  {msg.content}
                </div>
                <p className={`text-xs text-slate-500 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                  {timeStr(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={send}
        className="flex items-end gap-2 p-4 bg-slate-800 border-t border-slate-700 flex-shrink-0"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
          placeholder={`Message ${other?.name || ''}…`}
          rows={1}
          className="flex-1 input resize-none py-2.5 text-sm max-h-28"
          style={{ overflow: 'hidden' }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full bg-flame flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-all active:scale-90"
        >
          {sending ? (
            <Spinner size={4} color="border-white" />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
