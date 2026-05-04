// ── Toast notifications ────────────────────────
function toast(msg, type = 'default') {
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', default: 'fa-info-circle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icons[type] || icons.default}"></i> ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Date helpers ───────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Status badge ───────────────────────────────
function statusBadge(s) {
  const labels = { draft: 'Draft', under_review: 'Under Review', approved: 'Approved', issued: 'Issued', cancelled: 'Cancelled', active: 'Active', on_hold: 'On Hold', completed: 'Completed' };
  return `<span class="badge badge-${s}">${labels[s] || s}</span>`;
}

// ── Serial badge ───────────────────────────────
function serialBadge(s) { return `<span class="serial-badge">${s}</span>`; }

// ── Initials ───────────────────────────────────
function initials(first, last) { return ((first||'')[0] + (last||'')[0]).toUpperCase(); }

// ── Loader html ────────────────────────────────
function loaderHtml() { return '<div class="loader"><div class="spinner"></div></div>'; }

// ── Empty state ────────────────────────────────
function emptyHtml(icon, msg) {
  return `<div class="empty-state"><i class="fas ${icon}"></i><p>${msg}</p></div>`;
}

// ── Current user ───────────────────────────────
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('sdm_user') || '{}'); }
  catch { return {}; }
}

function isAdmin() {
  const u = getCurrentUser();
  return u?.role?.name === 'admin';
}

function isClient() {
  const u = getCurrentUser();
  return u?.role?.name === 'client';
}

function hasPermission(perm) {
  const u = getCurrentUser();
  const perms = u?.role?.permissions || [];
  return perms.includes('*') || perms.includes(perm);
}

// ── Escape HTML ────────────────────────────────
function esc(s) {
  if (s === null || s === undefined || s === '') return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
