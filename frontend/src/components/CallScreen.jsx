import { useEffect, useRef, useState } from 'react';
import { playEndSound } from '../lib/ringtone';

/**
 * Active call screen — audio or video.
 * Shows local/remote video feeds for video calls.
 * Shows avatar + timer for audio calls.
 */
export default function CallScreen({ engine, callType, remoteProfile, localProfile, onEnd }) {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const [duration, setDuration]   = useState(0);
  const [muted, setMuted]         = useState(false);
  const [camOff, setCamOff]       = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Start call timer
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

    // Hook into engine's remote stream callback
    const origOnRemote = engine.onRemoteStream;
    engine.onRemoteStream = (stream) => {
      setRemoteStream(stream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      if (origOnRemote) origOnRemote(stream);
    };

    // Attach local stream immediately if available
    if (engine.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = engine.localStream;
    }

    return () => {
      clearInterval(timerRef.current);
      engine.onRemoteStream = origOnRemote;
    };
  }, []);

  // Attach streams to video elements when refs mount
  useEffect(() => {
    if (engine.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = engine.localStream;
    }
  }, [localVideoRef.current]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef.current]);

  function formatDuration(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function handleHangUp() {
    playEndSound();
    engine.hangUp();
    onEnd();
  }

  function toggleMute() {
    const nowMuted = engine.toggleMute();
    setMuted(nowMuted);
  }

  function toggleCamera() {
    const nowOff = engine.toggleCamera();
    setCamOff(nowOff);
  }

  function toggleSpeaker() {
    // Toggle speaker on remote audio (mute remote)
    const audio = remoteVideoRef.current;
    if (audio) { audio.muted = !audio.muted; setSpeakerOff(audio.muted); }
  }

  const isVideo = callType === 'video';

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black">

      {/* ── VIDEO CALL ── */}
      {isVideo && (
        <>
          {/* Remote video — full screen */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Fallback when no remote stream yet */}
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/20 mb-4">
                {remoteProfile?.photos?.[0]
                  ? <img src={remoteProfile.photos[0]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-slate-700 flex items-center justify-center text-5xl">👤</div>}
              </div>
              <p className="text-white text-xl font-semibold">{remoteProfile?.name}</p>
              <p className="text-white/50 mt-1 text-sm animate-pulse">Connecting…</p>
            </div>
          )}

          {/* Local video — picture-in-picture */}
          <div className="absolute top-12 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            {camOff && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <span className="text-3xl">🚫</span>
              </div>
            )}
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 px-5 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent">
            <p className="text-white font-semibold text-lg">{remoteProfile?.name}</p>
            <p className="text-white/60 text-sm">{formatDuration(duration)}</p>
          </div>
        </>
      )}

      {/* ── AUDIO CALL ── */}
      {!isVideo && (
        <>
          {/* Hidden audio element for remote stream */}
          <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />

          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center"
            style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl mb-6">
              {remoteProfile?.photos?.[0]
                ? <img src={remoteProfile.photos[0]} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-slate-600 flex items-center justify-center text-6xl">👤</div>}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{remoteProfile?.name}</h2>
            <p className="text-white/50 text-lg">{formatDuration(duration)}</p>

            {/* Sound wave animation */}
            <div className="flex gap-1 mt-6 items-center h-8">
              {[0.4, 0.7, 1, 0.7, 0.4, 0.7, 1, 0.7, 0.4].map((h, i) => (
                <div key={i} className="w-1 bg-white/40 rounded-full"
                  style={{ height: `${h * 28}px`, animation: `wave 1.2s ${i * 0.13}s ease-in-out infinite alternate` }} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── CONTROLS ── */}
      <div className={`${isVideo ? 'absolute bottom-0 left-0 right-0' : ''} px-8 pb-14 pt-6 bg-gradient-to-t from-black/80 to-transparent`}>
        <div className="flex items-center justify-center gap-6">
          {/* Mute */}
          <ControlBtn
            icon={muted ? '🔇' : '🎙️'}
            label={muted ? 'Unmute' : 'Mute'}
            active={muted}
            onClick={toggleMute}
          />

          {/* Camera (video only) */}
          {isVideo && (
            <ControlBtn
              icon={camOff ? '📷' : '📹'}
              label={camOff ? 'Camera off' : 'Camera'}
              active={camOff}
              onClick={toggleCamera}
            />
          )}

          {/* Speaker */}
          <ControlBtn
            icon={speakerOff ? '🔈' : '🔊'}
            label="Speaker"
            active={speakerOff}
            onClick={toggleSpeaker}
          />

          {/* Flip camera (video only) */}
          {isVideo && (
            <ControlBtn
              icon="🔄"
              label="Flip"
              onClick={() => engine.switchCamera()}
            />
          )}
        </div>

        {/* Hang up */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleHangUp}
            className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-xl shadow-red-500/50 hover:bg-red-400 active:scale-95 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-9 h-9">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11 21 3 13 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" transform="rotate(135 12 12)"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .mirror { transform: scaleX(-1); }
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

function ControlBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${active ? 'bg-white/30' : 'bg-white/10'} hover:bg-white/20 active:scale-90`}>
        {icon}
      </div>
      <span className="text-white/50 text-xs">{label}</span>
    </button>
  );
}
