import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function ChatPage() {
  const { matchId } = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [messages, setMessages]     = useState([]);
  const [other, setOther]           = useState(null);
  const [text, setText]             = useState('');
  const [loading, setLoading]       = useState(true);
  const [isTyping, setIsTyping]     = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const [sending, setSending]       = useState(false);
  const bottomRef                   = useRef(null);
  const typingTimeout               = useRef(null);
  const presenceRef                 = useRef(null);

  useEffect(() => {
    init();
    return () => {
      presenceRef.current?.unsubscribe();
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  async function init() {
    setLoading(true);
    try {
      const [msgs, match] = await Promise.all([
        api.get(`/api/messages/${matchId}`),
        api.get(`/api/matches`).then(ms => ms.find(m => m.id === matchId)),
      ]);
      setMessages(msgs || []);
      if (match?.other_profile) setOther(match.other_profile);

      // Mark as read
      api.put(`/api/messages/${matchId}/read`).catch(() => {});

      setupRealtime();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function setupRealtime() {
    // Messages subscription
    supabase.channel(`messages:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, payload => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          if (payload.new.sender_id !== user.id) {
            api.put(`/api/messages/${matchId}/read`).catch(() => {});
          }
          return [...prev, payload.new];
        });
      })
      .subscribe();

    // Typing presence
    const channel = supabase.channel(`typing:${matchId}`, {
      config: { presence: { key: user.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const others = Object.entries(state)
        .filter(([key]) => key !== user.id)
        .flatMap(([, arr]) => arr);
      setIsTyping(others.some(o => o.typing));
    });

    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ typing: false });
      }
    });

    presenceRef.current = channel;
  }

  function handleInput(e) {
    setText(e.target.value);
    if (!presenceRef.current) return;

    presenceRef.current.track({ typing: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      presenceRef.current?.track({ typing: false });
    }, 1500);
  }

  async function send(e) {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    presenceRef.current?.track({ typing: false });

    try {
      const msg = await api.post(`/api/messages/${matchId}`, { content });
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
    } catch (e) { console.error(e); setText(content); }
    finally { setSending(false); }
  }

  async function blockUser() {
    if (!other) return;
    const reason = prompt('Reason for reporting (optional):');
    if (!window.confirm(`Block ${other.name}? This will also remove your match.`)) return;
    try {
      await api.post('/api/blocks', { blocked_id: other.id, reason });
      navigate('/matches');
    } catch (e) { alert(e.message); }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner /></div>;

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={() => navigate('/matches')} className="text-gray-500 text-xl">←</button>
        {other?.photos?.[0]
          ? <img src={other.photos[0]} alt={other.name} className="w-10 h-10 rounded-full object-cover" />
          : <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">👤</div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{other?.name || 'Match'}</p>
          <p className="text-xs text-gray-400">{isTyping ? '✍️ typing...' : other?.age ? `${other.age} years old` : ''}</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(v => !v)} className="text-gray-400 text-xl px-2">⋮</button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44 z-20">
              <button
                onClick={() => { setShowMenu(false); blockUser(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50"
              >🚫 Block & Report</button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">Say hello to {other?.name?.split(' ')[0] || 'your match'}!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine    = msg.sender_id === user.id;
          const isLast  = i === messages.length - 1;
          const showTime = i === 0 || new Date(msg.created_at) - new Date(messages[i-1].created_at) > 300000;

          return (
            <div key={msg.id}>
              {showTime && (
                <p className="text-center text-xs text-gray-400 my-2">{formatTime(msg.created_at)}</p>
              )}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  mine
                    ? 'bg-rose-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                  {/* Read receipt */}
                  {mine && isLast && (
                    <span className="ml-2 text-xs opacity-70">
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white">
        <input
          value={text}
          onChange={handleInput}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(e)}
          placeholder="Message..."
          className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-rose-600 transition-colors"
        >
          {sending ? '…' : '↑'}
        </button>
      </form>
    </div>
  );
}
