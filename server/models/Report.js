const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reported: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        'spam',
        'fake_profile',
        'inappropriate_photos',
        'harassment',
        'underage',
        'scam',
        'other',
      ],
      default: 'other',
    },
    details: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed', 'actioned'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// One user can't spam-report the same person over and over
reportSchema.index({ reporter: 1, reported: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
