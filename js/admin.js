// Admin area. Every list below is created, edited and deleted through the API; nothing is hard-coded.
const VST = ['Eligibility', 'Documents', 'Legalise', 'File', 'Follow up', 'Decision'];
const MENU = [['dashboard', 'Dashboard'], ['applicants', 'Applicants'], ['jobs', 'Jobs'], ['employers', 'Employers'], ['visa', 'Visa cases'], ['documents', 'Documents'], ['inbox', 'Inbox'], ['content', 'Site content'], ['text', 'Page text and images'], ['reports', 'Reports'], ['settings', 'Settings']];
const fmtD = d => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const getp = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const trunc = (v, n = 60) => { v = String(v ?? ''); return v.length > n ? v.slice(0, n) + '…' : v; };
let LK = {}, CUR = null, ADM = {};

const OPTS = {
  employers: r => r.map(x => [x.id, x.name]), destinations: r => r.map(x => [x.id, x.name]),
  categories: r => r.map(x => [x.id, x.name]), clients: r => r.map(x => [x.id, `${x.name} (${x.email})`]),
};

// One entry per editable list. f = form fields, cols = table columns.
const RES = {
  jobs: { t: 'Jobs', one: 'job', base: '/admin/jobs', need: ['employers', 'destinations', 'categories'],
    cols: [['title', 'Title'], ['employer.name', 'Employer'], ['destination.name', 'Destination'], ['category.name', 'Category'], ['city', 'City'], ['salary', 'Pay'], ['filled', 'Status', v => (v ? 'Filled' : 'Open')]],
    f: [{ k: 'title', l: 'Job title', req: 1 }, { k: 'employer_id', l: 'Employer', t: 'sel', o: 'employers', req: 1 }, { k: 'destination_id', l: 'Destination', t: 'sel', o: 'destinations', req: 1 }, { k: 'category_id', l: 'Category', t: 'sel', o: 'categories', req: 1 }, { k: 'city', l: 'City' }, { k: 'salary', l: 'Pay (e.g. €2,600/mo)' }, { k: 'sort', l: 'Order (lower shows first)', t: 'num' }, { k: 'filled', l: 'Position filled', t: 'bool' }] },
  employers: { t: 'Employers', one: 'employer', base: '/admin/employers',
    cols: [['name', 'Name'], ['country', 'Country'], ['contact_email', 'Contact'], ['verified', 'Verified', v => (v ? 'Yes' : 'No')]],
    f: [{ k: 'name', l: 'Company name', req: 1 }, { k: 'country', l: 'Country' }, { k: 'contact_email', l: 'Contact email' }, { k: 'phone', l: 'Phone' }, { k: 'notes', l: 'Internal notes', t: 'area' }, { k: 'verified', l: 'Verified employer (shows the badge on jobs)', t: 'bool' }] },
  visa: { t: 'Visa cases', one: 'visa case', base: '/admin/visa-cases', need: ['clients'],
    sub: 'The applicant is emailed and notified whenever the stage changes.',
    cols: [['user.name', 'Applicant'], ['destination', 'Destination'], ['route', 'Route'], ['stage', 'Stage', v => VST[v]], ['updated_at', 'Updated', fmtD]],
    f: [{ k: 'user_id', l: 'Applicant', t: 'sel', o: 'clients', req: 1 }, { k: 'destination', l: 'Destination' }, { k: 'route', l: 'Route (e.g. Skilled worker permit)' }, { k: 'stage', l: 'Stage', t: 'sel', o: VST.map((s, i) => [i, s]), req: 1 }, { k: 'notes', l: 'Internal notes', t: 'area' }] },
  categories: { t: 'Job categories', one: 'category', base: '/admin/categories',
    cols: [['name', 'Name'], ['color', 'Colour'], ['sort', 'Order']],
    f: [{ k: 'name', l: 'Name', req: 1 }, { k: 'color', l: 'Colour', t: 'color' }, { k: 'image_url', l: 'Thumbnail', t: 'img' }, { k: 'sort', l: 'Order (lower shows first)', t: 'num' }] },
  destinations: { t: 'Destinations', one: 'destination', base: '/admin/destinations',
    cols: [['name', 'Name'], ['route_text', 'Route text', v => trunc(v)], ['typical_time', 'Typical time'], ['sort', 'Order']],
    f: [{ k: 'name', l: 'Name', req: 1 }, { k: 'image_url', l: 'Photo', t: 'img' }, { k: 'route_text', l: 'Visa route description', t: 'area' }, { k: 'typical_time', l: 'Typical processing time (e.g. 6–12 weeks)' }, { k: 'sort', l: 'Order (lower shows first)', t: 'num' }] },
};
function contentRes(sec) {
  const s = SECTIONS[sec];
  const f = s.f.map(([k, l, t, o]) => ({ k, l, t: t == 'a' ? 'area' : t == 'i' ? 'img' : t == 's' ? 'sel' : 'text', o }));
  f.push({ k: 'sort', l: 'Order (lower shows first)', t: 'num' }, { k: 'active', l: 'Show on the site', t: 'bool' });
  const cols = f.filter(x => x.t != 'img' && x.k != 'sort' && x.k != 'active').slice(0, 3).map(x => [x.k, x.l, v => trunc(v)]);
  cols.push(['active', 'Shown', v => (v ? 'Yes' : 'Hidden')], ['sort', 'Order']);
  return { t: s.l, one: 'item', base: '/admin/content', list: '/admin/content?section=' + sec, add: { section: sec }, cols, f };
}

