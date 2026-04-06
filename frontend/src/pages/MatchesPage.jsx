import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)  return '🟢';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MatchesPage() {
  const [matches, setMatches]   = useState([]);
  const [likesMe, setLikesMe]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('matches'); // 'matches' | 'likes'
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/api/matches'),
      api.get('/api/swipes/likes-me'),
    ]).then(([m, l]) => {
      setMatches(m || []);
      setLikesMe(l || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner /></div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('matches')}
          className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
            tab === 'matches' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Matches {matches.length > 0 && `(${matches.length})`}
        </button>
        <button
          onClick={() => setTab('likes')}
          className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors relative ${
            tab === 'likes' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Liked You {likesMe.length > 0 && (
            <span className={`ml-1 ${tab === 'likes' ? 'text-white' : 'text-rose-500'}`}>
              ({likesMe.length})
            </span>
          )}
        </button>
      </div>

      {/* Matches tab */}
      {tab === 'matches' && (
        <>
          {matches.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">💘</div>
              <p className="font-medium">No matches yet</p>
              <p className="text-sm mt-1">Keep swiping!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {matches.filter(m => m.other_profile?.id).map(m => {
                const other  = m.other_profile;
                const photo  = other.photos?.[0];
                const online = other.last_active && (Date.now() - new Date(other.last_active).getTime()) < 300000;
                return (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/chat/${m.id}`)}
                    className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[3/4] shadow-sm hover:shadow-md transition-shadow text-left"
                  >
                    {photo
                      ? <img src={photo} alt={other.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />

                    {/* Online dot */}
                    {online && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    )}

                    {/* Unread badge */}
                    {m.unread_count > 0 && (
                      <div className="absolute top-2 left-2 bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {m.unread_count}
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <p className="font-semibold text-sm truncate">{other.name}</p>
                      <p className="text-xs text-white/70">
                        {m.last_message ? m.last_message.slice(0, 28) + (m.last_message.length > 28 ? '…' : '') : 'Say hello 👋'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Liked you tab */}
      {tab === 'likes' && (
        <>
          {likesMe.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">⭐</div>
              <p className="font-medium">No likes yet</p>
              <p className="text-sm mt-1">People who like you will appear here</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">Swipe right on them to match!</p>
              <div className="grid grid-cols-2 gap-3">
                {likesMe.map(p => {
                  const photo = p.photos?.[0];
                  return (
                    <div
                      key={p.id}
                      className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[3/4] shadow-sm"
                    >
                      {photo
                        ? <img src={photo} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />

                      {/* Super like badge */}
                      {p.is_superlike && (
                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          ★ Super Like
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <p className="font-semibold text-sm">{p.name}, {p.age}</p>
                        <p className="text-xs text-white/70">{timeAgo(p.last_active)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
