const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    // Track who liked whom first
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: { type: Boolean, default: true },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastActivity: { type: Date, default: Date.now },
    // Disappearing messages: 'never' | 'immediately' | '24h'
    disappearing: {
      mode: { type: String, enum: ['never', 'immediately', '24h'], default: 'never' },
    },
  },
  { timestamps: true }
);

matchSchema.index({ users: 1 });

module.exports = mongoose.model('Match', matchSchema);
