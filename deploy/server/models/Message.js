const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    text: {
      type: String,
      maxlength: [2000, 'Message too long'],
    },
    mediaUrl: {
      type: String,
    },
    mediaType: {
      type: String,
      enum: ['image', 'gif', 'video', 'audio', null],
      default: null,
    },
    read: { type: Boolean, default: false },
    readAt: Date,
    disappearing: { type: Boolean, default: false },
    viewed: { type: Boolean, default: false },
    // TTL field — MongoDB deletes doc automatically when this date is reached
    expireAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ matchId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });
// TTL: when expireAt is set and passes, MongoDB auto-deletes the doc.
messageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
