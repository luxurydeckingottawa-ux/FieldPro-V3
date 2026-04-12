import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';

// Initialize Sentry if DSN is configured
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE, // 'production' on Netlify, 'development' locally
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,      // GDPR: mask customer data in replays
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.2,     // 20% of transactions traced (keeps quota low)
    replaysSessionSampleRate: 0.05,  // 5% of sessions recorded
    replaysOnErrorSampleRate: 1.0,   // 100% of sessions with errors recorded
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
