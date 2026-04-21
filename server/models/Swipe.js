const mongoose = require('mongoose');

// Stores every like/dislike as its own tiny document instead of two giant arrays
// on the User schema. Scales to millions of rows without blowing out user docs.
const swipeSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  { timestamps: true }
);

// A given user can only swipe on another user once. If they re-swipe we upsert.
swipeSchema.index({ from: 1, to: 1 }, { unique: true });
// Used by match detection: "did <to> ever like <from>?"
swipeSchema.index({ to: 1, from: 1, action: 1 });

module.exports = mongoose.model('Swipe', swipeSchema);
