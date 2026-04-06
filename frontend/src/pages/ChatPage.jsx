import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import Spinner from '../components/Spinner';

const REACTIONS = ['❤️','😂','😮','😢','👏','🔥'];
const TENOR_KEY = 'AIzaSyAyimkuYQYF_y2l4HmMGSy4KBl7AUd9MkA'; // public demo key

export default function ChatPage() {
  const { matchId } = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { initiateCall, callState } = useCall();

  const [messages, setMessages]       = useState([]);
  const [other, setOther]             = useState(null);
  const [text, setText]               = useState('');
  const [loading, setLoading]         = useState(true);
  const [isTyping, setIsTyping]       = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const [sending, setSending]         = useState(false);
  const [reactionFor, setReactionFor] = useState(null); // messageId
  const [showGifs, setShowGifs]       = useState(false);
  const [gifQuery, setGifQuery]       = useState('');
  const [gifs, setGifs]               = useState([]);
  const [gifLoading, setGifLoading]   = useState(false);
  const bottomRef   = useRef(null);
  const typingTimeout  = useRef(null);
  const presenceRef    = useRef(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    init();
    return () => { presenceRef.current?.unsubscribe(); };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  async function init() {
    setLoading(true);
    try {
      const [msgs, allMatches] = await Promise.all([
        api.get(`/api/messages/${matchId}`),
        api.get('/api/matches'),
      ]);
      setMessages(msgs || []);
      const match = allMatches?.find(m => m.id === matchId);
      if (match?.other_profile?.id) setOther(match.other_profile);
      api.put(`/api/messages/${matchId}/read`).catch(() => {});
      setupRealtime();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function setupRealtime() {
    supabase.channel(`messages:${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        payload => {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            if (payload.new.sender_id !== user.id) api.put(`/api/messages/${matchId}/read`).catch(() => {});
            return [...prev, { ...payload.new, message_reactions: [] }];
          });
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        payload => {
          setMessages(prev => prev.map(m =>
            m.id === payload.new.message_id
              ? { ...m, message_reactions: [...(m.message_reactions || []).filter(r => r.user_id !== payload.new.user_id), payload.new] }
              : m
          ));
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        payload => {
          setMessages(prev => prev.map(m => ({
            ...m,
            message_reactions: (m.message_reactions || []).filter(r => r.id !== payload.old.id),
          })));
        })
      .subscribe();

    const channel = supabase.channel(`typing:${matchId}`, { config: { presence: { key: user.id } } });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const others = Object.entries(state).filter(([k]) => k !== user.id).flatMap(([, arr]) => arr);
      setIsTyping(others.some(o => o.typing));
    });
    channel.subscribe(async status => { if (status === 'SUBSCRIBED') await channel.track({ typing: false }); });
    presenceRef.current = channel;
  }

  function handleInput(e) {
    setText(e.target.value);
    if (!presenceRef.current) return;
    presenceRef.current.track({ typing: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => presenceRef.current?.track({ typing: false }), 1500);
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
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, { ...msg, message_reactions: [] }]);
    } catch (e) { console.error(e); setText(content); }
    finally { setSending(false); }
  }

  async function sendGif(gifUrl) {
    setShowGifs(false);
    try {
      const msg = await api.post(`/api/messages/${matchId}`, { content: '', gif_url: gifUrl });
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, { ...msg, message_reactions: [] }]);
    } catch (e) { console.error(e); }
  }

  async function searchGifs(q) {
    if (!q) { setGifs([]); return; }
    setGifLoading(true);
    try {
      const r = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=16&media_filter=gif`);
      const d = await r.json();
      setGifs((d.results || []).map(g => g.media_formats?.gif?.url || g.media_formats?.tinygif?.url).filter(Boolean));
    } catch {}
    finally { setGifLoading(false); }
  }

  async function react(messageId, emoji) {
    setReactionFor(null);
    try {
      await api.post(`/api/messages/${messageId}/react`, { emoji });
    } catch (e) { console.error(e); }
  }

  function startLongPress(messageId) {
    longPressTimer.current = setTimeout(() => setReactionFor(messageId), 450);
  }
  function cancelLongPress() { clearTimeout(longPressTimer.current); }

  async function blockUser() {
    if (!other) return;
    if (!window.confirm(`Block ${other.name}? This will also remove your match.`)) return;
    try { await api.post('/api/blocks', { blocked_id: other.id }); navigate('/matches'); }
    catch (e) { alert(e.message); }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner /></div>;

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-white" onClick={() => { setReactionFor(null); setShowMenu(false); }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={() => navigate('/matches')} className="text-gray-500 text-xl">←</button>
        {other?.photos?.[0]
          ? <img src={other.photos[0]} alt={other.name} className="w-10 h-10 rounded-full object-cover" />
          : <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">👤</div>}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{other?.name || 'Match'}</p>
          <p className="text-xs text-gray-400">{isTyping ? '✍️ typing...' : other?.age ? `${other.age} years old` : ''}</p>
        </div>

        {/* Call buttons */}
        {other && (
          <>
            <button
              onClick={() => initiateCall({ matchId, calleeId: other.id, callType: 'audio', calleeProfile: other })}
              disabled={callState !== 'idle'}
              title="Voice call"
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-green-50 hover:text-green-600 disabled:opacity-40 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11 21 3 13 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
            </button>
            <button
              onClick={() => initiateCall({ matchId, calleeId: other.id, callType: 'video', calleeProfile: other })}
              disabled={callState !== 'idle'}
              title="Video call"
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </button>
          </>
        )}

        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowMenu(v => !v)} className="text-gray-400 text-xl px-2">⋮</button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44 z-20">
              <button onClick={() => { setShowMenu(false); blockUser(); }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50">🚫 Block & Report</button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">Say hello to {other?.name?.split(' ')[0] || 'your match'}!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine     = msg.sender_id === user.id;
          const isLast   = i === messages.length - 1;
          const showTime = i === 0 || new Date(msg.created_at) - new Date(messages[i-1].created_at) > 300000;
          const reactions = msg.message_reactions || [];
          const myReaction = reactions.find(r => r.user_id === user.id)?.emoji;

          return (
            <div key={msg.id}>
              {showTime && <p className="text-center text-xs text-gray-400 my-3">{formatTime(msg.created_at)}</p>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-1`}>
                <div className="relative max-w-[75%]">
                  {/* Reaction picker */}
                  {reactionFor === msg.id && (
                    <div
                      className={`absolute z-20 bottom-full mb-1 bg-white rounded-2xl shadow-xl border border-gray-100 flex gap-1 px-2 py-1.5 ${mine ? 'right-0' : 'left-0'}`}
                      onClick={e => e.stopPropagation()}>
                      {REACTIONS.map(e => (
                        <button key={e} onClick={() => react(msg.id, e)}
                          className={`text-xl hover:scale-125 transition-transform ${myReaction === e ? 'bg-rose-50 rounded-full' : ''}`}>{e}</button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`px-4 py-2 rounded-2xl text-sm ${mine ? 'bg-rose-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
                    onMouseDown={() => startLongPress(msg.id)}
                    onMouseUp={cancelLongPress}
                    onTouchStart={() => startLongPress(msg.id)}
                    onTouchEnd={cancelLongPress}
                  >
                    {msg.gif_url
                      ? <img src={msg.gif_url} alt="gif" className="rounded-xl max-w-[200px] max-h-[200px] object-contain" />
                      : <span>{msg.content}</span>}
                    {mine && isLast && <span className="ml-2 text-xs opacity-70">{msg.read ? '✓✓' : '✓'}</span>}
                  </div>

                  {/* Reactions display */}
                  {reactions.length > 0 && (
                    <div className={`flex gap-0.5 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {[...new Set(reactions.map(r => r.emoji))].map(e => (
                        <span key={e} className="bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm">
                          {e} {reactions.filter(r => r.emoji === e).length > 1 ? reactions.filter(r => r.emoji === e).length : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

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

      {/* GIF picker */}
      {showGifs && (
        <div className="border-t border-gray-100 bg-white p-3" onClick={e => e.stopPropagation()}>
          <div className="flex gap-2 mb-2">
            <input
              value={gifQuery}
              onChange={e => { setGifQuery(e.target.value); searchGifs(e.target.value); }}
              placeholder="Search GIFs…"
              className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 text-sm outline-none"
              autoFocus
            />
            <button onClick={() => setShowGifs(false)} className="text-gray-400 text-sm">✕</button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
            {gifLoading && <div className="col-span-4 flex justify-center py-4"><Spinner size={5} /></div>}
            {gifs.map((url, i) => (
              <img key={i} src={url} alt="gif" onClick={() => sendGif(url)}
                className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" />
            ))}
            {!gifLoading && gifs.length === 0 && gifQuery && (
              <p className="col-span-4 text-center text-xs text-gray-400 py-4">No GIFs found</p>
            )}
            {!gifQuery && !gifLoading && (
              <p className="col-span-4 text-center text-xs text-gray-400 py-2">Type to search GIFs</p>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white" onClick={e => e.stopPropagation()}>
        <button onClick={() => { setShowGifs(v => !v); if (!showGifs) searchGifs('love'); }}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg hover:bg-gray-200 transition-colors flex-shrink-0">
          GIF
        </button>
        <input
          value={text}
          onChange={handleInput}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(e)}
          placeholder="Message..."
          className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-rose-600 transition-colors flex-shrink-0"
        >{sending ? '…' : '↑'}</button>
      </div>
    </div>
  );
}
