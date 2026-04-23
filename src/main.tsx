/**
 * Entry point for Slingularity.
 * Made with the help of Gemini.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import '@fontsource/tiny5/latin-400.css';
import '@fontsource/material-symbols-outlined/index.css';

/**
 * Application Entry Point
 *
 * Initializes the React root and mounts the primary App component.
 * Uses StrictMode for development safety and identifies the target DOM element by ID.
 */

// Mount the React application to the root DOM element
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
