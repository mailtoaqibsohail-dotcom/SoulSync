import React from 'react';
import NotificationBell from './NotificationBell';
import './FloatingInbox.css';

// Mobile surfaces the notification bell as a floating FAB. (The desktop
// navbar already renders <NotificationBell /> at top-right; on mobile
// navbar__right is display:none, so we re-host the bell in this floating
// wrapper. CSS only shows this wrapper at mobile breakpoints.)
const FloatingInbox = () => {
  return (
    <div className="floating-inbox-wrap">
      <NotificationBell />
    </div>
  );
};

export default FloatingInbox;
