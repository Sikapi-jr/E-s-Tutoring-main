import React, { useState } from "react";
import Chatgpt from "./Chatgpt";
import "../styles/FloatingChat.css";

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Chat Icon */}
      <div className="floating-chat-icon" onClick={toggleChat}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className="chat-icon"
        >
          <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
        </svg>
        <span className="chat-tooltip">Need Help?</span>
      </div>

      {/* Chat Modal */}
      {isOpen && (
        <div className="chat-modal-overlay" onClick={closeChat}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>EGS Tutoring Support</h3>
              <button className="close-chat-btn" onClick={closeChat}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="chat-modal-content">
              <Chatgpt />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChat;