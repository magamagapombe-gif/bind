import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import SwipeCard from '../components/SwipeCard';
import MatchModal from '../components/MatchModal';
import Spinner from '../components/Spinner';

export default function SwipePage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [match, setMatch]       = useState(null);
  const [swiping, setSwiping]   = useState(false);

  const loadProfiles = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.get('/api/profiles/discover');
      setProfiles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  async function handleSwipe(direction) {
    if (swiping || profiles.length === 0) return;
    const top = profiles[profiles.length - 1];
    setSwiping(true);

    // Optimistically remove card
    setProfiles((prev) => prev.slice(0, -1));

    try {
      const res = await api.post('/api/swipes', { swiped_id: top.id, direction });
      if (res.match) setMatch(res.match);
    } catch (err) {
      console.error('Swipe failed:', err.message);
      // Put card back on error
      setProfiles((prev) => [...prev, top]);
    } finally {
      setSwiping(false);
    }

    // Reload when running low
    if (profiles.length <= 3) loadProfiles();
  }

  const top = profiles[profiles.length - 1];
  const second = profiles[profiles.length - 2];

  if (loading && profiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Spinner size={10} />
        <p className="text-slate-400">Finding people near you…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-4 text-center">
        <p className="text-4xl">😕</p>
        <p className="text-slate-300">{error}</p>
        <button onClick={loadProfiles} className="btn-primary">Retry</button>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-4 text-center">
        <p className="text-6xl">🙈</p>
        <h3 className="text-xl font-bold text-white">You've seen everyone!</h3>
        <p className="text-slate-400">Check back later for new people.</p>
        <button onClick={loadProfiles} className="btn-primary">Refresh</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          🔥 <span>Binder</span>
        </h1>
        <button onClick={loadProfiles} className="text-slate-400 hover:text-white transition-colors p-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Card stack */}
      <div className="flex-1 relative mx-4 mb-4">
        {/* Back card */}
        {second && (
          <div
            className="absolute inset-0 rounded-3xl overflow-hidden bg-slate-700 shadow-xl"
            style={{ transform: 'scale(0.95) translateY(8px)', zIndex: 1 }}
          >
            <div className="w-full h-full">
              {second.photos?.[0] ? (
                <img src={second.photos[0]} alt="" className="w-full h-full object-cover opacity-60" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-700">
                  <span className="text-6xl opacity-40">👤</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top card */}
        {top && (
          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            <SwipeCard
              key={top.id}
              profile={top}
              onSwipe={handleSwipe}
              isTop={true}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 pb-6">
        {/* Dislike */}
        <button
          onClick={() => handleSwipe('dislike')}
          disabled={swiping}
          className="w-16 h-16 rounded-full bg-slate-800 border-2 border-red-400 flex items-center justify-center text-red-400 shadow-lg transition-all active:scale-90 hover:bg-red-400 hover:text-white disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Super Like */}
        <button
          onClick={() => handleSwipe('like')}
          disabled={swiping}
          className="w-12 h-12 rounded-full bg-slate-800 border-2 border-blue-400 flex items-center justify-center text-blue-400 shadow-lg transition-all active:scale-90 hover:bg-blue-400 hover:text-white disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </button>

        {/* Like */}
        <button
          onClick={() => handleSwipe('like')}
          disabled={swiping}
          className="w-16 h-16 rounded-full bg-slate-800 border-2 border-green-400 flex items-center justify-center text-green-400 shadow-lg transition-all active:scale-90 hover:bg-green-400 hover:text-white disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </button>
      </div>

      {/* Match modal */}
      {match && <MatchModal match={match} onClose={() => setMatch(null)} />}
    </div>
  );
}
