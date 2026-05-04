-- 007_moc_hierarchy.sql
-- Mari Energies MOC approval hierarchy per MSP-HSE-08:
--   JRE → Field In Charge → Mgr Production → MOC Interface → Mgr MAI →
--   Eng Mgr → Mgr HSE → Mgr Process Ops → Director HSE → Director Ops [→ Head EDP]
--
-- 1. Add moc_position + manager_user_id to users.
-- 2. Extend moc_approval_steps with position_code + delegation tracking.

ALTER TABLE users
  ADD COLUMN moc_position VARCHAR(40) NULL AFTER department_code,
  ADD COLUMN manager_user_id INT UNSIGNED NULL AFTER moc_position,
  ADD INDEX idx_users_moc_position (moc_position),
  ADD INDEX idx_users_manager (manager_user_id),
  ADD CONSTRAINT fk_users_manager
    FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE moc_approval_steps
  ADD COLUMN position_code VARCHAR(40) NULL AFTER step_type,
  ADD COLUMN original_assignee_user_id INT UNSIGNED NULL AFTER assignee_user_id,
  ADD COLUMN delegated_at DATETIME NULL AFTER original_assignee_user_id,
  ADD INDEX idx_steps_position (position_code);

-- Allow 'hierarchy' as a step_type alongside the legacy classify/approve/sme.
ALTER TABLE moc_approval_steps
  MODIFY COLUMN step_type ENUM('classify','approve','sme','hierarchy') NOT NULL;

-- Allow 'cancelled' state (used when a reject voids the rest of the chain).
ALTER TABLE moc_approval_steps
  MODIFY COLUMN status ENUM('pending','approved','rejected','forwarded','skipped','cancelled') NOT NULL DEFAULT 'pending';

-- Extend MOC status to include 'revision_required' (rejection sends MOC back to originator).
ALTER TABLE mocs
  MODIFY COLUMN status ENUM(
    'draft','revision_required','in_review','approved','rejected',
    'in_execution','pssr','closed','cancelled','expired'
  ) NOT NULL DEFAULT 'draft';
