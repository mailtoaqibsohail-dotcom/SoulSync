// One-off admin bootstrap. Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
// from the environment and upserts an admin account. Safe to re-run — if the
// email already exists it updates the password/name instead of duplicating.
//
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='strong-pass' node scripts/seedAdmin.js
//
// (or set those three in server/.env and just run `node scripts/seedAdmin.js`)
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

(async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, MONGO_URI } = process.env;

  if (!MONGO_URI) {
    console.error('✗ MONGO_URI missing in env');
    process.exit(1);
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('✗ Set ADMIN_EMAIL and ADMIN_PASSWORD (env or .env) before running.');
    process.exit(1);
  }
  if (ADMIN_PASSWORD.length < 8) {
    console.error('✗ ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    const email = ADMIN_EMAIL.toLowerCase().trim();
    const name = ADMIN_NAME || 'Administrator';

    let admin = await Admin.findOne({ email }).select('+password');
    if (admin) {
      admin.name = name;
      admin.password = ADMIN_PASSWORD; // re-hashed by pre-save hook
      admin.isActive = true;
      await admin.save();
      console.log(`✓ Updated existing admin: ${email}`);
    } else {
      admin = await Admin.create({ name, email, password: ADMIN_PASSWORD });
      console.log(`✓ Created admin: ${email}`);
    }
    console.log('  Log in at /admin/login with this email + password.');
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
