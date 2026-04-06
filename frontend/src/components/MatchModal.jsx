import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Particle({ style }) {
  return <div className="absolute rounded-full pointer-events-none" style={style} />;
}

export default function MatchModal({ profile: other, matchId, onClose }) {
  const navigate = useNavigate();
  const { profile: me } = useAuth();
  const canvasRef = useRef(null);

  const myPhoto    = me?.photos?.[0];
  const otherPhoto = other?.photos?.[0];

  useEffect(() => {
    // Confetti burst
    const colors = ['#f43f5e','#fb923c','#fbbf24','#34d399','#60a5fa','#c084fc'];
    const particles = [];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 1.5) * 10,
        size: Math.random() * 8 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 8,
        alpha: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }

    let frame;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.3;
        p.vx *= 0.99;
        p.rot += p.rotV;
        p.alpha -= 0.012;
        if (p.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (particles.some(p => p.alpha > 0)) frame = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.25s ease' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      <div className="w-full max-w-sm text-center relative z-10" style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div className="mb-2 text-5xl" style={{ animation: 'heartPop 0.6s 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>🔥</div>
        <h2 className="text-4xl font-extrabold text-white mb-1 tracking-tight">It's a Match!</h2>
        <p className="text-slate-300 mb-8 text-lg">You and <span className="text-rose-400 font-semibold">{other?.name}</span> liked each other</p>

        <div className="flex justify-center items-center gap-3 mb-8">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-rose-500 shadow-xl shadow-rose-500/40"
            style={{ animation: 'slideInLeft 0.5s 0.1s ease both' }}>
            {myPhoto
              ? <img src={myPhoto} alt="You" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-slate-700 flex items-center justify-center text-4xl">👤</div>}
          </div>
          <div className="text-4xl" style={{ animation: 'heartPop 0.6s 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>❤️</div>
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-rose-500 shadow-xl shadow-rose-500/40"
            style={{ animation: 'slideInRight 0.5s 0.1s ease both' }}>
            {otherPhoto
              ? <img src={otherPhoto} alt={other?.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-slate-700 flex items-center justify-center text-4xl">👤</div>}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => { onClose(); navigate(`/chat/${matchId}`); }}
            className="w-full py-4 rounded-2xl bg-rose-500 text-white font-bold text-lg hover:bg-rose-600 active:scale-95 transition-all shadow-lg shadow-rose-500/30">
            Send a message 💬
          </button>
          <button onClick={onClose}
            className="w-full py-3 rounded-2xl border border-white/20 text-white/70 font-medium hover:bg-white/10 transition-all">
            Keep swiping
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes popIn     { from { opacity:0; transform:scale(0.7) } to { opacity:1; transform:scale(1) } }
        @keyframes heartPop  { from { transform:scale(0) } to { transform:scale(1) } }
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-30px) } to { opacity:1; transform:translateX(0) } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(30px)  } to { opacity:1; transform:translateX(0) } }
      `}</style>
    </div>
  );
}
