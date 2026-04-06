import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';
import MatchModal from '../components/MatchModal';

const INTEREST_ICONS = {
  Music:'🎵', Travel:'✈️', Fitness:'💪', Foodie:'🍕', Gaming:'🎮',
  Art:'🎨', Reading:'📚', Movies:'🎬', Hiking:'🏔️', Cooking:'👨‍🍳',
  Dogs:'🐶', Cats:'🐱', Dancing:'💃', Yoga:'🧘', Coffee:'☕',
};

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

function isNewUser(createdAt) {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < 48 * 60 * 60 * 1000;
}

export default function SwipePage() {
  const [profiles, setProfiles]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [match, setMatch]           = useState(null);
  const [lastSwipe, setLastSwipe]   = useState(null);
  const [anim, setAnim]             = useState(null);
  const [imgIndex, setImgIndex]     = useState(0);
  const [dragX, setDragX]           = useState(0);
  const [dragging, setDragging]     = useState(false);
  const [dailyStatus, setDailyStatus] = useState(null);
  const [limitBanner, setLimitBanner] = useState(false);
  const [expandBio, setExpandBio]   = useState(false);
  const startX = useRef(0);

  useEffect(() => { load(); loadDailyStatus(); }, []);
  useEffect(() => { setImgIndex(0); setExpandBio(false); }, [profiles[0]?.id]);

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

  async function loadDailyStatus() {
    try { setDailyStatus(await api.get('/api/swipes/daily-status')); }
    catch {}
  }

  async function swipe(direction) {
    const profile = profiles[0];
    if (!profile || anim) return;

    if ((direction === 'like' || direction === 'superlike') && dailyStatus?.remaining === 0) {
      setLimitBanner(true);
      setTimeout(() => setLimitBanner(false), 3000);
      return;
    }

    setLastSwipe(profile);
    setAnim(direction === 'like' ? 'right' : direction === 'dislike' ? 'left' : 'super');

    setTimeout(async () => {
      setProfiles(p => p.slice(1));
      setAnim(null);
      setDragX(0);
      try {
        const res = await api.post('/api/swipes', { swiped_id: profile.id, direction });
        if (res.limit_reached) { setLimitBanner(true); setTimeout(() => setLimitBanner(false), 3000); return; }
        if (res.match_id) setMatch({ profile, matchId: res.match_id });
        // Update daily status
        setDailyStatus(s => s ? { ...s, remaining: Math.max(0, s.remaining - 1), count: s.count + 1 } : s);
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
  const superOpacity = anim === 'super' ? 1 : 0;

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

      {/* Limit banner */}
      {limitBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-2xl shadow-xl"
          style={{ animation: 'slideDown 0.3s ease' }}>
          🔒 Daily like limit reached — come back tomorrow!
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <button onClick={undo} disabled={!lastSwipe}
          className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-yellow-500 text-lg disabled:opacity-30">↩</button>
        <span className="text-2xl font-black text-rose-500 tracking-tight">binder 🔥</span>
        {/* Daily likes counter */}
        {dailyStatus && (
          <div className="flex items-center gap-1 bg-white rounded-full px-3 py-1 shadow text-xs font-semibold text-gray-500">
            <span className="text-rose-500">♥</span>
            <span>{dailyStatus.remaining}</span>
          </div>
        )}
      </div>

      {/* Card area */}
      <div className="flex-1 px-4 pb-4 min-h-0">
        <div className="relative w-full h-full max-w-sm mx-auto">
          {profiles[2] && <div className="absolute inset-0 rounded-3xl bg-white shadow" style={{ transform: 'scale(0.92) translateY(14px)', zIndex: 1 }} />}
          {profiles[1] && <div className="absolute inset-0 rounded-3xl bg-white shadow-md" style={{ transform: 'scale(0.96) translateY(7px)', zIndex: 2 }} />}

          {!profile ? (
            <div className="absolute inset-0 rounded-3xl bg-white shadow-xl flex flex-col items-center justify-center text-center p-8" style={{ zIndex: 3 }}>
              <div className="text-6xl mb-4">🎉</div>
              <p className="font-semibold text-gray-700 text-lg">You've seen everyone!</p>
              <p className="text-sm text-gray-400 mt-2 mb-6">Check back later for new people</p>
              <button onClick={load} className="px-8 py-3 bg-rose-500 text-white rounded-full font-medium">Refresh</button>
            </div>
          ) : (
            <div
              className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing select-none"
              style={cardStyle}
              onMouseDown={e => onStart(e.clientX)}
              onMouseMove={e => onMove(e.clientX)}
              onMouseUp={onEnd}
              onMouseLeave={() => { if (dragging) { setDragging(false); setDragX(0); } }}
              onTouchStart={e => onStart(e.touches[0].clientX)}
              onTouchMove={e => { e.preventDefault(); onMove(e.touches[0].clientX); }}
              onTouchEnd={onEnd}
            >
              {/* Photo */}
              {photos.length > 0
                ? <img src={photos[imgIndex]} alt={profile.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                : <div className="w-full h-full bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center"><span className="text-8xl">👤</span></div>
              }

              {/* Photo progress dots */}
              {photos.length > 1 && (
                <div className="absolute top-3 left-0 right-0 flex gap-1.5 px-4 pointer-events-none">
                  {photos.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i === imgIndex ? 'bg-white' : 'bg-white/35'}`} />)}
                </div>
              )}

              {/* Photo tap zones */}
              {photos.length > 1 && (
                <>
                  <div className="absolute left-0 top-0 w-1/3 h-2/3 z-10" onClick={e => { e.stopPropagation(); setImgIndex(i => Math.max(0, i - 1)); }} />
                  <div className="absolute right-0 top-0 w-1/3 h-2/3 z-10" onClick={e => { e.stopPropagation(); setImgIndex(i => Math.min(photos.length - 1, i + 1)); }} />
                </>
              )}

              {/* Swipe stamps */}
              <div className="absolute top-8 left-5 border-4 border-green-400 text-green-400 font-black text-2xl px-3 py-1 rounded-lg -rotate-12 uppercase tracking-widest pointer-events-none" style={{ opacity: likeOpacity }}>Like</div>
              <div className="absolute top-8 right-5 border-4 border-red-400 text-red-400 font-black text-2xl px-3 py-1 rounded-lg rotate-12 uppercase tracking-widest pointer-events-none" style={{ opacity: nopeOpacity }}>Nope</div>
              <div className="absolute top-8 left-1/2 -translate-x-1/2 border-4 border-blue-400 text-blue-400 font-black text-2xl px-3 py-1 rounded-lg uppercase tracking-widest pointer-events-none" style={{ opacity: superOpacity }}>Super!</div>

              {/* Badges */}
              <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end pointer-events-none" style={{ top: photos.length > 1 ? '2.5rem' : '0.75rem' }}>
                {profile.verified && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Verified</span>}
                {isNewUser(profile.created_at) && <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">✨ New here</span>}
              </div>

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

              {/* Info panel */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none">
                <div className="mb-3">
                  <div className="flex items-end gap-2">
                    <h2 className="text-white text-2xl font-bold leading-none">{profile.name}, {profile.age}</h2>
                  </div>
                  {profile.location && <p className="text-white/70 text-sm mt-0.5">📍 {profile.location}</p>}
                  {profile.last_active && <p className="text-white/55 text-xs mt-0.5">{timeAgo(profile.last_active)}</p>}

                  {/* Interests chips */}
                  {profile.interests?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {profile.interests.slice(0, 4).map(tag => (
                        <span key={tag} className="bg-white/20 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">
                          {INTEREST_ICONS[tag] || '•'} {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-white/85 text-sm mt-2 leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: expandBio ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {profile.bio}
                    </p>
                  )}

                  {/* Prompts */}
                  {profile.prompts?.length > 0 && (
                    <div className="mt-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
                      <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">{profile.prompts[0].question}</p>
                      <p className="text-white text-sm mt-0.5 font-medium">{profile.prompts[0].answer}</p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-4 pointer-events-auto">
                  <button onClick={e => { e.stopPropagation(); swipe('dislike'); }}
                    className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-red-400 text-2xl hover:scale-110 active:scale-95 transition-all">✕</button>
                  <button onClick={e => { e.stopPropagation(); swipe('superlike'); }}
                    className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-blue-400 text-xl hover:scale-110 active:scale-95 transition-all">★</button>
                  <button onClick={e => { e.stopPropagation(); swipe('like'); }}
                    className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-rose-500 text-2xl hover:scale-110 active:scale-95 transition-all">♥</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {match && <MatchModal profile={match.profile} matchId={match.matchId} onClose={() => setMatch(null)} />}
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-10px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }`}</style>
    </div>
  );
}