const head = (t, sub = '', right = '') => `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:center"><div><h2 style="font:700 26px Poppins;color:var(--n)">${t}</h2><span class="m">${sub}</span></div><div>${right}</div></div>`;
const refresh = async (site) => { if (site) SITE = null; KEEP = true; await render(); };
const stageSel = a => `<select data-id="${esc(a.id)}" onchange="setStage(this.dataset.id,this.value)" aria-label="Stage for ${esc(a.user && a.user.name)}">${ST.map((s, k) => `<option value="${k}"${k == a.stage ? ' selected' : ''}>${s}</option>`).join('')}</select>`;

function modal(html, wide) {
  closeModal();
  const d = document.createElement('div');
  d.className = 'mod' + (wide ? ' wide' : ''); d.id = 'modal';
  d.innerHTML = `<div role="dialog" aria-modal="true">${html}</div>`;
  d.addEventListener('mousedown', e => { if (e.target === d) closeModal(); });
  document.body.appendChild(d);
}
const closeModal = () => { const m = $('#modal'); if (m) m.remove(); };
document.addEventListener('keydown', e => { if (e.key == 'Escape') closeModal(); });

async function ADMIN() {
  const s = MENU.some(m => m[0] == qs.get('s')) ? qs.get('s') : 'dashboard';
  const body = await VIEWS[s]();
  return `<div class="adm"><aside class="side"><div class="logo" style="margin:0 8px 18px">${logoImg('light')}</div>${MENU.map(([k, l]) => `<a href="#/admin?s=${k}" data-r="admin" data-q="s=${k}" class="${k == s ? 'act' : ''}">${l}</a>`).join('')}</aside><div class="am" style="background:var(--l);min-width:0">${body}</div></div>`;
}
// runs after the admin page is on screen: a notification link can ask for an applicant to open
function afterAdmin() {
  const id = qs.get('open');
  if (id) { qs.delete('open'); try { history.replaceState(null, '', '#/admin?s=applicants'); } catch (e) {} openApplicant(id); }
}

