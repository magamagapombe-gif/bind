import { useEffect, useRef, useState } from 'react';
import { startRingtone, stopRingtone } from '../lib/ringtone';

/**
 * Full-screen incoming call overlay — exactly like WhatsApp.
 * Shows caller photo, name, call type.
 * Swipe right (green) to accept, swipe left (red) to decline.
 * Also supports tap buttons.
 */
export default function IncomingCallBanner({ call, onAccept, onDecline }) {
  const { callerProfile, callType } = call;
  const [dragX, setDragX]   = useState(0);
  const [dragging, setDragging] = useState(false);
  const [decided, setDecided]   = useState(false);
  const startXRef = useRef(0);

  useEffect(() => {
    startRingtone();
    return () => stopRingtone();
  }, []);

  // Vibration (mobile)
  useEffect(() => {
    if (!navigator.vibrate) return;
    const pattern = [400, 200, 400, 200, 400];
    navigator.vibrate(pattern);
    const id = setInterval(() => navigator.vibrate(pattern), 1400);
    return () => { clearInterval(id); navigator.vibrate(0); };
  }, []);

  function handleAccept() {
    if (decided) return;
    setDecided(true);
    stopRingtone();
    navigator.vibrate?.(0);
    onAccept();
  }

  function handleDecline() {
    if (decided) return;
    setDecided(true);
    stopRingtone();
    navigator.vibrate?.(0);
    onDecline();
  }

  // Swipe gesture on the bottom action area
  function onStart(x) { startXRef.current = x; setDragging(true); }
  function onMove(x)  { if (dragging) setDragX(x - startXRef.current); }
  function onEnd()    {
    setDragging(false);
    if      (dragX >  80) handleAccept();
    else if (dragX < -80) handleDecline();
    else                  setDragX(0);
  }

  const acceptOpacity = Math.min(Math.max(dragX / 80, 0), 1);
  const declineOpacity = Math.min(Math.max(-dragX / 80, 0), 1);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

      {/* Top section — caller info */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-white/60 text-sm font-medium mb-6 tracking-widest uppercase">
          Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
        </p>

        {/* Avatar with pulsing ring */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="absolute -inset-3 rounded-full bg-white/5 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
          <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
            {callerProfile?.photos?.[0]
              ? <img src={callerProfile.photos[0]} alt={callerProfile.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-slate-600 flex items-center justify-center text-6xl">👤</div>}
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">{callerProfile?.name || 'Unknown'}</h1>
        <p className="text-white/50 text-lg">
          {callType === 'video' ? '📹 Video calling…' : '📞 Calling…'}
        </p>
      </div>

      {/* Swipe hint */}
      <div className="text-center mb-3">
        <p className="text-white/30 text-xs tracking-wider">SWIPE TO RESPOND</p>
      </div>

      {/* Action row — swipeable */}
      <div
        className="relative flex items-center justify-between px-12 pb-20 select-none"
        onMouseDown={e => onStart(e.clientX)}
        onMouseMove={e => onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={() => { if (dragging) { setDragging(false); setDragX(0); } }}
        onTouchStart={e => onStart(e.touches[0].clientX)}
        onTouchMove={e => { e.preventDefault(); onMove(e.touches[0].clientX); }}
        onTouchEnd={onEnd}
      >
        {/* Decline */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleDecline}
            className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-xl shadow-red-500/40 hover:bg-red-400 active:scale-95 transition-all"
            style={{ transform: dragX < 0 ? `scale(${1 + Math.abs(dragX) / 200})` : 'scale(1)', boxShadow: `0 0 ${Math.abs(Math.min(dragX, 0))}px 4px rgba(239,68,68,0.6)` }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-9 h-9">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11 21 3 13 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8zM19 6h-2V4h-2V2h2V0h2v2h2v2h-2v2z" transform="rotate(135 12 12)"/>
              <line x1="5" y1="5" x2="19" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="text-white/60 text-sm font-medium">Decline</span>
        </div>

        {/* Swipe indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="flex items-center gap-1 opacity-30">
            <span className="text-red-400 text-xl">←</span>
            <div className="w-8 h-0.5 bg-white/20 rounded" />
            <div className="w-8 h-0.5 bg-white/20 rounded" />
            <span className="text-green-400 text-xl">→</span>
          </div>
        </div>

        {/* Accept */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleAccept}
            className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-xl shadow-green-500/40 hover:bg-green-400 active:scale-95 transition-all"
            style={{ transform: dragX > 0 ? `scale(${1 + dragX / 200})` : 'scale(1)', boxShadow: `0 0 ${Math.max(dragX, 0)}px 4px rgba(34,197,94,0.6)` }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-9 h-9">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11 21 3 13 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
            </svg>
          </button>
          <span className="text-white/60 text-sm font-medium">Accept</span>
        </div>
      </div>

      {/* Decline label flash overlay */}
      {declineOpacity > 0.1 && (
        <div className="absolute inset-0 bg-red-500 pointer-events-none" style={{ opacity: declineOpacity * 0.15 }} />
      )}
      {acceptOpacity > 0.1 && (
        <div className="absolute inset-0 bg-green-500 pointer-events-none" style={{ opacity: acceptOpacity * 0.15 }} />
      )}
    </div>
  );
}
