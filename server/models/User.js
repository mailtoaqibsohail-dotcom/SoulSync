const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_.]+$/, 'Username can only contain letters, numbers, underscores, dots'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },

    // Profile
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['man', 'woman', 'non-binary', 'other'],
    },
    interestedIn: {
      type: [String],
      enum: ['men', 'women', 'everyone', 'non-binary'],
      default: ['everyone'],
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    photos: {
      type: [String], // array of Cloudinary URLs
      validate: {
        validator: (arr) => arr.length <= 6,
        message: 'Maximum 6 photos allowed',
      },
      default: [],
    },
    profilePhoto: {
      type: String,
      default: '',
    },

    // Location (GeoJSON for $geoNear queries)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      city: { type: String, default: '' },
      country: { type: String, default: '' },
    },

    // Preferences / Filters
    preferences: {
      ageRange: {
        min: { type: Number, default: 18, min: 18 },
        max: { type: Number, default: 50, max: 100 },
      },
      distance: { type: Number, default: 50 }, // km
      showMe: {
        type: String,
        enum: ['men', 'women', 'everyone'],
        default: 'everyone',
      },
    },

    // Matching
    likedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Status
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Password reset
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────
userSchema.index({ location: '2dsphere' }); // required for geospatial queries
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

// ── Virtual: age ─────────────────────────────────────────
userSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
});

// ── Pre-save: hash password ───────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Method: compare password ──────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Method: safe public profile (no private fields) ───────
userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    name: this.name,
    username: this.username,
    age: this.age,
    gender: this.gender,
    bio: this.bio,
    photos: this.photos,
    profilePhoto: this.profilePhoto,
    location: { city: this.location.city, country: this.location.country },
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    isVerified: this.isVerified,
  };
};

module.exports = mongoose.model('User', userSchema);
