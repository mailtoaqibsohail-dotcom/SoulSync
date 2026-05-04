-- Phase 4 — Lifecycle automation: temp expiry tracking + status='expired'

ALTER TABLE mocs
  MODIFY status ENUM('draft','in_review','approved','rejected','in_execution','pssr','closed','cancelled','expired') NOT NULL DEFAULT 'draft',
  ADD COLUMN expiry_warned_at DATETIME NULL AFTER closed_at,
  ADD COLUMN expired_at       DATETIME NULL AFTER expiry_warned_at;
