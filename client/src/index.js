import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initCapacitor } from './native/capacitorBootstrap';

// Surface any uncaught error visibly so a crash on launch isn't a silent
// white screen. The on-screen banner saves a debugging round-trip when the
// device isn't tethered for logcat.
function showFatal(message) {
  try {
    let el = document.getElementById('fatal-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fatal-error';
      el.style.cssText = 'position:fixed;inset:0;background:#0d0d0d;color:#ff6b81;font:14px monospace;padding:24px;z-index:99999;overflow:auto;white-space:pre-wrap;';
      document.body && document.body.appendChild(el);
    }
    el.textContent = `Spark crashed:\n\n${message}\n\n(screenshot this and send to support)`;
  } catch { /* DOM not ready */ }
}
window.addEventListener('error', (e) => showFatal(`${e.message}\nat ${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack || ''}`));
window.addEventListener('unhandledrejection', (e) => showFatal(`Unhandled promise: ${e.reason?.message || e.reason}\n${e.reason?.stack || ''}`));

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  showFatal(`Render failed: ${e?.message}\n${e?.stack || ''}`);
}

// Native (Android/iOS) bootstrap — no-op in the browser. Splash hide,
// status bar, push permission, FCM token registration. Fire-and-forget;
// any internal failure is logged but won't take down the app.
initCapacitor().catch((e) => console.warn('[boot] initCapacitor threw:', e?.message));
