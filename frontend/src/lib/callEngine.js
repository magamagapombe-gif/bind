/**
 * Binder Call Engine
 * WebRTC peer-to-peer audio/video via Supabase Realtime signaling.
 *
 * Signaling channel: supabase.channel(`call:${matchId}`)
 * Messages sent via channel.send({ type: 'broadcast', event, payload })
 *
 * Events:
 *   call:offer    { callId, offer, callType, callerProfile }
 *   call:answer   { callId, answer }
 *   call:ice      { callId, candidate }
 *   call:end      { callId, reason }  reason: 'declined'|'hangup'|'missed'
 */

import { supabase } from './supabase';

// STUN servers — Google's public ones, always available
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class CallEngine {
  constructor({ matchId, userId, onStateChange, onRemoteStream, onIncomingCall, onCallEnded }) {
    this.matchId        = matchId;
    this.userId         = userId;
    this.onStateChange  = onStateChange;   // (state) => void
    this.onRemoteStream = onRemoteStream;  // (stream) => void
    this.onIncomingCall = onIncomingCall;  // ({ callId, callType, callerProfile }) => void
    this.onCallEnded    = onCallEnded;     // (reason) => void

    this.pc             = null;   // RTCPeerConnection
    this.localStream    = null;   // MediaStream
    this.channel        = null;   // Supabase realtime channel
    this.currentCallId  = null;
    this.state          = 'idle'; // idle | ringing | calling | connected
    this._pendingCandidates = []; // ICE candidates buffered before remote desc is set
  }

  // ── Supabase signaling channel ─────────────────────────────

  async joinSignaling() {
    if (this.channel) return;
    this.channel = supabase.channel(`call:${this.matchId}`, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on('broadcast', { event: 'call:offer' },  ({ payload }) => this._onOffer(payload))
      .on('broadcast', { event: 'call:answer' }, ({ payload }) => this._onAnswer(payload))
      .on('broadcast', { event: 'call:ice' },    ({ payload }) => this._onIce(payload))
      .on('broadcast', { event: 'call:end' },    ({ payload }) => this._onRemoteEnd(payload));

    await new Promise(resolve => this.channel.subscribe(s => s === 'SUBSCRIBED' && resolve()));
  }

  _send(event, payload) {
    this.channel?.send({ type: 'broadcast', event, payload });
  }

  // ── Outgoing call ──────────────────────────────────────────

  async startCall({ callId, callType = 'audio', callerProfile }) {
    this.currentCallId = callId;
    this._setState('calling');

    this.localStream = await this._getMedia(callType);
    this._createPc();

    this.localStream.getTracks().forEach(t => this.pc.addTrack(t, this.localStream));

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    this._send('call:offer', { callId, offer, callType, callerProfile });
  }

  // ── Incoming call ──────────────────────────────────────────

  async _onOffer({ callId, offer, callType, callerProfile }) {
    // Ignore if we're already in a call
    if (this.state !== 'idle') return;

    this.currentCallId = callId;
    this._setState('ringing');

    // Surface to UI — UI shows banner + plays ringtone
    this.onIncomingCall?.({ callId, callType, callerProfile });

    // Store offer to set after user accepts
    this._pendingOffer = { offer, callType };
  }

  async acceptCall() {
    if (!this._pendingOffer) return;
    const { offer, callType } = this._pendingOffer;
    this._pendingOffer = null;
    this._setState('connected');

    this.localStream = await this._getMedia(callType);
    this._createPc();
    this.localStream.getTracks().forEach(t => this.pc.addTrack(t, this.localStream));

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this._flushCandidates();

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    this._send('call:answer', { callId: this.currentCallId, answer });
  }

  declineCall() {
    this._send('call:end', { callId: this.currentCallId, reason: 'declined' });
    this._cleanup('declined');
  }

  async _onAnswer({ callId, answer }) {
    if (callId !== this.currentCallId || !this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    await this._flushCandidates();
    this._setState('connected');
  }

  // ── ICE ───────────────────────────────────────────────────

  async _onIce({ callId, candidate }) {
    if (callId !== this.currentCallId) return;
    if (!candidate) return;
    if (this.pc?.remoteDescription) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      this._pendingCandidates.push(candidate);
    }
  }

  async _flushCandidates() {
    for (const c of this._pendingCandidates) {
      await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    this._pendingCandidates = [];
  }

  // ── Hang up ───────────────────────────────────────────────

  hangUp() {
    this._send('call:end', { callId: this.currentCallId, reason: 'hangup' });
    this._cleanup('hangup');
  }

  _onRemoteEnd({ callId, reason }) {
    if (callId !== this.currentCallId) return;
    this._cleanup(reason);
  }

  // ── RTCPeerConnection ─────────────────────────────────────

  _createPc() {
    this.pc = new RTCPeerConnection(ICE_SERVERS);

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this._send('call:ice', { callId: this.currentCallId, candidate: candidate.toJSON() });
    };

    this.pc.ontrack = ({ streams }) => {
      if (streams[0]) this.onRemoteStream?.(streams[0]);
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === 'connected') this._setState('connected');
      if (['disconnected', 'failed', 'closed'].includes(this.pc?.connectionState)) {
        this._cleanup('hangup');
      }
    };
  }

  // ── Media ─────────────────────────────────────────────────

  async _getMedia(callType) {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false,
    });
  }

  toggleMute() {
    const audio = this.localStream?.getAudioTracks()[0];
    if (audio) { audio.enabled = !audio.enabled; return !audio.enabled; }
    return false;
  }

  toggleCamera() {
    const video = this.localStream?.getVideoTracks()[0];
    if (video) { video.enabled = !video.enabled; return !video.enabled; }
    return false;
  }

  async switchCamera() {
    const video = this.localStream?.getVideoTracks()[0];
    if (!video) return;
    const current = video.getSettings().facingMode;
    const next    = current === 'user' ? 'environment' : 'user';
    const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next }, audio: false });
    const newTrack  = newStream.getVideoTracks()[0];
    const sender    = this.pc?.getSenders().find(s => s.track?.kind === 'video');
    if (sender) sender.replaceTrack(newTrack);
    video.stop();
    this.localStream.removeTrack(video);
    this.localStream.addTrack(newTrack);
  }

  // ── Helpers ───────────────────────────────────────────────

  _setState(state) {
    this.state = state;
    this.onStateChange?.(state);
  }

  _cleanup(reason) {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    this._pendingCandidates = [];
    this._pendingOffer = null;
    this.currentCallId = null;
    this._setState('idle');
    this.onCallEnded?.(reason);
  }

  destroy() {
    this._cleanup('hangup');
    this.channel?.unsubscribe();
    this.channel = null;
  }
}
