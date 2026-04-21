import React from 'react';

/* Brand lockup used across the app (navbar, auth screens, etc.).
 *
 * The icon lives at /public/logo.png — drop a new file there to rebrand
 * without touching any JSX. The "Spark" wordmark stays in the gradient
 * style defined by .gradient-text.
 */
const Logo = ({ size = 28, className = '' }) => (
  <span className={`app-logo gradient-text ${className}`}>
    <img
      src="/logo.png"
      alt=""
      aria-hidden="true"
      className="app-logo__icon"
      style={{ width: size, height: size }}
    />
    <span className="app-logo__text">Spark</span>
  </span>
);

export default Logo;
