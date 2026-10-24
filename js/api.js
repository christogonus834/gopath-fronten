const API = ((window.BW_CONFIG && window.BW_CONFIG.API_URL) || '').replace(/\/$/, '');
const tok = {
  get: () => { try { return localStorage.getItem('bw_token'); } catch (e) { return null; } },
  set: t => { try { t ? localStorage.setItem('bw_token', t) : localStorage.removeItem('bw_token'); } catch (e) {} },
};

async function rawFetch(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const t = tok.get();
  if (t) headers.Authorization = 'Bearer ' + t;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(API + '/api' + path, { method, headers, body: payload }); }
  catch (e) { throw new Error('Cannot reach the server. Check your connection and try again.'); }
  if (res.status === 401 && t && !path.startsWith('/auth/')) window.dispatchEvent(new Event('bw-auth-expired'));
  return res;
}

async function api(path, opts) {
  const res = await rawFetch(path, opts);
  const isJson = (res.headers.get('content-type') || '').includes('json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Something went wrong. Please try again.');
    err.status = res.status;
    throw err;
  }
  return data;
}

// Downloads a file that needs the sign-in token (CSV exports).
async function download(path, filename) {
  const res = await rawFetch(path);
  if (!res.ok) throw new Error('Download failed.');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