// ---------- generic list + form ----------
async function crudView(cfg, top = '') {
  for (const n of cfg.need || []) LK[n] = await api(n == 'clients' ? '/admin/clients' : '/admin/' + n);
  const rows = await api(cfg.list || cfg.base);
  CUR = { cfg, rows };
  return head(cfg.t, cfg.sub || `${rows.length} item${rows.length == 1 ? '' : 's'}`, '<button class="btn sm" onclick="openForm()">+ Add</button>') + top +
    `<div class="tools"><input type="search" placeholder="Search this list" oninput="tfilter(this)" aria-label="Search"></div>` +
    `<div class="card tw"><table class="tb"><thead><tr>${cfg.cols.map(c => `<th>${esc(c[1])}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r => `<tr>${cfg.cols.map(([k, , fm]) => `<td>${esc(fm ? fm(getp(r, k)) : getp(r, k))}</td>`).join('')}<td class="act"><button class="btn sm o" data-id="${esc(r.id)}" onclick="openForm(this.dataset.id)">Edit</button> <button class="btn sm o dl" data-id="${esc(r.id)}" onclick="delRow(this.dataset.id)">Delete</button></td></tr>`).join('') || `<tr><td colspan="${cfg.cols.length + 1}" class="m">Nothing here yet. Use “+ Add”.</td></tr>`}</tbody></table></div>`;
}
function tfilter(inp) { const q = inp.value.toLowerCase(); document.querySelectorAll('.tb tbody tr').forEach(tr => { tr.hidden = q && !tr.textContent.toLowerCase().includes(q); }); }

function fieldHtml(f, v) {
  const n = `name="${f.k}"`, req = f.req ? ' required' : '', l = esc(f.l);
  if (f.t == 'bool') return `<label class="ck"><input type="checkbox" ${n}${v ? ' checked' : ''}> ${l}</label>`;
  if (f.t == 'area') return `<label>${l}<textarea ${n} rows="5"${req}>${esc(v)}</textarea></label>`;
  if (f.t == 'num') return `<label>${l}<input type="number" ${n} value="${esc(v)}"></label>`;
  if (f.t == 'color') return `<label>${l}<input type="color" ${n} value="${esc(col(v))}"></label>`;
  if (f.t == 'img') return `<label>${l}<span class="imgf"><input type="text" ${n} value="${esc(v)}" placeholder="https://… or upload"><input type="file" accept="image/*" onchange="upImg(this)"><img alt="" ${v ? `src="${safeUrl(v)}"` : 'hidden'}></span></label>`;
  if (f.t == 'sel') {
    const o = Array.isArray(f.o) ? f.o : OPTS[f.o](LK[f.o] || []);
    return `<label>${l}<select ${n}${req}>${f.req ? '' : '<option value=""></option>'}${o.map(([a, b]) => `<option value="${esc(a)}"${String(a) == String(v) ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`;
  }
  return `<label>${l}<input ${n} value="${esc(v)}"${req}></label>`;
}
function openForm(id) {
  const { cfg, rows } = CUR;
  const row = id ? rows.find(r => r.id == id) : { sort: Math.max(0, ...rows.map(r => r.sort || 0)) + 1, active: true, verified: true, stage: 0, color: '#1b6ef3' };
  modal(`<h3>${id ? 'Edit' : 'Add'} ${esc(cfg.one)}</h3><form class="ff" data-id="${esc(id || '')}" onsubmit="return saveForm(event)">${cfg.f.map(f => fieldHtml(f, row[f.k])).join('')}<div class="ft"><button type="button" class="btn o" onclick="closeModal()">Cancel</button><button class="btn">Save</button></div></form>`);
}
const saveForm = e => sb(e, async (fd, f) => {
  const { cfg } = CUR, id = f.dataset.id, body = { ...(cfg.add || {}) };
  cfg.f.forEach(fl => { body[fl.k] = fl.t == 'bool' ? f.elements[fl.k].checked : fd.get(fl.k); });
  await api(id ? `${cfg.base}/${id}` : cfg.base, { method: id ? 'PUT' : 'POST', body });
  closeModal(); toast(id ? 'Saved' : 'Added'); await refresh(true);
});
async function delRow(id) {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  try { await api(`${CUR.cfg.base}/${id}`, { method: 'DELETE' }); toast('Deleted'); await refresh(true); } catch (e) { toast(e.message, 5000); }
}
async function upImg(inp) {
  const file = inp.files[0]; if (!file) return;
  const fd = new FormData(); fd.append('file', file);
  try {
    toast('Uploading…');
    const r = await api('/admin/upload', { method: 'POST', form: fd });
    const w = inp.closest('.imgf'), img = w.querySelector('img');
    w.querySelector('input[type=text]').value = r.url; img.src = r.url; img.hidden = false; toast('Image uploaded');
  } catch (e) { toast(e.message, 5000); }
}

