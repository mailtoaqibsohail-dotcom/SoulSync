import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initCapacitor } from './native/capacitorBootstrap';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Native (Android/iOS) bootstrap — no-op in the browser. Asks for push
// permission, registers the FCM token, hides the splash screen.
initCapacitor();
