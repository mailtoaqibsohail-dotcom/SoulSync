import React from 'react';
import { useChatPopup } from '../context/ChatPopupContext';
import ChatPopup from './ChatPopup';

const ChatPopupManager = () => {
  const { openPopups } = useChatPopup();

  return (
    <>
      {openPopups.map((popup, index) => (
        <ChatPopup
          key={popup.matchId}
          matchId={popup.matchId}
          user={popup.user}
          minimised={popup.minimised}
          index={index}
        />
      ))}
    </>
  );
};

export default ChatPopupManager;