// ---------- views ----------
const VIEWS = {
  async dashboard() {
    const [s, apps, jobs] = await Promise.all([api('/admin/stats'), api('/admin/applications?limit=8'), api('/admin/jobs')]);
    const k = s.kpi, ks = [['Registered applicants', k.registered, '#1b6ef3'], ['Active jobs', k.activeJobs, '#16b8a6'], ['Placements completed', k.placements, '#7a5af8'], ['Visa cases in progress', k.visaOpen, '#e89a00']];
    const max = Math.max(1, ...s.months.map(m => Math.max(m.registered, m.placed)));
    const tot = s.placedByDestination.reduce((a, b) => a + b.count, 0), dc = ['#0b1f4b', '#1b6ef3', '#ffb020', '#16b8a6', '#7a5af8', '#ff6b57'];
    let at = 0;
    const grad = tot ? s.placedByDestination.map((d, i) => { const from = at; at += d.count / tot * 100; return `${dc[i % 6]} ${from}% ${at}%`; }).join(',') : '#e1e8f6 0 100%';
    const total = s.totalApplications || 1;
    return head('Admin dashboard', 'Live data from your database', '') +
      `<div class="g" style="margin:22px 0">${ks.map(x => `<div class="card" style="border-left:6px solid ${x[2]}"><span class="m">${x[0]}</span><div class="kp" style="color:${x[2]}">${x[1]}</div></div>`).join('')}</div>
<div class="g2" style="align-items:stretch;gap:22px"><div class="card"><b style="color:var(--n)">Registered vs placed, by month</b><div role="img" aria-label="Bar chart of registered and placed per month" style="display:flex;align-items:flex-end;justify-content:space-around;height:230px;margin-top:16px;border-bottom:2px solid #dbe4f5">${s.months.map(m => `<div style="display:flex;align-items:flex-end;gap:4px"><div class="bar" title="${m.registered} registered" style="background:#9bbcf0;height:${m.registered / max * 210}px"></div><div class="bar" title="${m.placed} placed" style="background:var(--n);height:${m.placed / max * 210}px"></div></div>`).join('')}</div><div style="display:flex;justify-content:space-around">${s.months.map(m => `<span class="m">${esc(m.label)}</span>`).join('')}</div><p class="m" style="margin-top:10px"><b style="color:#9bbcf0">■</b> Registered &nbsp; <b style="color:var(--n)">■</b> Placed</p></div>
<div class="card cen"><b style="color:var(--n)">Placements by destination</b><div role="img" aria-label="Donut chart of placements by destination" style="width:170px;height:170px;border-radius:50%;margin:20px auto;background:conic-gradient(${grad});display:grid;place-items:center"><div style="width:96px;height:96px;border-radius:50%;background:#fff"></div></div><p class="m">${tot ? s.placedByDestination.map((d, i) => `<b style="color:${dc[i % 6]}">■</b> ${esc(d.name)} ${Math.round(d.count / tot * 100)}%`).join(' &nbsp; ') : 'No placements yet. A placement is counted when an applicant reaches Relocation.'}</p></div></div>
<div class="card" style="margin:22px 0"><b style="color:var(--n)">Applicant pipeline</b>${s.pipeline.map((x, i) => `<div style="display:flex;align-items:center;gap:14px;margin-top:12px"><span style="flex:0 0 100px;font-size:14px">${x.name}</span><div class="pb" style="flex:1"><i style="width:${x.count / total * 100}%;background:${COL[i]}"></i></div><b>${x.count}</b></div>`).join('')}</div>
<div class="g2" style="align-items:start;gap:22px"><div class="card"><b style="color:var(--n)">Latest applications</b>${apps.map(a => `<div class="tr"><b>${esc(a.user.name)}</b><span class="m">${esc(a.profession || '')} · ${esc(a.destination || '')}</span>${stageSel(a)}</div>`).join('') || '<p class="m">No applications yet.</p>'}<p style="margin-top:12px">${L('admin', 'All applicants →', 'm', 's=applicants')}</p></div>
<div class="card"><b style="color:var(--n)">Jobs</b>${jobs.slice(0, 8).map(j => `<div class="tr"><b>${esc(j.title)}</b><span class="m">${esc(j.destination && j.destination.name)}</span><button class="btn sm o" data-id="${esc(j.id)}" data-f="${j.filled ? 1 : ''}" onclick="toggleFilled(this)">${j.filled ? 'Filled · reopen' : 'Open · mark filled'}</button></div>`).join('') || '<p class="m">No jobs yet.</p>'}<p style="margin-top:12px">${L('admin', 'Manage jobs →', 'm', 's=jobs')}</p></div></div>`;
  },

  async applicants() {
    const rows = await api('/admin/applications');
    return head('Applicants', `${rows.length} application${rows.length == 1 ? '' : 's'}. Changing a stage emails and notifies the applicant.`) +
      `<div class="tools"><input type="search" placeholder="Search name, email, profession" oninput="tfilter(this)" aria-label="Search"></div><div class="card tw"><table class="tb"><thead><tr><th>Applicant</th><th>Profession</th><th>Destination</th><th>Job</th><th>Stage</th><th>Applied</th><th></th></tr></thead><tbody>${rows.map(a => `<tr><td><b>${esc(a.user.name)}</b><br><span class="m mini">${esc(a.user.email)}</span></td><td>${esc(a.profession)}</td><td>${esc(a.destination)}</td><td>${esc(a.job ? a.job.title : 'General application')}</td><td>${stageSel(a)}</td><td>${fmtD(a.created_at)}</td><td class="act"><button class="btn sm o" data-u="${esc(a.user.id)}" onclick="openApplicant(this.dataset.u)">Open</button></td></tr>`).join('') || '<tr><td colspan="7" class="m">No applications yet.</td></tr>'}</tbody></table></div>`;
  },

  jobs: () => crudView(RES.jobs),
  employers: () => crudView(RES.employers),
  visa: () => crudView(RES.visa),

  async documents() {
    const rows = await api('/admin/documents');
    const pill = s => `<span class="pill ${s == 'rejected' ? 'bad' : s == 'approved' ? 'g1' : ''}">${s}</span>`;
    return head('Documents', 'Files are private. “View” opens a link that expires after 5 minutes.') +
      `<div class="tools"><input type="search" placeholder="Search applicant or document" oninput="tfilter(this)" aria-label="Search"></div><div class="card tw"><table class="tb"><thead><tr><th>Applicant</th><th>Document</th><th>File</th><th>Status</th><th>Uploaded</th><th></th></tr></thead><tbody>${rows.map(d => `<tr><td><b>${esc(d.user.name)}</b></td><td>${esc(d.doc_type)}</td><td class="mini">${esc(trunc(d.file_name, 30))}</td><td>${pill(d.status)}</td><td>${fmtD(d.uploaded_at)}</td><td class="act">${docBtns(d, d.user.id)}</td></tr>`).join('') || '<tr><td colspan="6" class="m">No documents uploaded yet.</td></tr>'}</tbody></table></div>`;
  },

  async inbox() {
    const [c, s] = await Promise.all([api('/admin/contacts'), api('/admin/subscribers')]);
    ADM.contacts = c;
    return head('Inbox', 'Messages from the contact form and newsletter sign-ups') +
      `<div class="card tw" style="margin-top:18px"><table class="tb"><thead><tr><th>From</th><th>Destination</th><th>Message</th><th>Status</th><th>Received</th><th></th></tr></thead><tbody>${c.map(m => `<tr><td><b>${esc(m.name)}</b><br><span class="m mini">${esc(m.email)}</span></td><td>${esc(m.destination)}</td><td>${esc(trunc(m.message, 70))}</td><td><select data-id="${esc(m.id)}" onchange="setContact(this.dataset.id,this.value)" aria-label="Status">${['new', 'read', 'replied'].map(x => `<option${x == m.status ? ' selected' : ''}>${x}</option>`).join('')}</select></td><td>${fmtD(m.created_at)}</td><td class="act"><button class="btn sm o" data-id="${esc(m.id)}" onclick="readContact(this.dataset.id)">Open</button> <button class="btn sm o dl" data-id="${esc(m.id)}" data-k="contacts" onclick="delSimple(this)">Delete</button></td></tr>`).join('') || '<tr><td colspan="6" class="m">No messages yet.</td></tr>'}</tbody></table></div>
<h3 style="font:600 18px Poppins;color:var(--n);margin:28px 0 10px">Newsletter subscribers (${s.length})</h3><div class="card tw"><table class="tb"><thead><tr><th>Email</th><th>Subscribed</th><th></th></tr></thead><tbody>${s.map(x => `<tr><td>${esc(x.email)}</td><td>${fmtD(x.created_at)}</td><td class="act"><button class="btn sm o dl" data-id="${esc(x.id)}" data-k="subscribers" onclick="delSimple(this)">Remove</button></td></tr>`).join('') || '<tr><td colspan="3" class="m">No subscribers yet.</td></tr>'}</tbody></table></div>`;
  },

  async content() {
    const sec = qs.get('sec') || 'stats';
    const cfg = RES[sec] || (SECTIONS[sec] ? contentRes(sec) : contentRes('stats'));
    const tabs = [...Object.keys(SECTIONS).map(k => [k, SECTIONS[k].l]), ['categories', 'Job categories'], ['destinations', 'Destinations']];
    return crudView(cfg, `<div class="tabs">${tabs.map(([k, l]) => `<a href="#/admin?s=content&sec=${k}" data-r="admin" data-q="s=content&sec=${k}" class="${k == sec ? 'act' : ''}">${esc(l)}</a>`).join('')}</div>`);
  },

  async text() {
    const s = await api('/admin/settings'); ADM.settings = s;
    const groups = [...new Set(SETTINGS_SCHEMA.map(x => x.g))];
    const field = x => {
      const v = s[x.k] ?? '';
      if (x.t == 'i') return `<label>${esc(x.l)}<span class="imgf"><input type="text" name="${x.k}" value="${esc(v)}" placeholder="Default photo in use"><input type="file" accept="image/*" onchange="upImg(this)"><img alt="" src="${safeUrl(v || x.d)}"></span></label>`;
      if (x.t == 'a') return `<label>${esc(x.l)}<textarea name="${x.k}" rows="3" placeholder="${esc(x.d)}">${esc(v)}</textarea></label>`;
      return `<label>${esc(x.l)}<input name="${x.k}" value="${esc(v)}" placeholder="${esc(x.d)}"></label>`;
    };
    return head('Page text and images', 'Change any heading, label or photo on the public site. Leave a field empty to use the default.') +
      `<form class="txt" onsubmit="return saveText(event)" style="margin-top:14px"><div class="sv"><button class="btn">Save changes</button></div>${groups.map((g, i) => `<details${i ? '' : ' open'}><summary>${esc(g)}</summary><div class="ff">${SETTINGS_SCHEMA.filter(x => x.g == g).map(field).join('')}</div></details>`).join('')}</form>`;
  },

  async reports() {
    const s = await api('/admin/stats'), k = s.kpi;
    return head('Reports', 'Download your data as spreadsheets (CSV)') +
      `<div class="g" style="margin:22px 0">${[['Registered applicants', k.registered], ['Applications', s.totalApplications], ['Placements', k.placements], ['Open visa cases', k.visaOpen]].map(x => `<div class="card"><span class="m">${x[0]}</span><div class="kp" style="color:var(--n)">${x[1]}</div></div>`).join('')}</div>
<div class="card"><div class="tr"><span><b>Applications</b><br><span class="m">Name, contact, profession, destination, job, stage</span></span><button class="btn sm o" style="flex:0" onclick="exportCsv('applications')">Download</button></div><div class="tr"><span><b>Contact messages</b><br><span class="m">Everything sent through the contact form</span></span><button class="btn sm o" style="flex:0" onclick="exportCsv('contacts')">Download</button></div><div class="tr"><span><b>Newsletter subscribers</b><br><span class="m">Email and sign-up date</span></span><button class="btn sm o" style="flex:0" onclick="exportCsv('subscribers')">Download</button></div></div>`;
  },

  async settings() {
    const s = await api('/admin/settings');
    return head('Settings', 'Alerts and your account') +
      `<div class="g2" style="align-items:start;gap:22px;margin-top:22px"><form class="card ff" onsubmit="return saveNotify(event)"><b style="color:var(--n)">Staff alerts</b><label>Alert email address<input name="notify_email" type="email" value="${esc(s.notify_email || '')}" placeholder="Leave empty to email every admin"></label><p class="m">New applicants, applications, messages and contact forms are emailed here. They always appear in the notification bell too.</p><div><button class="btn sm">Save</button></div></form>
<form class="card ff" onsubmit="return changePw(event)"><b style="color:var(--n)">Change your password</b><label>Current password<input name="current" type="password" required autocomplete="current-password"></label><label>New password<input name="password" type="password" minlength="8" required autocomplete="new-password"></label><label>Repeat new password<input name="again" type="password" minlength="8" required autocomplete="new-password"></label><div><button class="btn sm">Change password</button></div></form></div>`;
  },
};

