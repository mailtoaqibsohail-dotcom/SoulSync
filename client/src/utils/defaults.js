/* Shared default assets.
 *
 * DEFAULT_AVATAR: generic silhouette shown whenever a user has no profile
 * photo (or after they delete theirs). Inlined as a data URI SVG so it's
 * always available — no CDN dependency, no broken-image flashes. Inspired
 * by the classic Vecteezy default-avatar style.
 */

/* The silhouette is drawn inside a centred circle (r=92) so when the image
   is cropped into a round avatar (border-radius:50%) the head + shoulders
   never touch the edge. Previous versions used a full-bleed torso that got
   clipped on the sides when displayed in a circle. */
export const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
       <defs>
         <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="#3a3a3a"/>
           <stop offset="1" stop-color="#242424"/>
         </linearGradient>
         <clipPath id="ring">
           <circle cx="100" cy="100" r="92"/>
         </clipPath>
       </defs>
       <rect width="200" height="200" fill="url(#bg)"/>
       <g clip-path="url(#ring)">
         <circle cx="100" cy="82" r="30" fill="#b8b8b8"/>
         <ellipse cx="100" cy="196" rx="58" ry="52" fill="#b8b8b8"/>
       </g>
     </svg>`
  );

/* Pick a usable avatar for any user-shaped object. Pass the user, a URL,
 * or nothing — always get back something renderable. */
export const avatarFor = (userOrUrl) => {
  if (!userOrUrl) return DEFAULT_AVATAR;
  if (typeof userOrUrl === 'string') return userOrUrl || DEFAULT_AVATAR;
  return (
    userOrUrl.profilePhoto ||
    userOrUrl.avatar ||
    (Array.isArray(userOrUrl.photos) && userOrUrl.photos[0]) ||
    DEFAULT_AVATAR
  );
};
