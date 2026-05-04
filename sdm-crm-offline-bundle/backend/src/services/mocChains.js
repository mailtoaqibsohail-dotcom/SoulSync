/**
 * Mari Energies MOC approval-chain definitions per MSP-HSE-08.
 *
 * Position codes are stable identifiers stored on each user
 * (users.moc_position). On submit, the workflow looks up the user
 * holding each position to populate the chain in order.
 *
 * `field_in_charge` is special: it's site-specific, so JRE picks the
 * Field In Charge user when filling the MOC form (stored in
 * mocs.jre_user_id is reused for the JRE; mocs.field_in_charge_user_id
 * holds the Field In Charge if you add one). For now we look up
 * by position scoped to the MOC's department_code, taking the first match.
 */

const POSITIONS = {
  field_in_charge:      'Field In Charge / Plant Manager / RMS',
  manager_production:   'Manager Production',
  moc_interface:        'MOC Interface (HO Operations – Process)',
  manager_mai:          'Manager MAI',
  engineering_manager:  'Engineering Manager',
  manager_hse:          'Manager HSE',
  manager_process_ops:  'Manager Process Operations',
  director_hse:         'Director HSE',
  director_ops:         'Director Operations',
  head_edp:             'Head EDP'
};

const BASE = [
  'field_in_charge',
  'manager_production',
  'moc_interface',
  'manager_mai',
  'engineering_manager',
  'manager_hse',
  'manager_process_ops',
  'director_hse',
  'director_ops'
];

// MSP-HSE-08 §3.4.3 — four chain variants
const CHAINS = {
  // Minor MOC: 9 reviewers after JRE (10 levels including JRE on the minute sheet)
  minor: BASE,

  // Major + Capital Project: Director Ops then Head EDP
  major_capital: [...BASE, 'head_edp'],

  // Major + Non-Capital: Head EDP between Director HSE and Director Ops
  major_noncapital: [
    'field_in_charge',
    'manager_production',
    'moc_interface',
    'manager_mai',
    'engineering_manager',
    'manager_hse',
    'manager_process_ops',
    'director_hse',
    'head_edp',
    'director_ops'
  ],

  // Field-Level MOC Package Development
  field_package: [
    'field_in_charge',
    'manager_production',
    'moc_interface',
    'manager_mai',
    'engineering_manager',
    'manager_hse',
    'manager_process_ops',
    'head_edp',
    'director_hse',
    'director_ops'
  ]
};

/**
 * Pick the chain key based on the MOC's classification + capital flag.
 * Fallback: minor.
 */
function chainKeyFor(moc) {
  if (moc.classification === 'major') {
    return moc.is_capital_project ? 'major_capital' : 'major_noncapital';
  }
  // Treat anything not 'major' as minor for chain purposes.
  return 'minor';
}

function chainFor(moc) {
  return CHAINS[chainKeyFor(moc)];
}

function positionLabel(code) {
  return POSITIONS[code] || code;
}

module.exports = { POSITIONS, CHAINS, BASE, chainFor, chainKeyFor, positionLabel };
