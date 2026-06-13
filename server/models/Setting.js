const mongoose = require('mongoose');

// Singleton config document for the whole app (one row). Holds admin-editable
// settings that aren't per-user — chiefly the monetization config, which is
// intentionally left BLANK + editable so a payment provider can be plugged in
// later without code changes.
const settingSchema = new mongoose.Schema(
  {
    // Marks the single settings doc. Always 'global'.
    key: { type: String, default: 'global', unique: true },

    payment: {
      // e.g. 'stripe' | 'paypal' | 'manual' — blank until you choose one.
      provider: { type: String, default: '' },
      // Free-text: checkout link, publishable key, or instructions. Editable.
      checkoutConfig: { type: String, default: '' },
      // Monthly premium price. null = not set yet (MRR can't be computed).
      priceMonthly: { type: Number, default: null },
      currency: { type: String, default: 'USD' },
      // Whether the paywall is live. Off by default.
      enabled: { type: Boolean, default: false },
    },

    // Editable list of feature keys you intend to gate behind premium. Pure
    // scaffolding for now (no enforcement) — usage stats arrive once gated.
    premiumFeatures: { type: [String], default: [] },

    email: {
      // Optional Brevo API key to pull live sending usage on the System page.
      // Blank by default; editable.
      providerApiKey: { type: String, default: '' },
    },

    updatedByEmail: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
