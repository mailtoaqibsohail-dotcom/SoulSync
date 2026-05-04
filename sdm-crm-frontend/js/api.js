const API_BASE = 'https://mari.proflowenergy.org/api';

const Api = {
  _token: null,

  setToken(t) { this._token = t; localStorage.setItem('sdm_token', t); },
  getToken()  { return this._token || localStorage.getItem('sdm_token'); },
  clearToken(){ this._token = null; localStorage.removeItem('sdm_token'); localStorage.removeItem('sdm_user'); },

  async _req(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(API_BASE + path, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  get(path)         { return this._req('GET', path); },
  post(path, body)  { return this._req('POST', path, body); },
  put(path, body)   { return this._req('PUT', path, body); },
  patch(path, body) { return this._req('PATCH', path, body); },
  del(path)         { return this._req('DELETE', path); },

  // Multipart upload (FormData) — does not set Content-Type so browser adds boundary
  async upload(path, formData) {
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API_BASE + path, { method: 'POST', headers, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
    return data;
  },

  // Download file
  async download(docId, serial) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/documents/${docId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${serial}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }
};
