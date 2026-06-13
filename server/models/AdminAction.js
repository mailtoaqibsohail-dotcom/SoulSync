const mongoose = require('mongoose');

// Append-only audit log of every mutating admin action. Matters as soon as more
// than one person has admin access — answers "who banned this user and when".
const adminActionSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    adminEmail: { type: String, default: '' }, // denormalized so the log survives admin deletion
    action: {
      type: String,
      required: true,
      // e.g. ban, unban, verify, unverify, set_plan, edit_profile, edit_settings,
      // delete_user, add_note, remove_photo, resolve_report, bulk_ban, bulk_verify
    },
    targetType: { type: String, default: 'user' }, // user | report | photo
    targetId: { type: mongoose.Schema.Types.ObjectId },
    targetLabel: { type: String, default: '' }, // human-readable (name/@username) for the log view
    details: { type: mongoose.Schema.Types.Mixed, default: {} }, // before/after, reason, etc.
  },
  { timestamps: true }
);

adminActionSchema.index({ createdAt: -1 });
adminActionSchema.index({ targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAction', adminActionSchema);