// ---------- actions ----------
async function setStage(id, v) {
  try { await api('/admin/applications/' + id, { method: 'PATCH', body: { stage: v } }); toast('Stage updated. The applicant was notified.'); await refresh(); } catch (e) { toast(e.message, 5000); await refresh(); }
}
async function toggleFilled(b) {
  try { await api('/admin/jobs/' + b.dataset.id, { method: 'PUT', body: { filled: !b.dataset.f } }); await refresh(true); } catch (e) { toast(e.message); }
}
async function setContact(id, status) { try { await api('/admin/contacts/' + id, { method: 'PUT', body: { status } }); toast('Updated'); } catch (e) { toast(e.message); } }
function readContact(id) {
  const m = ADM.contacts.find(x => x.id == id);
  if (m.status == 'new') setContact(id, 'read');
  modal(`<h3>${esc(m.name)}</h3><p class="m">${esc(m.email)} · ${esc(m.destination)} · ${fmtD(m.created_at)}</p><p style="margin:16px 0;white-space:pre-wrap">${esc(m.message)}</p><div class="ft"><button class="btn o" onclick="closeModal()">Close</button><a class="btn" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: your message to ' + R('brand_a') + R('brand_b'))}" onclick="setContact('${esc(m.id)}','replied')">Reply by email</a></div>`);
}
async function delSimple(b) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  try { await api(`/admin/${b.dataset.k}/${b.dataset.id}`, { method: 'DELETE' }); toast('Deleted'); await refresh(); } catch (e) { toast(e.message); }
}
async function viewDoc(id) {
  const w = window.open('about:blank', '_blank');
  try { const r = await api(`/admin/documents/${id}/url`); w.location.href = r.url; } catch (e) { if (w) w.close(); toast(e.message); }
}
async function docStatus(id, status, uid) {
  try { await api('/admin/documents/' + id, { method: 'PATCH', body: { status } }); toast('Document ' + status); await refresh(); if (uid && $('#modal')) openApplicant(uid); } catch (e) { toast(e.message); }
}
const docBtns = (d, uid) => `<button class="btn sm o" data-id="${esc(d.id)}" onclick="viewDoc(this.dataset.id)">View</button> <button class="btn sm o" data-id="${esc(d.id)}" data-u="${esc(uid)}" onclick="docStatus(this.dataset.id,'approved',this.dataset.u)">Approve</button> <button class="btn sm o dl" data-id="${esc(d.id)}" data-u="${esc(uid)}" onclick="docStatus(this.dataset.id,'rejected',this.dataset.u)">Reject</button>`;
const exportCsv = what => download('/admin/export/' + what, what + '.csv').catch(e => toast(e.message));
const saveText = e => sb(e, async (fd) => {
  const cur = ADM.settings || {}, body = {};
  SETTINGS_SCHEMA.forEach(s => { const v = String(fd.get(s.k) ?? '').trim(); if (v !== (cur[s.k] ?? '')) body[s.k] = v; });
  if (!Object.keys(body).length) return toast('Nothing changed');
  await api('/admin/settings', { method: 'PUT', body }); toast('Saved. The public site now shows your changes.'); await refresh(true);
});
const saveNotify = e => sb(e, async fd => { await api('/admin/settings', { method: 'PUT', body: { notify_email: fd.get('notify_email') } }); toast('Saved'); });
const changePw = e => sb(e, async (fd, f) => {
  if (fd.get('password') != fd.get('again')) throw new Error('The new passwords do not match.');
  await api('/auth/change-password', { method: 'POST', body: { current: fd.get('current'), password: fd.get('password') } }); f.reset(); toast('Password changed');
});

