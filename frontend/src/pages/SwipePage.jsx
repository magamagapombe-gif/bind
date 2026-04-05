import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';
import MatchModal from '../components/MatchModal';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)  return '🟢 Online';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return '';
}

export default function SwipePage() {
  const [profiles, setProfiles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [match, setMatch]         = useState(null);
  const [lastSwipe, setLastSwipe] = useState(null);
  const [anim, setAnim]           = useState(null);
  const [imgIndex, setImgIndex]   = useState(0);
  const [dragX, setDragX]         = useState(0);
  const [dragging, setDragging]   = useState(false);
  const startX = useRef(0);

  useEffect(() => { load(); }, []);
  useEffect(() => { setImgIndex(0); }, [profiles[0]?.id]);

  useEffect(() => {
    if (profiles[1]?.photos?.[0]) {
      const img = new Image();
      img.src = profiles[1].photos[0];
    }
  }, [profiles[1]]);

  async function load() {
    setLoading(true);
    try { setProfiles(await api.get('/api/profiles/discover')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function swipe(direction) {
    const profile = profiles[0];
    if (!profile || anim) return;
    setLastSwipe(profile);
    setAnim(direction);
    setTimeout(async () => {
      setProfiles(p => p.slice(1));
      setAnim(null);
      setDragX(0);
      try {
        const res = await api.post('/api/swipes', { swiped_id: profile.id, direction });
        if (res.match_id) setMatch({ profile, matchId: res.match_id });
      } catch (e) { console.error(e); }
    }, 320);
  }

  async function undo() {
    if (!lastSwipe || anim) return;
    try {
      const res = await api.delete('/api/swipes/last');
      setProfiles(p => [res.profile || lastSwipe, ...p]);
      setLastSwipe(null);
    } catch (e) { alert(e.message); }
  }

  function onStart(x) { startX.current = x; setDragging(true); }
  function onMove(x)  { if (dragging) setDragX(x - startX.current); }
  function onEnd()    {
    setDragging(false);
    if      (dragX >  80) swipe('like');
    else if (dragX < -80) swipe('dislike');
    else                  setDragX(0);
  }

  const profile     = profiles[0];
  const photos      = profile?.photos?.filter(Boolean) || [];
  const likeOpacity = Math.min(Math.max(dragX / 80, 0), 1);
  const nopeOpacity = Math.min(Math.max(-dragX / 80, 0), 1);

  const cardStyle = {
    zIndex: 3,
    willChange: 'transform',
    transform: anim === 'right' ? 'translateX(150%) rotate(25deg)'
             : anim === 'left'  ? 'translateX(-150%) rotate(-25deg)'
             : anim === 'super' ? 'translateY(-150%)'
             : dragging         ? `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`
             : 'translateX(0)',
    transition: dragging ? 'none' : 'transform 0.32s ease, opacity 0.32s ease',
    opacity: anim ? 0 : 1,
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50"><Spinner /></div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <span className="text-2xl">🔥</span>
        <h1 className="text-lg font-bold text-gray-800">Binder</h1>
        <button onClick={undo} disabled={!lastSwipe}
          className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-yellow-500 text-lg disabled:opacity-30">↩</button>
      </div>

      {/* Card area — fills remaining space */}
      <div className="flex-1 px-4 pb-5 min-h-0">
        <div className="relative w-full h-full max-w-sm mx-auto">
          {profiles[2] && <div className="absolute inset-0 rounded-3xl bg-white shadow" style={{ transform: 'scale(0.92) translateY(14px)', zIndex: 1 }} />}
          {profiles[1] && <div className="absolute inset-0 rounded-3xl bg-white shadow-md" style={{ transform: 'scale(0.96) translateY(7px)', zIndex: 2 }} />}

          {!profile ? (
            <div className="absolute inset-0 rounded-3xl bg-white shadow-xl flex flex-col items-center justify-center text-center p-8" style={{ zIndex: 3 }}>
              <div className="text-6xl mb-4">🎉</div>
              <p className="font-semibold text-gray-700 text-lg">You've seen everyone!</p>
              <p className="text-sm text-gray-400 mt-2 mb-6">Check back later</p>
              <button onClick={load} className="px-8 py-3 bg-rose-500 text-white rounded-full font-medium">Refresh</button>
            </div>
          ) : (
            <div
              className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing"
              style={cardStyle}
              onMouseDown={e => onStart(e.clientX)}
              onMouseMove={e => onMove(e.clientX)}
              onMouseUp={onEnd}
              onMouseLeave={() => { if (dragging) { setDragging(false); setDragX(0); } }}
              onTouchStart={e => onStart(e.touches[0].clientX)}
              onTouchMove={e => { e.preventDefault(); onMove(e.touches[0].clientX); }}
              onTouchEnd={onEnd}
            >
              {photos.length > 0
                ? <img src={photos[imgIndex]} alt={profile.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                : <div className="w-full h-full bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center"><span className="text-8xl">👤</span></div>
              }

              {/* Photo dots */}
              {photos.length > 1 && (
                <div className="absolute top-3 left-0 right-0 flex gap-1.5 px-4 pointer-events-none">
                  {photos.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i === imgIndex ? 'bg-white' : 'bg-white/35'}`} />)}
                </div>
              )}

              {/* Photo tap zones */}
              {photos.length > 1 && (
                <>
                  <div className="absolute left-0 top-0 w-1/3 h-2/3 z-10" onClick={e => { e.stopPropagation(); setImgIndex(i => Math.max(0, i - 1)); }} />
                  <div className="absolute right-0 top-0 w-1/3 h-2/3 z-10" onClick={e => { e.stopPropagation(); setImgIndex(i => Math.min(photos.length - 1, i + 1)); }} />
                </>
              )}

              {/* Stamps */}
              <div className="absolute top-8 left-5 border-4 border-green-400 text-green-400 font-black text-2xl px-3 py-1 rounded-lg -rotate-12 uppercase tracking-widest" style={{ opacity: likeOpacity }}>Like</div>
              <div className="absolute top-8 right-5 border-4 border-red-400 text-red-400 font-black text-2xl px-3 py-1 rounded-lg rotate-12 uppercase tracking-widest" style={{ opacity: nopeOpacity }}>Nope</div>

              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />

              {/* Info + buttons inside card at bottom */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                <div className="mb-4 pointer-events-none">
                  <div className="flex items-end gap-2">
                    <h2 className="text-white text-2xl font-bold leading-none">{profile.name}, {profile.age}</h2>
                    {profile.verified && <span className="text-blue-400 text-lg mb-0.5">✓</span>}
                  </div>
                  {profile.location && <p className="text-white/75 text-sm mt-1">📍 {profile.location}</p>}
                  {profile.last_active && <p className="text-white/60 text-xs mt-0.5">{timeAgo(profile.last_active)}</p>}
                  {profile.bio && <p className="text-white/85 text-sm mt-2 line-clamp-2">{profile.bio}</p>}
                </div>

                {/* Buttons overlaid on image */}
                <div className="flex items-center justify-center gap-4 pointer-events-auto">
                  <button onClick={e => { e.stopPropagation(); swipe('dislike'); }}
                    className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white text-2xl hover:bg-red-500/80 hover:border-transparent transition-all active:scale-95">✕</button>
                  <button onClick={e => { e.stopPropagation(); swipe('superlike'); }}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-blue-300 text-xl hover:bg-blue-500/80 hover:text-white hover:border-transparent transition-all active:scale-95">★</button>
                  <button onClick={e => { e.stopPropagation(); swipe('like'); }}
                    className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white text-2xl hover:bg-rose-500/80 hover:border-transparent transition-all active:scale-95">♥</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {match && <MatchModal profile={match.profile} matchId={match.matchId} onClose={() => setMatch(null)} />}
    </div>
  );
}
