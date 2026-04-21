import React, { createContext, useContext, useState, useCallback } from 'react';

const ChatPopupContext = createContext(null);

export const ChatPopupProvider = ({ children }) => {
  // openPopups: [{ matchId, user, minimised }]
  const [openPopups, setOpenPopups] = useState([]);

  const openChat = useCallback((matchId, user) => {
    setOpenPopups((prev) => {
      // Already open — just un-minimise it
      if (prev.find((p) => p.matchId === matchId)) {
        return prev.map((p) => p.matchId === matchId ? { ...p, minimised: false } : p);
      }
      // Max 3 popups at once on desktop
      const next = prev.length >= 3 ? prev.slice(1) : prev;
      return [...next, { matchId, user, minimised: false }];
    });
  }, []);

  const closeChat = useCallback((matchId) => {
    setOpenPopups((prev) => prev.filter((p) => p.matchId !== matchId));
  }, []);

  const toggleMinimise = useCallback((matchId) => {
    setOpenPopups((prev) =>
      prev.map((p) => p.matchId === matchId ? { ...p, minimised: !p.minimised } : p)
    );
  }, []);

  return (
    <ChatPopupContext.Provider value={{ openPopups, openChat, closeChat, toggleMinimise }}>
      {children}
    </ChatPopupContext.Provider>
  );
};

export const useChatPopup = () => useContext(ChatPopupContext);
