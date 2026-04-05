import { useRef, useState } from 'react';

const SWIPE_THRESHOLD = 100;
const ROTATION_MAX    = 20;

export default function SwipeCard({ profile, onSwipe, isTop }) {
  const cardRef = useRef(null);
  const startRef = useRef(null);
  const [drag, setDrag]     = useState({ x: 0, y: 0, active: false });
  const [photoIdx, setPhotoIdx] = useState(0);

  const photos = profile.photos?.length ? profile.photos : [null];

  // ── pointer events ───────────────────────────────────────
  function pointerDown(e) {
    if (!isTop) return;
    cardRef.current.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  }

  function pointerMove(e) {
    if (!drag.active || !startRef.current) return;
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
      active: true,
    });
  }

  function pointerUp() {
    if (!drag.active) return;
    const dx = drag.x;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      onSwipe(dx > 0 ? 'like' : 'dislike');
    } else {
      setDrag({ x: 0, y: 0, active: false });
    }
    startRef.current = null;
  }

  const rotate = (drag.x / window.innerWidth) * ROTATION_MAX;
  const likeOpacity  = Math.max(0, Math.min(1, drag.x / SWIPE_THRESHOLD));
  const nopeOpacity  = Math.max(0, Math.min(1, -drag.x / SWIPE_THRESHOLD));

  const transform = drag.active
    ? `translate(${drag.x}px, ${drag.y * 0.3}px) rotate(${rotate}deg)`
    : 'translate(0,0) rotate(0deg)';

  return (
    <div
      ref={cardRef}
      className="swipe-card absolute inset-0 rounded-3xl overflow-hidden bg-slate-800 shadow-2xl cursor-grab active:cursor-grabbing"
      style={{
        transform,
        transition: drag.active ? 'none' : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        touchAction: 'none',
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    >
      {/* Photo */}
      <div className="relative w-full h-full">
        {photos[photoIdx] ? (
          <img
            src={photos[photoIdx]}
            alt={profile.name}
            className="w-full h-full object-cover pointer-events-none select-none"
            draggable="false"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <span className="text-8xl">👤</span>
          </div>
        )}

        {/* Photo dots */}
        {photos.length > 1 && (
          <div className="absolute top-3 left-0 right-0 flex gap-1 justify-center pointer-events-none">
            {photos.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${i === photoIdx ? 'bg-white w-5' : 'bg-white/40 w-2'}`}
              />
            ))}
          </div>
        )}

        {/* Tap zones to cycle photos */}
        {photos.length > 1 && (
          <>
            <div
              className="absolute left-0 top-0 w-1/3 h-full"
              onPointerDown={(e) => { e.stopPropagation(); setPhotoIdx((i) => Math.max(0, i - 1)); }}
            />
            <div
              className="absolute right-0 top-0 w-1/3 h-full"
              onPointerDown={(e) => { e.stopPropagation(); setPhotoIdx((i) => Math.min(photos.length - 1, i + 1)); }}
            />
          </>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* LIKE / NOPE stamps */}
        <div
          className="absolute top-12 left-8 stamp-like border-4 rounded-lg px-3 py-1 text-2xl font-extrabold tracking-widest pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          LIKE
        </div>
        <div
          className="absolute top-12 right-8 stamp-nope border-4 rounded-lg px-3 py-1 text-2xl font-extrabold tracking-widest pointer-events-none"
          style={{ opacity: nopeOpacity }}
        >
          NOPE
        </div>

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
          <div className="flex items-end gap-2">
            <h2 className="text-3xl font-bold text-white">{profile.name}</h2>
            <span className="text-2xl text-white/80 mb-0.5">{profile.age}</span>
          </div>
          {profile.location && (
            <p className="text-white/70 text-sm mt-1 flex items-center gap-1">
              <span>📍</span> {profile.location}
            </p>
          )}
          {profile.bio && (
            <p className="text-white/80 text-sm mt-2 line-clamp-2">{profile.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}
