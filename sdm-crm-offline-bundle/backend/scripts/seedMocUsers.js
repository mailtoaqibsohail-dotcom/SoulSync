/**
 * Seed mock users for testing the Mari Energies MOC hierarchy chain.
 * Creates one user per position + an originator (JRE / engineer).
 * Reports-to relationships are wired from the bottom up so delegation works.
 *
 * Idempotent: if a user already exists by email, it is updated in place
 * (password reset, position/manager refreshed) rather than duplicated.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize, User, Role } = require('../src/models');

const PASSWORD = 'Mari@2026';

// Order matters: top of chain first so we know each user's manager id by the
// time we create their report. (HO Director Ops sits at the top.)
const PLAN = [
  { key: 'director_ops',        first: 'Daniyal',  last: 'Director-Ops',  email: 'director.ops@mari.test',        dept: 'MGMT', role: 'Approver', position: 'director_ops',        managerKey: null },
  { key: 'director_hse',        first: 'Hina',     last: 'Director-HSE',  email: 'director.hse@mari.test',        dept: 'HSE',  role: 'Approver', position: 'director_hse',        managerKey: 'director_ops' },
  { key: 'head_edp',            first: 'Imran',    last: 'Head-EDP',      email: 'head.edp@mari.test',            dept: 'EDP',  role: 'Approver', position: 'head_edp',            managerKey: 'director_ops' },
  { key: 'manager_process_ops', first: 'Salman',   last: 'MgrProcessOps', email: 'mgr.processops@mari.test',      dept: 'OPS',  role: 'Approver', position: 'manager_process_ops', managerKey: 'director_ops' },
  { key: 'manager_hse',         first: 'Sana',     last: 'MgrHSE',        email: 'mgr.hse@mari.test',             dept: 'HSE',  role: 'Approver', position: 'manager_hse',         managerKey: 'director_hse' },
  { key: 'engineering_manager', first: 'Faraz',    last: 'EngMgr',        email: 'eng.mgr@mari.test',             dept: 'ENG',  role: 'Approver', position: 'engineering_manager', managerKey: 'director_ops' },
  { key: 'manager_mai',         first: 'Bilal',    last: 'MgrMAI',        email: 'mgr.mai@mari.test',             dept: 'MAI',  role: 'Approver', position: 'manager_mai',         managerKey: 'engineering_manager' },
  { key: 'moc_interface',       first: 'Adeel',    last: 'MOCInterface',  email: 'moc.interface@mari.test',       dept: 'OPS',  role: 'Approver', position: 'moc_interface',       managerKey: 'manager_process_ops' },
  { key: 'manager_production',  first: 'Tariq',    last: 'MgrProduction', email: 'mgr.production@mari.test',      dept: 'OPS',  role: 'Approver', position: 'manager_production',  managerKey: 'moc_interface' },
  { key: 'field_in_charge',     first: 'Asad',     last: 'FieldInCharge', email: 'field.incharge@mari.test',      dept: 'OPS',  role: 'Approver', position: 'field_in_charge',     managerKey: 'manager_production' },
  // Originator (no MOC position — just an engineer who raises MOCs)
  { key: 'originator_jre',      first: 'Kamran',   last: 'JRE-Engineer',  email: 'jre.engineer@mari.test',        dept: 'OPS',  role: 'Engineer', position: null,                  managerKey: 'field_in_charge' }
];

(async () => {
  try {
    await sequelize.authenticate();

    const roles = await Role.findAll();
    const roleByName = Object.fromEntries(roles.map(r => [r.name, r.id]));

    const created = {};
    for (const p of PLAN) {
      const role_id = roleByName[p.role] || roleByName['Engineer'] || 2;
      const manager_user_id = p.managerKey ? created[p.managerKey].id : null;

      let user = await User.findOne({ where: { email: p.email } });
      if (user) {
        user.password_hash = PASSWORD;          // beforeUpdate bcrypts when changed
        user.first_name = p.first;
        user.last_name  = p.last;
        user.department_code = p.dept;
        user.role_id = role_id;
        user.moc_position = p.position;
        user.manager_user_id = manager_user_id;
        user.is_active = true;
        await user.save();
        console.log(`[updated] ${p.email}  (id=${user.id})`);
      } else {
        user = await User.create({
          email: p.email.toLowerCase(),
          password_hash: PASSWORD,
          first_name: p.first,
          last_name:  p.last,
          department_code: p.dept,
          role_id,
          moc_position: p.position,
          manager_user_id
        });
        console.log(`[created] ${p.email}  (id=${user.id})`);
      }
      created[p.key] = user;
    }

    console.log('\n=== LOGIN CREDENTIALS (all share the same password) ===');
    console.log(`Password for ALL accounts: ${PASSWORD}`);
    console.log('-------------------------------------------------------');
    for (const p of PLAN) {
      console.log(`${(p.position || 'originator').padEnd(22)}  ${p.email}`);
    }
    console.log('\nLogin URL: https://mari.proflowenergy.org/');
    process.exit(0);
  } catch (err) {
    console.error('SEED FAILED:', err);
    process.exit(1);
  }
})();
