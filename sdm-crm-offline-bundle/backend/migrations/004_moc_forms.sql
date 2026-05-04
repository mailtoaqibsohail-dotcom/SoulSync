-- Phase 3 — MOC stage forms (Risk Screening / ISR / PSSR / Closeout)

CREATE TABLE IF NOT EXISTS moc_forms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  moc_id INT UNSIGNED NOT NULL,
  form_type ENUM('risk_screening','isr','pssr','closeout') NOT NULL,
  data JSON NOT NULL,
  status ENUM('draft','submitted','approved') NOT NULL DEFAULT 'draft',
  submitted_by INT UNSIGNED NULL,
  submitted_at DATETIME NULL,
  approved_by INT UNSIGNED NULL,
  approved_at DATETIME NULL,
  comments TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_moc_form (moc_id, form_type),
  KEY idx_moc_forms_status (status),
  CONSTRAINT fk_forms_moc       FOREIGN KEY (moc_id)        REFERENCES mocs(id)  ON DELETE CASCADE,
  CONSTRAINT fk_forms_submitter FOREIGN KEY (submitted_by)  REFERENCES users(id),
  CONSTRAINT fk_forms_approver  FOREIGN KEY (approved_by)   REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
