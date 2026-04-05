import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function MatchesPage() {
  const [matches, setMatches]  = useState([]);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/matches')
      .then(setMatches)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Spinner size={10} />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Your Matches</h1>
        <p className="text-slate-400 text-sm mt-1">
          {matches.length === 0 ? 'No matches yet — keep swiping!' : `${matches.length} match${matches.length > 1 ? 'es' : ''}`}
        </p>
      </div>

      {error && (
        <div className="mx-5 p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-6xl">💔</p>
          <h3 className="text-xl font-bold text-white">No matches yet</h3>
          <p className="text-slate-400">Start swiping to find your spark!</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-4">
          {matches.map((m) => {
            const photo = m.match.photos?.[0];
            return (
              <button
                key={m.id}
                onClick={() => navigate(`/chat/${m.id}`)}
                className="w-full flex items-center gap-4 p-4 bg-slate-800 rounded-2xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700 transition-colors text-left group"
              >
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-700 flex-shrink-0 border-2 border-slate-600 group-hover:border-flame transition-colors">
                  {photo ? (
                    <img src={photo} alt={m.match.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white">{m.match.name}, {m.match.age}</p>
                    <p className="text-xs text-slate-500">{timeAgo(m.created_at)}</p>
                  </div>
                  <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1">
                    <span>❤️</span> Matched! Say hello
                  </p>
                </div>

                {/* Arrow */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-500 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
