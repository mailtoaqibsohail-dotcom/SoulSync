import React from 'react';
import { FiPhone, FiPhoneOff, FiVideo } from 'react-icons/fi';
import { useNotifications } from '../context/NotificationContext';
import './IncomingCallModal.css';

// Renders a full-screen ringing overlay when someone is calling the user.
// Hooks into NotificationContext — no props, purely driven by incomingCall state.
const IncomingCallModal = () => {
  const { incomingCall, acceptCall, rejectCall } = useNotifications();
  if (!incomingCall) return null;

  const { fromName, callType } = incomingCall;

  return (
    <div className="incoming-call-backdrop">
      <div className="incoming-call-modal">
        <div className="incoming-call-pulse" />
        <div className="incoming-call-avatar">
          {callType === 'video' ? <FiVideo size={48} /> : <FiPhone size={48} />}
        </div>
        <h2 className="incoming-call-name">{fromName}</h2>
        <p className="incoming-call-type">
          Incoming {callType} call…
        </p>

        <div className="incoming-call-actions">
          <button
            className="incoming-call-btn incoming-call-btn--reject"
            onClick={rejectCall}
            aria-label="Reject call"
          >
            <FiPhoneOff size={28} />
          </button>
          <button
            className="incoming-call-btn incoming-call-btn--accept"
            onClick={acceptCall}
            aria-label="Accept call"
          >
            <FiPhone size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
