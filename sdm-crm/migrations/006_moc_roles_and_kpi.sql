-- Phase 5 — 12 MSP-HSE-08 MOC roles
-- All roles inherit moc:view + moc:update; only originator role grants moc:create.
-- Idempotent: only inserts a role if it does not already exist.

INSERT INTO roles (name, permissions)
SELECT 'moc_originator', JSON_ARRAY('moc:create','moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_originator');

INSERT INTO roles (name, permissions)
SELECT 'moc_jre', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_jre');

INSERT INTO roles (name, permissions)
SELECT 'moc_dept_head', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_dept_head');

INSERT INTO roles (name, permissions)
SELECT 'moc_asset_mgr', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_asset_mgr');

INSERT INTO roles (name, permissions)
SELECT 'moc_ops_mgr', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_ops_mgr');

INSERT INTO roles (name, permissions)
SELECT 'moc_hse_mgr', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_hse_mgr');

INSERT INTO roles (name, permissions)
SELECT 'moc_gm_ops', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_gm_ops');

INSERT INTO roles (name, permissions)
SELECT 'moc_gm_hse', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_gm_hse');

INSERT INTO roles (name, permissions)
SELECT 'moc_maint_mgr', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_maint_mgr');

INSERT INTO roles (name, permissions)
SELECT 'moc_process_eng', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_process_eng');

INSERT INTO roles (name, permissions)
SELECT 'moc_sme', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_sme');

INSERT INTO roles (name, permissions)
SELECT 'moc_closeout_officer', JSON_ARRAY('moc:view','moc:update')
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='moc_closeout_officer');
