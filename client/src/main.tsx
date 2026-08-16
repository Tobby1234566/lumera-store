import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

/**
 * TODO(analytics): if you add Google Analytics, Plausible or similar, load the
 * provider script here (or in index.html) using an id from an environment
 * variable, e.g. import.meta.env.VITE_ANALYTICS_ID. Events are already emitted
 * through src/lib/analytics.ts.
 */

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
