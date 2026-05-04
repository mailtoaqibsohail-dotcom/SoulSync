/**
 * Seed initial data: roles + admin user
 * Run: node migrations/seed.js
 */
require('dotenv').config();
const { sequelize, Role, User } = require('../src/models');

const ROLES = [
  {
    name: 'admin',
    permissions: ['*']
  },
  {
    name: 'engineer',
    permissions: [
      'documents:create', 'documents:update_status',
      'clients:read', 'projects:read', 'projects:create'
    ]
  },
  {
    name: 'approver',
    permissions: [
      'documents:create', 'documents:update_status',
      'clients:read', 'projects:read'
    ]
  },
  {
    name: 'viewer',
    permissions: ['documents:read', 'clients:read', 'projects:read']
  },
  {
    name: 'client',
    permissions: ['documents:read', 'clients:read', 'projects:read']
  }
];

async function seed() {
  await sequelize.authenticate();

  for (const r of ROLES) {
    await Role.findOrCreate({ where: { name: r.name }, defaults: r });
    console.log(`Role: ${r.name}`);
  }

  const adminRole = await Role.findOne({ where: { name: 'admin' } });

  const [admin, created] = await User.findOrCreate({
    where: { email: 'admin@company.com' },
    defaults: {
      password_hash: 'Admin@123456',   // ← change immediately after first login
      first_name: 'System',
      last_name: 'Admin',
      department_code: 'MGMT',
      role_id: adminRole.id,
      is_active: true
    }
  });

  if (created) {
    console.log(`Admin user created: admin@company.com / Admin@123456`);
    console.log('⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN');
  } else {
    console.log('Admin user already exists');
  }

  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
