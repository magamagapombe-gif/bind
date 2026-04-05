import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';
import MatchModal from '../components/MatchModal';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)  return '🟢 Online now';
  if (mins < 60) return `Active ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Active ${hrs}h ago`;
  return `Active ${Math.floor(hrs / 24)}d ago`;
}

export default function SwipePage() {
  const [profiles, setProfiles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [match, setMatch]         = useState(null);
  const [lastSwipe, setLastSwipe] = useState(null);
  const [anim, setAnim]           = useState(null); // 'left'|'right'|'super'
  const [imgIndex, setImgIndex]   = useState(0);
  const [dragging, setDragging]   = useState(false);
  const [dragX, setDragX]         = useState(0);
  const startX = useRef(0);
  const cardRef = useRef(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { setImgIndex(0); }, [profiles[0]?.id]);

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
    }, 350);
  }

  async function undo() {
    if (!lastSwipe || anim) return;
    try {
      const res = await api.delete('/api/swipes/last');
      setProfiles(p => [res.profile || lastSwipe, ...p]);
      setLastSwipe(null);
    } catch (e) { alert(e.message); }
  }

  // Drag handlers
  function onMouseDown(e) { startX.current = e.clientX; setDragging(true); }
  function onMouseMove(e) { if (dragging) setDragX(e.clientX - startX.current); }
  function onMouseUp()    {
    setDragging(false);
    if (dragX > 80)       swipe('like');
    else if (dragX < -80) swipe('dislike');
    else                  setDragX(0);
  }
  function onTouchStart(e) { startX.current = e.touches[0].clientX; setDragging(true); }
  function onTouchMove(e)  { if (dragging) setDragX(e.touches[0].clientX - startX.current); }
  function onTouchEnd()    { onMouseUp(); }

  const profile = profiles[0];
  const photos  = profile?.photos?.filter(Boolean) || [];

  const cardStyle = anim === 'right' ? { transform: 'translateX(120%) rotate(20deg)', opacity: 0, transition: 'all 0.35s ease' }
                  : anim === 'left'  ? { transform: 'translateX(-120%) rotate(-20deg)', opacity: 0, transition: 'all 0.35s ease' }
                  : anim === 'super' ? { transform: 'translateY(-120%)', opacity: 0, transition: 'all 0.35s ease' }
                  : dragging         ? { transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`, transition: 'none' }
                  : { transition: 'transform 0.2s ease' };

  const likeOpacity    = Math.min(Math.max(dragX / 80, 0), 1);
  const dislikeOpacity = Math.min(Math.max(-dragX / 80, 0), 1);

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner /></div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-6 select-none">
      {/* Stack */}
      <div className="relative w-full max-w-sm" style={{ height: 520 }}>
        {/* Background cards for stack effect */}
        {profiles[2] && (
          <div className="absolute inset-0 rounded-2xl bg-white shadow-sm"
            style={{ transform: 'scale(0.92) translateY(16px)', zIndex: 1 }} />
        )}
        {profiles[1] && (
          <div className="absolute inset-0 rounded-2xl bg-white shadow-md"
            style={{ transform: 'scale(0.96) translateY(8px)', zIndex: 2 }} />
        )}

        {!profile ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white shadow text-center p-8" style={{ zIndex: 3 }}>
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-gray-600 font-medium">You've seen everyone!</p>
            <p className="text-sm text-gray-400 mt-2">Check back later for new people</p>
            <button onClick={load} className="mt-6 px-6 py-2 bg-rose-500 text-white rounded-full text-sm font-medium">
              Refresh
            </button>
          </div>
        ) : (
          <div
            ref={cardRef}
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing"
            style={{ zIndex: 3, ...cardStyle }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { if (dragging) { setDragging(false); setDragX(0); } }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Photo */}
            {photos.length > 0 ? (
              <img
                src={photos[imgIndex]}
                alt={profile.name}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center">
                <span className="text-8xl">👤</span>
              </div>
            )}

            {/* Photo dots */}
            {photos.length > 1 && (
              <div className="absolute top-3 left-0 right-0 flex gap-1 px-3">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`}
                    onClick={e => { e.stopPropagation(); setImgIndex(i); }}
                  />
                ))}
              </div>
            )}

            {/* Photo tap zones */}
            {photos.length > 1 && (
              <>
                <div className="absolute left-0 top-0 w-1/2 h-full"
                  onClick={e => { e.stopPropagation(); setImgIndex(i => Math.max(0, i - 1)); }} />
                <div className="absolute right-0 top-0 w-1/2 h-full"
                  onClick={e => { e.stopPropagation(); setImgIndex(i => Math.min(photos.length - 1, i + 1)); }} />
              </>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

            {/* Like / Dislike stamps */}
            <div className="absolute top-10 left-6 border-4 border-green-400 text-green-400 font-black text-3xl px-4 py-1 rounded-lg rotate-[-20deg] uppercase tracking-widest"
              style={{ opacity: likeOpacity }}>Like</div>
            <div className="absolute top-10 right-6 border-4 border-red-500 text-red-500 font-black text-3xl px-4 py-1 rounded-lg rotate-[20deg] uppercase tracking-widest"
              style={{ opacity: dislikeOpacity }}>Nope</div>

            {/* Profile info */}
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white pointer-events-none">
              <div className="flex items-end gap-2">
                <h2 className="text-2xl font-bold">{profile.name}, {profile.age}</h2>
                {profile.verified && <span className="text-blue-400 text-xl mb-0.5">✓</span>}
              </div>
              {profile.location && <p className="text-sm text-white/80 mt-0.5">📍 {profile.location}</p>}
              <p className="text-sm text-white/70 mt-0.5">{timeAgo(profile.last_active)}</p>
              {profile.bio && <p className="text-sm text-white/90 mt-2 line-clamp-2">{profile.bio}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-5 mt-6">
        {/* Undo */}
        <button
          onClick={undo}
          disabled={!lastSwipe}
          className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-yellow-400 text-xl disabled:opacity-30 hover:scale-110 transition-transform"
        >↩</button>

        {/* Dislike */}
        <button
          onClick={() => swipe('dislike')}
          className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-red-500 text-3xl hover:scale-110 transition-transform"
        >✕</button>

        {/* Super like */}
        <button
          onClick={() => swipe('superlike')}
          className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-blue-500 text-2xl hover:scale-110 transition-transform"
        >★</button>

        {/* Like */}
        <button
          onClick={() => swipe('like')}
          className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-rose-500 text-3xl hover:scale-110 transition-transform"
        >♥</button>
      </div>

      <p className="text-xs text-gray-400 mt-4">{profiles.length} profiles remaining</p>

      {match && (
        <MatchModal
          profile={match.profile}
          matchId={match.matchId}
          onClose={() => setMatch(null)}
        />
      )}
    </div>
  );
}
