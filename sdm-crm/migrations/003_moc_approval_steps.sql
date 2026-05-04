-- Phase 2 — MOC approval workflow

CREATE TABLE IF NOT EXISTS moc_approval_steps (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  moc_id INT UNSIGNED NOT NULL,
  seq INT NOT NULL,
  step_type ENUM('classify','approve','sme') NOT NULL,
  assignee_user_id INT UNSIGNED NULL,
  status ENUM('pending','approved','rejected','forwarded','skipped') NOT NULL DEFAULT 'pending',
  comments TEXT NULL,
  decision_by INT UNSIGNED NULL,
  decision_at DATETIME NULL,
  classification_set ENUM('minor','major') NULL,
  risk_level_set ENUM('low','high') NULL,
  forwarded_to_step_id INT UNSIGNED NULL,
  parent_step_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_moc_steps_moc (moc_id, seq),
  KEY idx_moc_steps_assignee (assignee_user_id, status),
  CONSTRAINT fk_steps_moc      FOREIGN KEY (moc_id)           REFERENCES mocs(id) ON DELETE CASCADE,
  CONSTRAINT fk_steps_assignee FOREIGN KEY (assignee_user_id) REFERENCES users(id),
  CONSTRAINT fk_steps_decider  FOREIGN KEY (decision_by)      REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
