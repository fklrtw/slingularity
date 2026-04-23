import React from 'react';
import { createPortal } from 'react-dom';
import './credits-menu.css';

interface CreditsMenuProps {
  onClose: () => void
}

/**
 * CreditsMenu component
 *
 * Provides a UI for displaying project credits, assets, and software licenses.
 */
export function CreditsMenu({ onClose }: CreditsMenuProps) {
  return createPortal(
    <div className="credits-overlay" onClick={onClose}>
      <div className="credits-panel" onClick={e => e.stopPropagation()}>
        <h2>Credits & Licenses</h2>
        <div className="credits-content">

          <div className="credits-group">
            <h3>Development & AI</h3>
            <div className="credits-item">
              <span className="credits-title">fklrtw</span>
              <span className="credits-desc">Lead Developer</span>
            </div>
            <div className="credits-item">
              <span className="credits-title">
                <a href="https://antigravity.google" target="_blank" rel="noopener noreferrer">Google Antigravity</a>
              </span>
              <span className="credits-desc">Agentic AI Assistant (Google DeepMind)</span>
            </div>
          </div>

          <div className="credits-group">
            <h3>3D Assets</h3>
            <div className="credits-item">
              <span className="credits-title">"low poly space ship"</span>
              <span className="credits-desc">
                by
                {' '}
                <a href="https://sketchfab.com/chrisonciuconcepts" target="_blank" rel="noopener noreferrer">chrisonciuconcepts</a>
              </span>
              <span className="credits-desc">
                Licensed under
                {' '}
                <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
              </span>
            </div>
          </div>

          <div className="credits-group">
            <h3>Typography</h3>
            <div className="credits-item">
              <span className="credits-title">Tiny5</span>
              <span className="credits-desc">
                by
                {' '}
                <a href="https://github.com/sc-schmidt/tiny5" target="_blank" rel="noopener noreferrer">Stefan Schmidt</a>
                , OFL-1.1
              </span>
            </div>
          </div>

          <div className="credits-group">
            <h3>Software Stack</h3>
            <div className="credits-item">
              <span className="credits-desc">
                Built with
                {' '}
                <a href="https://react.dev" target="_blank" rel="noopener noreferrer">React</a>
                ,
                {' '}
                <a href="https://threejs.org" target="_blank" rel="noopener noreferrer">Three.js</a>
                ,
                {' '}
                <a href="https://docs.pmnd.rs/react-three-fiber" target="_blank" rel="noopener noreferrer">React Three Fiber</a>
                ,
                {' '}
                <a href="https://strudel.cc" target="_blank" rel="noopener noreferrer">Strudel.js</a>
                ,
                {' '}
                <a href="https://zustand.pmnd.rs" target="_blank" rel="noopener noreferrer">Zustand</a>
                , and
                {' '}
                <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">Vite</a>
                .
              </span>
            </div>
          </div>

        </div>
        <div className="credits-actions">
          <button className="credits-btn" onClick={onClose}>Close</button>
        </div>
        <div className="credits-footer">
          v0.0.1 &copy; 2026 Slingularity
        </div>
      </div>
    </div>,
    document.body
  );
}