// ---------- applicant detail ----------
async function openApplicant(id) {
  try {
    const d = await api('/admin/applicants/' + id), u = d.user;
    const pill = s => `<span class="pill ${s == 'rejected' ? 'bad' : s == 'approved' ? 'g1' : ''}">${s}</span>`;
    modal(`<h3>${esc(u.name)} ${u.active ? '' : '<span class="pill bad">Disabled</span>'}</h3>
<p class="m"><a class="lnk" href="mailto:${esc(u.email)}">${esc(u.email)}</a> · ${esc(u.phone || 'no phone')} · ${esc(u.profession || '')} · ${esc(u.destination || '')} · joined ${fmtD(u.created_at)}</p>
<div class="sec2"><b>Applications</b>${d.applications.map(a => `<div class="tr"><span>${esc(a.job ? a.job.title + ' · ' + (a.job.employer ? a.job.employer.name : '') : 'General application')}</span>${stageSel(a)}</div>`).join('') || '<p class="m">None.</p>'}</div>
<div class="sec2"><b>Documents</b>${d.documents.map(x => `<div class="tr"><span>${esc(x.doc_type)}<br><span class="m mini">${esc(trunc(x.file_name, 28))} · ${fmtD(x.uploaded_at)}</span></span>${pill(x.status)}<span style="flex:2 1 230px;text-align:right">${docBtns(x, u.id)}</span></div>`).join('') || '<p class="m">No documents yet.</p>'}</div>
<div class="sec2"><b>Visa cases</b>${d.visaCases.map(v => `<div class="tr"><span>${esc(v.route || v.destination || 'Visa case')}</span><span class="pill">${VST[v.stage]}</span></div>`).join('') || `<p class="m">None. Add one under ${L('admin', 'Visa cases', 'lnk', 's=visa')}.</p>`}</div>
<div class="sec2"><b>Messages</b><div class="thread" id="thread">${d.messages.map(m => `<div class="${m.sender == 'staff' ? 'st' : ''}"><small>${m.sender == 'staff' ? 'You' : esc(u.name)} · ${ago(m.created_at)}</small>${esc(m.body)}</div>`).join('') || '<span class="m">No messages yet.</span>'}</div><form data-u="${esc(u.id)}" onsubmit="return replyTo(event)" style="display:flex;gap:8px"><input name="body" placeholder="Reply to ${esc(u.name.split(' ')[0])}. They get an email and a notification." required maxlength="2000"><button class="btn sm">Send</button></form></div>
<div class="ft" style="justify-content:space-between"><span><button class="btn sm o" data-u="${esc(u.id)}" data-a="${u.active ? '' : 1}" onclick="toggleUser(this)">${u.active ? 'Disable account' : 'Enable account'}</button> <button class="btn sm o dl" data-u="${esc(u.id)}" onclick="deleteUser(this.dataset.u)">Delete applicant</button></span><button class="btn" onclick="closeModal()">Close</button></div>`, true);
    const t = $('#thread'); if (t) t.scrollTop = t.scrollHeight;
  } catch (e) { toast(e.message, 5000); }
}
const replyTo = e => sb(e, async fd => {
  const uid = e.target.dataset.u;
  await api(`/admin/applicants/${uid}/messages`, { method: 'POST', body: { body: fd.get('body') } }); toast('Reply sent'); openApplicant(uid);
});
async function toggleUser(b) { try { await api('/admin/users/' + b.dataset.u, { method: 'PATCH', body: { active: !!b.dataset.a } }); toast('Updated'); await refresh(); openApplicant(b.dataset.u); } catch (e) { toast(e.message); } }
async function deleteUser(id) {
  if (!confirm('Delete this applicant and all their documents, messages and applications? This cannot be undone.')) return;
  try { await api('/admin/users/' + id, { method: 'DELETE' }); closeModal(); toast('Applicant deleted'); await refresh(); } catch (e) { toast(e.message, 5000); }
}
