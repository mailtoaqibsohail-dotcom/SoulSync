import React, { useRef, useState } from 'react';
import { FiX, FiHeart, FiStar, FiMapPin, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const SwipeCard = ({ user, onLike, onDislike, onSuperLike, style = {} }) => {
  const cardRef = useRef(null);
  const startX = useRef(null);
  const startY = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const photos = user.photos?.length ? user.photos : [user.profilePhoto || '/placeholder.jpg'];

  // ── Gesture helpers ───────────────────────────────────
  const getRotation = () => `${offset.x * 0.05}deg`;
  const getLikeOpacity = () => Math.min(Math.max(offset.x / 80, 0), 1);
  const getNopeOpacity = () => Math.min(Math.max(-offset.x / 80, 0), 1);

  const handleDragStart = (clientX, clientY) => {
    startX.current = clientX;
    startY.current = clientY;
    setDragging(true);
  };

  const handleDragMove = (clientX, clientY) => {
    if (!dragging) return;
    setOffset({
      x: clientX - startX.current,
      y: clientY - startY.current,
    });
  };

  const handleDragEnd = () => {
    setDragging(false);
    const threshold = 100;
    if (offset.x > threshold) {
      animateOut('right', onLike);
    } else if (offset.x < -threshold) {
      animateOut('left', onDislike);
    } else {
      // Snap back
      setOffset({ x: 0, y: 0 });
    }
  };

  const animateOut = (direction, callback) => {
    const flyX = direction === 'right' ? 600 : -600;
    setOffset({ x: flyX, y: offset.y - 100 });
    setTimeout(() => callback && callback(user._id), 300);
  };

  // ── Mouse events ──────────────────────────────────────
  const onMouseDown = (e) => handleDragStart(e.clientX, e.clientY);
  const onMouseMove = (e) => { if (dragging) handleDragMove(e.clientX, e.clientY); };
  const onMouseUp = () => handleDragEnd();

  // ── Touch events ──────────────────────────────────────
  const onTouchStart = (e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchEnd = () => handleDragEnd();

  // ── Photo navigation ──────────────────────────────────
  const nextPhoto = (e) => {
    e.stopPropagation();
    setPhotoIndex((i) => (i + 1) % photos.length);
  };
  const prevPhoto = (e) => {
    e.stopPropagation();
    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
  };

  const age = user.age || (user.dateOfBirth
    ? Math.floor((Date.now() - new Date(user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null);

  return (
    <div
      ref={cardRef}
      className="swipe-card"
      style={{
        transform: `translateX(${offset.x}px) translateY(${offset.y}px) rotate(${getRotation()})`,
        transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(.17,.67,.35,1.2)',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        ...style,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Photo */}
      <div className="swipe-card__photo-wrapper">
        <img
          src={photos[photoIndex]}
          alt={user.name}
          className="swipe-card__photo"
          draggable={false}
        />

        {/* Photo dots */}
        {photos.length > 1 && (
          <div className="swipe-card__dots">
            {photos.map((_, i) => (
              <span key={i} className={`swipe-card__dot ${i === photoIndex ? 'active' : ''}`} />
            ))}
          </div>
        )}

        {/* Photo nav arrows */}
        {photos.length > 1 && (
          <>
            {photoIndex > 0 && (
              <button className="swipe-card__nav swipe-card__nav--left" onClick={prevPhoto}>
                <FiChevronLeft />
              </button>
            )}
            {photoIndex < photos.length - 1 && (
              <button className="swipe-card__nav swipe-card__nav--right" onClick={nextPhoto}>
                <FiChevronRight />
              </button>
            )}
          </>
        )}

        {/* LIKE / NOPE stamps */}
        <div className="swipe-card__stamp swipe-card__stamp--like" style={{ opacity: getLikeOpacity() }}>
          LIKE
        </div>
        <div className="swipe-card__stamp swipe-card__stamp--nope" style={{ opacity: getNopeOpacity() }}>
          NOPE
        </div>

        {/* Gradient overlay */}
        <div className="swipe-card__gradient" />

        {/* User info overlay */}
        <div className="swipe-card__info" onClick={() => setShowInfo(!showInfo)}>
          <div className="swipe-card__name-row">
            <h2>
              {user.name}
              {user.isVerified && <span className="verified-badge">✓</span>}
            </h2>
            {age && <span className="swipe-card__age">{age}</span>}
          </div>
          {user.location?.city && (
            <p className="swipe-card__location">
              <FiMapPin size={13} /> {user.location.city}
              {user.distance && ` · ${user.distance} km away`}
            </p>
          )}
          {showInfo && user.bio && (
            <p className="swipe-card__bio">{user.bio}</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="swipe-card__actions">
        <button
          className="swipe-card__btn swipe-card__btn--dislike"
          onClick={() => animateOut('left', onDislike)}
          title="Pass"
        >
          <FiX size={28} />
        </button>
        <button
          className="swipe-card__btn swipe-card__btn--superlike"
          onClick={() => onSuperLike && onSuperLike(user._id)}
          title="Super Like"
        >
          <FiStar size={22} />
        </button>
        <button
          className="swipe-card__btn swipe-card__btn--like"
          onClick={() => animateOut('right', onLike)}
          title="Like"
        >
          <FiHeart size={28} />
        </button>
      </div>
    </div>
  );
};

export default SwipeCard;
