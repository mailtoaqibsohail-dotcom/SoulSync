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
      required: true,
    },
    text: {
      type: String,
      maxlength: [2000, 'Message too long'],
    },
    mediaUrl: {
      type: String, // photo/gif sent in chat
    },
    mediaType: {
      type: String,
      enum: ['image', 'gif', null],
      default: null,
    },
    read: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);

messageSchema.index({ matchId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model('Message', messageSchema);
