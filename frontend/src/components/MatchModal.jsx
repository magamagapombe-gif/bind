import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MatchModal({ match, onClose }) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const other = match.user1?.id === profile?.id ? match.user2 : match.user1;
  const myPhoto    = profile?.photos?.[0];
  const otherPhoto = other?.photos?.[0];

  function goToChat() {
    onClose();
    navigate(`/chat/${match.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm text-center animate-bounce-in">
        {/* Confetti emojis */}
        <div className="text-4xl mb-4">🎉✨💫</div>
        <h2 className="text-4xl font-extrabold text-white mb-1">It's a Match!</h2>
        <p className="text-slate-300 mb-8">You and {other?.name} liked each other</p>

        {/* Photos */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-flame shadow-lg shadow-flame/30">
            {myPhoto ? (
              <img src={myPhoto} alt="You" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-700 flex items-center justify-center text-4xl">👤</div>
            )}
          </div>
          <div className="text-4xl animate-heart-pop">❤️</div>
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-flame shadow-lg shadow-flame/30">
            {otherPhoto ? (
              <img src={otherPhoto} alt={other?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-700 flex items-center justify-center text-4xl">👤</div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <button onClick={goToChat} className="btn-primary w-full text-lg py-4">
            Send a message 💬
          </button>
          <button onClick={onClose} className="btn-ghost w-full">
            Keep swiping
          </button>
        </div>
      </div>
    </div>
  );
}
