import React from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store';
import './privacy-menu.css';

interface PrivacyMenuProps {
  onClose: () => void
}

/**
 * PrivacyMenu component
 *
 * Provides a UI for displaying the privacy disclaimer and clearing stored data.
 */
export function PrivacyMenu({ onClose }: PrivacyMenuProps) {
  const clearData = () => {
    useGameStore.getState().clearStoredData();
    // Redirecting to the origin effectively clears the session and starts fresh
    // without triggering an immediate save from the current "dirty" state.
    window.location.replace(window.location.origin + window.location.pathname);
  };

  return createPortal(
    <div className="privacy-overlay" onClick={onClose}>
      <div className="privacy-panel" onClick={e => e.stopPropagation()}>
        <h2>Privacy Disclaimer</h2>
        <div className="privacy-content">
          <p>
            Slingularity uses your browser's
            {' '}
            <strong>local storage</strong>
            {' '}
            to improve your gaming experience. No
            personal data is collected or sent to any server.
          </p>
          <p>The following information is stored locally on your device:</p>
          <ul>
            <li>
              <strong>Game Settings:</strong>
              {' '}
              Your preferences for volume, graphics quality, and camera modes.
            </li>
            <li>
              <strong>High Scores:</strong>
              {' '}
              Your best scores achieved across different levels and sessions.
            </li>
          </ul>
          <p>
            You can clear this data at any time by clearing your browser's site data or cache.
          </p>
        </div>
        <div className="privacy-actions">
          <button
            className="privacy-btn privacy-btn-danger"
            onClick={clearData}
          >
            Clear Data & Reset
          </button>
          <button
            className="privacy-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
