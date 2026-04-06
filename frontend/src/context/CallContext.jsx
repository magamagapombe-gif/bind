import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { CallEngine } from '../lib/callEngine';
import { startRingtone, stopRingtone, startDialTone, playConnectSound, playEndSound } from '../lib/ringtone';
import { api } from '../lib/api';
import IncomingCallBanner from '../components/IncomingCallBanner';
import CallScreen from '../components/CallScreen';

const CallContext = createContext(null);

/**
 * CallProvider wraps the whole app and manages:
 * - Global Supabase presence channel listening for incoming calls on ALL matches
 * - Rendering IncomingCallBanner (full-screen) over everything
 * - Rendering CallScreen (full-screen) once connected
 *
 * Each chat/match context gets initiateCall() from useCall()
 */
export function CallProvider({ children }) {
  const { user, profile } = useAuth();

  // Engine per active call (keyed by matchId)
  const engineRef = useRef(null);

  const [incomingCall, setIncomingCall]   = useState(null);  // { callId, callType, callerProfile, matchId }
  const [activeCall, setActiveCall]       = useState(null);  // { callId, callType, matchId, remoteProfile, engine }
  const [callState, setCallState]         = useState('idle'); // idle | calling | ringing | connected

  // Subscribe to ALL of this user's match channels to receive incoming calls
  // We listen on a user-level presence channel: `calls:user:${userId}`
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`calls:user:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'call:offer' }, ({ payload }) => {
        // Only process if not already in a call
        if (callState !== 'idle') return;
        const { callId, callType, callerProfile, matchId } = payload;
        setIncomingCall({ callId, callType, callerProfile, matchId });
      })
      .subscribe();

    return () => channel.unsubscribe();
  }, [user?.id, callState]);

  // ── Initiate outgoing call ────────────────────────────────
  async function initiateCall({ matchId, calleeId, callType = 'audio', calleeProfile }) {
    if (callState !== 'idle') return;

    // Create call record in DB
    let callRecord;
    try {
      callRecord = await api.post('/api/calls', { match_id: matchId, callee_id: calleeId, call_type: callType });
    } catch (e) {
      alert(e.message); return;
    }

    const engine = new CallEngine({
      matchId,
      userId: user.id,
      onStateChange: setCallState,
      onRemoteStream: () => {},
      onCallEnded: (reason) => {
        stopRingtone();
        playEndSound();
        api.patch(`/api/calls/${callRecord.id}`, { status: 'ended' }).catch(() => {});
        setActiveCall(null);
        setCallState('idle');
        engineRef.current = null;
      },
    });

    engineRef.current = engine;
    await engine.joinSignaling();

    // Also broadcast on callee's user channel
    const calleeChannel = supabase.channel(`calls:user:${calleeId}`, {
      config: { broadcast: { self: true } },
    });
    await new Promise(r => calleeChannel.subscribe(s => s === 'SUBSCRIBED' && r()));
    calleeChannel.send({
      type: 'broadcast',
      event: 'call:offer',
      payload: {
        callId: callRecord.id,
        callType,
        callerProfile: profile,
        matchId,
      },
    });
    // Unsubscribe the temporary broadcast channel immediately
    setTimeout(() => calleeChannel.unsubscribe(), 1000);

    setActiveCall({ callId: callRecord.id, callType, matchId, remoteProfile: calleeProfile, engine });
    setCallState('calling');
    startDialTone();

    await engine.startCall({
      callId: callRecord.id,
      callType,
      callerProfile: profile,
    });
  }

  // ── Accept incoming call ──────────────────────────────────
  async function acceptCall() {
    if (!incomingCall) return;
    const { callId, callType, callerProfile, matchId } = incomingCall;
    setIncomingCall(null);
    stopRingtone();

    const engine = new CallEngine({
      matchId,
      userId: user.id,
      onStateChange: setCallState,
      onRemoteStream: () => {},
      onCallEnded: (reason) => {
        stopRingtone();
        playEndSound();
        api.patch(`/api/calls/${callId}`, { status: 'ended' }).catch(() => {});
        setActiveCall(null);
        setCallState('idle');
        engineRef.current = null;
      },
    });

    engineRef.current = engine;
    await engine.joinSignaling();

    setActiveCall({ callId, callType, matchId, remoteProfile: callerProfile, engine });
    setCallState('connected');

    await engine.acceptCall();
    await api.patch(`/api/calls/${callId}`, { status: 'accepted' }).catch(() => {});
    playConnectSound();
  }

  // ── Decline incoming call ─────────────────────────────────
  async function declineCall() {
    if (!incomingCall) return;
    const { callId } = incomingCall;
    setIncomingCall(null);
    stopRingtone();

    // Need a temporary engine just to send the end signal
    const tempEngine = new CallEngine({ matchId: incomingCall.matchId, userId: user.id });
    tempEngine.currentCallId = callId;
    await tempEngine.joinSignaling();
    tempEngine.declineCall();
    setTimeout(() => tempEngine.destroy(), 500);

    await api.patch(`/api/calls/${callId}`, { status: 'declined' }).catch(() => {});
  }

  // ── End active call ───────────────────────────────────────
  function endCall() {
    engineRef.current?.hangUp();
  }

  return (
    <CallContext.Provider value={{ initiateCall, endCall, callState, activeCall }}>
      {children}

      {/* Incoming call banner — renders over everything */}
      {incomingCall && !activeCall && (
        <IncomingCallBanner
          call={incomingCall}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* Active call screen */}
      {activeCall && (callState === 'connected' || callState === 'calling') && (
        <CallScreen
          engine={activeCall.engine}
          callType={activeCall.callType}
          remoteProfile={activeCall.remoteProfile}
          localProfile={profile}
          onEnd={endCall}
        />
      )}
    </CallContext.Provider>
  );
}

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};
