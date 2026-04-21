import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { consumePendingCall } from '../context/NotificationContext';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiPhone, FiVolume2, FiVolumeX } from 'react-icons/fi';
import './Call.css';

// Rough mobile detection — used to default audio routing to the earpiece
// on phones, and speaker on laptops/desktops.
const isMobileDevice = () =>
  typeof navigator !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

// Free Google STUN servers — required for WebRTC NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const Call = () => {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();

  const callType  = searchParams.get('type') || 'video';   // 'video' | 'audio'
  const userId    = searchParams.get('userId');
  const peerId    = searchParams.get('peerId');
  const isCaller  = searchParams.get('caller') === 'true'; // true = initiated call

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  // For audio calls we keep two sinks for the remote stream:
  //   • <audio>  → routes to the earpiece on iOS/Android (default on phones)
  //   • <video>  → routes to the loud speaker on iOS/Android
  // Toggling "speaker" just swaps which element owns the remote srcObject.
  const earpieceAudioRef = useRef(null);
  const speakerVideoRef  = useRef(null);
  const remoteStreamRef  = useRef(null);
  const pcRef            = useRef(null);
  const localStreamRef   = useRef(null);

  const [callStatus, setCallStatus] = useState(isCaller ? 'calling' : 'connecting'); // calling | connecting | connected | ended
  const [micOn,  setMicOn]  = useState(true);
  const [camOn,  setCamOn]  = useState(callType === 'video');
  // Speaker: desktop defaults to ON (laptops don't have an earpiece), mobile
  // audio calls default to OFF (earpiece mode, like a normal phone call).
  // Video calls always force speaker on — holding a phone flat to your ear
  // to watch video makes no sense.
  const [speakerOn, setSpeakerOn] = useState(() => callType === 'video' || !isMobileDevice());
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  // Queue ICE candidates that arrive before setRemoteDescription
  const pendingIceRef = useRef([]);

  // ── Setup local media & peer connection ───────────────
  useEffect(() => {
    if (!socket) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const constraints = {
          audio: true,
          video: callType === 'video' ? { width: 1280, height: 720 } : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Create peer connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (e) => {
          const rs = e.streams[0];
          remoteStreamRef.current = rs;
          if (callType === 'video') {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = rs;
          } else {
            // Audio call: route to earpiece or speaker sink depending on
            // speakerOn. The "off" sink is kept but muted so it doesn't
            // double-play.
            routeAudioToSink(rs, speakerOn);
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('call:ice-candidate', { to: peerId, candidate: e.candidate, matchId });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setCallStatus('connected');
            if (!timerRef.current) {
              timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
            }
          }
          if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
            endCall();
          }
        };

        if (isCaller) {
          // Caller: create + send offer. Include our display name so the
          // callee's ringing screen shows who it is.
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:offer', {
            to: peerId,
            offer,
            matchId,
            callType,
            from: userId,
            fromName: user?.name || 'Someone',
          });
        } else {
          // Callee: consume the offer the NotificationContext buffered for us.
          const pending = consumePendingCall();
          if (pending?.offer) {
            await pc.setRemoteDescription(new RTCSessionDescription(pending.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('call:answer', { to: pending.from || peerId, answer, matchId });

            // Apply any ICE candidates that arrived before we mounted
            for (const c of pending.candidates || []) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c.candidate));
              } catch (err) { console.warn('Buffered ICE apply failed:', err); }
            }
            setCallStatus('connecting');
          } else {
            // No pending offer — nothing to answer. Bail out cleanly.
            console.warn('Callee mounted without a pending offer');
            alert('The call has expired or was cancelled.');
            navigate(-1);
            return;
          }
        }
      } catch (err) {
        console.error('Media error:', err);
        alert(`Could not access ${callType === 'video' ? 'camera/microphone' : 'microphone'}. Please check permissions.`);
        navigate(-1);
      }
    };

    setup();

    // ── Socket listeners (post-setup events) ──────────────
    // Caller: receive the answer
    const onAnswer = async ({ answer }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[Call] answer applied, flushing', pendingIceRef.current.length, 'ICE');
        // Flush any ICE candidates that arrived before we had a remote description
        for (const c of pendingIceRef.current) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); }
          catch (err) { console.warn('Flushed ICE failed:', err); }
        }
        pendingIceRef.current = [];
      } catch (err) { console.error('setRemoteDescription(answer) failed:', err); }
    };

    // Both sides: new ICE candidate from peer
    const onIce = async ({ candidate }) => {
      try {
        if (!pcRef.current) return;
        if (!pcRef.current.remoteDescription) {
          // Buffer until remote description is set
          pendingIceRef.current.push(candidate);
          return;
        }
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) { console.error('ICE add error:', err); }
    };

    const onEnded = () => {
      setCallStatus('ended');
      setTimeout(() => navigate(-1), 1500);
    };

    const onRejected = () => {
      setCallStatus('ended');
      setTimeout(() => navigate(-1), 1500);
    };

    socket.on('call:answer', onAnswer);
    socket.on('call:ice-candidate', onIce);
    socket.on('call:ended', onEnded);
    socket.on('call:rejected', onRejected);

    return () => {
      cancelled = true;
      socket.off('call:answer', onAnswer);
      socket.off('call:ice-candidate', onIce);
      socket.off('call:ended', onEnded);
      socket.off('call:rejected', onRejected);
    };
    // eslint-disable-next-line
  }, [socket]);

  // ── End call ──────────────────────────────────────────
  const endCall = () => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    clearInterval(timerRef.current);
    socket?.emit('call:end', { to: peerId, matchId });
    setCallStatus('ended');
    setTimeout(() => navigate(-1), 1500);
  };


  // ── Route remote audio to earpiece (<audio>) or speaker (<video>) ─
  // iOS Safari has no direct API for choosing audio output — but it routes
  // <audio> elements to the earpiece and <video> elements to the loud
  // speaker. We attach the stream to one, mute the other, and optionally
  // call setSinkId('communications') where supported (desktop Chrome).
  const routeAudioToSink = (stream, useSpeaker) => {
    const ear = earpieceAudioRef.current;
    const spk = speakerVideoRef.current;
    if (!stream || (!ear && !spk)) return;

    if (useSpeaker) {
      if (ear) { ear.srcObject = null; ear.muted = true; }
      if (spk) {
        spk.srcObject = stream;
        spk.muted = false;
        spk.play?.().catch(() => {});
        if (typeof spk.setSinkId === 'function') {
          spk.setSinkId('default').catch(() => {});
        }
      }
    } else {
      if (spk) { spk.srcObject = null; spk.muted = true; }
      if (ear) {
        ear.srcObject = stream;
        ear.muted = false;
        ear.play?.().catch(() => {});
        if (typeof ear.setSinkId === 'function') {
          // 'communications' picks the phone earpiece where supported.
          ear.setSinkId('communications').catch(() => {
            ear.setSinkId('default').catch(() => {});
          });
        }
      }
    }
  };

  const toggleSpeaker = () => {
    if (callType === 'video') return; // speaker is always on during video
    const next = !speakerOn;
    setSpeakerOn(next);
    routeAudioToSink(remoteStreamRef.current, next);
  };

  // ── Toggle mic ────────────────────────────────────────
  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setMicOn(audioTrack.enabled); }
  };

  // ── Toggle camera ─────────────────────────────────────
  const toggleCam = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setCamOn(videoTrack.enabled); }
  };

  const formatDuration = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className={`call-page ${callType}`}>

      {/* Remote video (full screen background) */}
      {callType === 'video' && (
        <video ref={remoteVideoRef} className="call-remote-video" autoPlay playsInline />
      )}

      {/* Audio-only background */}
      {callType === 'audio' && (
        <div className="call-audio-bg">
          <div className="call-audio-pulse" />
          <div className="call-audio-icon"><FiPhone size={48} /></div>
        </div>
      )}

      {/* Local video (picture-in-picture) */}
      {callType === 'video' && (
        <video ref={localVideoRef} className="call-local-video" autoPlay playsInline muted />
      )}

      {/* Audio sinks — rendered for audio calls only. We keep BOTH an
          <audio> (earpiece on iOS/Android) and a hidden muted <video>
          (loud speaker on iOS/Android) and swap which one owns the
          remote stream when the user toggles speaker mode. */}
      {callType === 'audio' && (
        <>
          <audio ref={earpieceAudioRef} autoPlay playsInline />
          <video
            ref={speakerVideoRef}
            autoPlay
            playsInline
            style={{ width: 1, height: 1, position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          />
        </>
      )}

      {/* Status overlay */}
      <div className="call-overlay">
        <div className="call-status-text">
          {callStatus === 'calling'    && <><div className="call-dots"><span/><span/><span/></div><p>Calling...</p></>}
          {callStatus === 'connecting' && <><div className="call-dots"><span/><span/><span/></div><p>Connecting...</p></>}
          {callStatus === 'connected'  && <p className="call-timer">{formatDuration(duration)}</p>}
          {callStatus === 'ended'      && <p>Call ended</p>}
        </div>
      </div>

      {/* Controls */}
      <div className="call-controls">
        <button className={`call-btn ${micOn ? '' : 'off'}`} onClick={toggleMic} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}>
          {micOn ? <FiMic size={22} /> : <FiMicOff size={22} />}
        </button>

        {callType === 'audio' && (
          <button
            className={`call-btn ${speakerOn ? 'on' : ''}`}
            onClick={toggleSpeaker}
            aria-label={speakerOn ? 'Switch to earpiece' : 'Switch to loud speaker'}
            title={speakerOn ? 'Speaker on — tap for earpiece' : 'Earpiece — tap for loud speaker'}
          >
            {speakerOn ? <FiVolume2 size={22} /> : <FiVolumeX size={22} />}
          </button>
        )}

        {callType === 'video' && (
          <button className={`call-btn ${camOn ? '' : 'off'}`} onClick={toggleCam} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}>
            {camOn ? <FiVideo size={22} /> : <FiVideoOff size={22} />}
          </button>
        )}

        <button className="call-btn call-btn--end" onClick={endCall} aria-label="End call">
          <FiPhoneOff size={26} />
        </button>
      </div>

    </div>
  );
};

export default Call;
