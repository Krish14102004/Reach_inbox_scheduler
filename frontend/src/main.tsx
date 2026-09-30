/**
 * FILE: frontend/src/main.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: React entry: mounts <App/> with StrictMode.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
