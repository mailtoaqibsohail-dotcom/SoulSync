const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Profile photo storage ─────────────────────────────────
// Accepts common web formats AND iPhone/HEIC and other raw formats.
// Cloudinary will store the original, and the transformation chain below
// forces delivery as JPEG — which every browser (incl. Safari/Chrome/Firefox)
// can render. Without `fetch_format: jpg` HEIC wouldn't display in Chrome.
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dating-app/profiles',
    allowed_formats: [
      'jpg', 'jpeg', 'png', 'webp', 'gif',
      'heic', 'heif', 'avif', 'tiff', 'tif', 'bmp',
    ],
    // fetch_format: 'jpg' → server transcodes HEIC/AVIF/etc to JPEG on delivery
    transformation: [
      { width: 1080, height: 1350, crop: 'limit' },
      { fetch_format: 'jpg', quality: 'auto' },
    ],
  },
});

// ── Chat media storage (images, video, audio) ─────────────
const chatMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video');
    const isAudio = file.mimetype.startsWith('audio');

    // Use 'auto' for audio+video so Cloudinary detects the correct resource type
    // and serves with proper MIME headers (needed for <audio>/<video> playback).
    // 'raw' would store audio without MIME headers — browsers can't play it.
    if (isAudio || isVideo) {
      return {
        folder: 'dating-app/chat-media',
        resource_type: 'auto',
      };
    }

    // Images
    return {
      folder: 'dating-app/chat-media',
      resource_type: 'image',
      allowed_formats: [
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        'heic', 'heif', 'avif', 'tiff', 'tif', 'bmp',
      ],
      transformation: [
        { width: 1080, crop: 'limit' },
        { fetch_format: 'jpg', quality: 'auto' },
      ],
    };
  },
});

// Lenient image filter — some browsers send HEIC as application/octet-stream.
// Accept anything whose MIME starts with image/ OR whose filename has a
// known image extension. Reject clearly non-image files.
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|tiff?|bmp)$/i;
const imageFileFilter = (req, file, cb) => {
  const mimeOk = file.mimetype && file.mimetype.startsWith('image/');
  const extOk = IMAGE_EXT.test(file.originalname || '');
  // Also allow the common octet-stream case for HEIC
  const octetHeic = file.mimetype === 'application/octet-stream' && extOk;
  if (mimeOk || extOk || octetHeic) return cb(null, true);
  cb(new Error('Unsupported image format'));
};

// Profile photo upload (max 15MB per photo — HEIC files are large)
const upload = multer({
  storage: profileStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

// Chat media upload (max 20MB for videos)
const uploadMedia = multer({
  storage: chatMediaStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = { cloudinary, upload, uploadMedia };
