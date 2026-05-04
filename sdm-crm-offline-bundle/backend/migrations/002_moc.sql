-- Phase 1 — MOC tables (MariEnergies MSP-HSE-08)

CREATE TABLE IF NOT EXISTS moc_sequences (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind ENUM('moc','dispensation') NOT NULL,
  department_code VARCHAR(20) NOT NULL,
  field_name VARCHAR(120) NOT NULL,
  year INT NOT NULL,
  last_seq INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_moc_seq_slot (kind, department_code, field_name, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mocs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  moc_number VARCHAR(80) NOT NULL,
  doc_kind ENUM('moc','dispensation') NOT NULL DEFAULT 'moc',

  title VARCHAR(500) NOT NULL,
  department_code VARCHAR(20) NOT NULL,
  field_name VARCHAR(120) NOT NULL,
  facility VARCHAR(200) NULL,
  area_unit VARCHAR(200) NULL,

  duration ENUM('permanent','temporary') NOT NULL,
  expiry_date DATE NULL,
  type_subcategory ENUM('facility','technology','operations','analytical_method','document_psi','subtle','emergency','approved_project') NOT NULL,
  category ENUM('A','B','C','D') NOT NULL,
  priority ENUM('1','2','3') NOT NULL,
  classification ENUM('minor','major','pending') NOT NULL DEFAULT 'pending',
  risk_level ENUM('low','high','pending') NOT NULL DEFAULT 'pending',
  is_capital_project TINYINT(1) NOT NULL DEFAULT 0,

  background TEXT NULL,
  proposed_modification TEXT NULL,
  anticipated_benefit TEXT NULL,
  job_dependency ENUM('plant_shutdown','equipment_shutdown','load_reduction','normal_work') NULL,
  required_completion_date DATE NULL,

  stage TINYINT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('draft','in_review','approved','rejected','in_execution','pssr','closed','cancelled') NOT NULL DEFAULT 'draft',

  originator_id INT UNSIGNED NOT NULL,
  jre_user_id INT UNSIGNED NULL,
  client_id INT UNSIGNED NULL,
  project_id INT UNSIGNED NULL,

  initiated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  rejected_at DATETIME NULL,
  rejection_reason TEXT NULL,
  execution_started_at DATETIME NULL,
  pssr_completed_at DATETIME NULL,
  closed_at DATETIME NULL,

  pssr_conducted TINYINT(1) NULL,
  pssr_changes_communicated TINYINT(1) NULL,
  pssr_cat_a_actions_closed TINYINT(1) NULL,
  pssr_approved_for_startup TINYINT(1) NULL,

  closeout_drawings_redlined TINYINT(1) NULL,
  closeout_procedures_updated TINYINT(1) NULL,
  closeout_cat_b_actions_closed TINYINT(1) NULL,
  closeout_construction_dossier TINYINT(1) NULL,
  closeout_temp_reverted TINYINT(1) NULL,
  closeout_verification_record TINYINT(1) NULL,
  closeout_summary TEXT NULL,

  notes TEXT NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_moc_number (moc_number),
  KEY idx_mocs_status (status),
  KEY idx_mocs_stage (stage),
  KEY idx_mocs_dept (department_code),
  KEY idx_mocs_class (classification),
  KEY idx_mocs_expiry (expiry_date),
  KEY idx_mocs_originator (originator_id),
  KEY idx_mocs_jre (jre_user_id),
  CONSTRAINT fk_mocs_originator FOREIGN KEY (originator_id) REFERENCES users(id),
  CONSTRAINT fk_mocs_jre        FOREIGN KEY (jre_user_id)   REFERENCES users(id),
  CONSTRAINT fk_mocs_client     FOREIGN KEY (client_id)     REFERENCES clients(id),
  CONSTRAINT fk_mocs_project    FOREIGN KEY (project_id)    REFERENCES projects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Permissions: roles table stores JSON array of permission strings (consistent w/ existing scheme)
-- Add moc:create, moc:view, moc:update to admin + engineer roles
UPDATE roles
   SET permissions = JSON_ARRAY_APPEND(
                       JSON_ARRAY_APPEND(
                         JSON_ARRAY_APPEND(permissions, '$', 'moc:create'),
                       '$', 'moc:view'),
                     '$', 'moc:update')
 WHERE name IN ('admin','engineer')
   AND NOT JSON_CONTAINS(permissions, '"moc:create"');
