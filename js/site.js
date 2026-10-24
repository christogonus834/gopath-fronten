// GoPath Legal public site: pages, sign-in and the client dashboard.
// Layout and markup follow the demo; the content now comes from the API.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let SITE = null, ME = null, DASH = null, NOTES = { items: [], unread: 0 }, cur = 'home', qs = new URLSearchParams(), RT = 0, KEEP = false;

const DEF = {}; SETTINGS_SCHEMA.forEach(s => { DEF[s.k] = s.d; });
const R = k => (SITE.settings[k] != null && SITE.settings[k] !== '' ? SITE.settings[k] : DEF[k]); // raw text
const T = k => esc(R(k));                                                                           // escaped text
const items = s => SITE.content[s] || [];
const safeUrl = u => (/^(https?:\/\/|img\/)/i.test(u || '') ? esc(u) : '');
const col = c => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#1b6ef3');
const paras = t => esc(t).split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
// the image is applied by loadBg() once it has really loaded, so a bad URL never shows a broken box
const pic = (u, alt) => `data-bg="${safeUrl(u)}" role="img" aria-label="${esc(alt || '')}"`;
function loadBg() {
  document.querySelectorAll('[data-bg]').forEach(el => {
    if (el.dataset.done || !el.dataset.bg) return;
    el.dataset.done = 1;
    const u = el.dataset.bg, im = new Image();
    im.onload = () => { el.style.backgroundImage = `url("${u}")`; el.classList.add('ld'); };
    im.onerror = () => el.classList.add('nf');
    im.src = u;
  });
}

const IC = (d, s = 28) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const D = { s: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5', d: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6', v: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', c: 'M9 4h6v3H9zM6 6h12v15H6zM9 12h6M9 16h6', h: 'M3 11l9-7 9 7M5 10v10h14V10' };
const ICONS = { search: D.s, document: D.d, shield: D.v, clipboard: D.c, home: D.h };
const ST = ['Eligibility', 'Profile', 'Interview', 'Offer', 'Visa', 'Relocation'];
const COL = ['#ff6b57', '#16b8a6', '#7a5af8', '#e89a00', '#1b6ef3', '#3dbb6a'];
const DNAMES = () => SITE.destinations.map(d => d.name);

const toast = (t, ms = 2800) => { const e = $('#toast'); e.textContent = t; e.className = 'on'; clearTimeout(toast.t); toast.t = setTimeout(() => { e.className = ''; }, ms); };
const L = (r, t, c = '', q = '') => `<a href="#/${r}${q ? '?' + q : ''}" data-r="${r}" ${q ? `data-q="${q}"` : ''} class="${c}">${t}</a>`;
const ago = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };

// form helper: stops the browser submit, disables the button while working, shows errors as a toast
function sb(e, fn) {
  e.preventDefault();
  const f = e.target, b = f.querySelector('button:not([type=button])');
  if (b) b.disabled = true;
  Promise.resolve().then(() => fn(new FormData(f), f)).catch(err => toast(err.message, 5000)).finally(() => { if (b) b.disabled = false; });
  return false;
}

const MARK = `<svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" fill="#1b6ef3"/><path d="M6 24Q18 6 30 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M6 28h24M13 18v10M23 18v10" stroke="#ffb020" stroke-width="3" stroke-linecap="round"/></svg>`;
const deco = `<i class="ring" style="right:-90px;top:60px"></i><i class="pl" style="left:3%;top:70px"></i><i class="pl x" style="right:6%;bottom:60px"></i>`;
const logoImg = v => `<img class="lg" src="${safeUrl(R(v == 'light' ? 'img_logo_light' : 'img_logo_dark'))}" alt="${esc(R('brand_a') + R('brand_b'))}">`;
const brand = (blue = '') => `<b style="font:inherit">${T('brand_a')}<span${blue ? ` style="color:${blue}"` : ''}>${T('brand_b')}</span></b>`;

const hdr = () => `<div class="top"><div class="w"><span>${T('office_address')} · ${T('phone')} · ${T('hours')}</span>${L('contact', T('topbar_cta'))}</div></div><nav class="nav"><div class="w">${L('home', logoImg('dark'), 'logo')}<button class="bg" aria-label="Menu" onclick="document.querySelector('.nav ul').classList.toggle('on')">${IC('M4 7h16M4 12h16M4 17h16', 28).replace('<svg', '<svg stroke="#0b1f4b"')}</button><ul>${[['home', 'Home'], ['jobs', 'Jobs'], ['visa', 'Visa services'], ['about', 'About'], ['contact', 'Contact']].map(x => `<li>${L(x[0], x[1], cur == x[0] ? 'act' : '')}</li>`).join('')}${ME ? `<li class="bellw"><button class="bell" aria-label="Notifications" onclick="toggleBell(event)">${IC('M6 9a6 6 0 0 1 12 0c0 6 3 7 3 7H3s3-1 3-7M10 20a2 2 0 0 0 4 0', 22).replace('<svg', '<svg stroke="#0b1f4b"')}${NOTES.unread ? `<i class="dot">${NOTES.unread > 99 ? '99+' : NOTES.unread}</i>` : ''}</button><div class="bellp" id="bellp" hidden></div></li>` : ''}<li>${ME ? L(ME.role == 'admin' ? 'admin' : 'dashboard', ME.role == 'admin' ? 'Admin' : 'My application', 'btn sm') + ' <a href="#/home" data-r="home" onclick="out()" style="margin-left:10px">Log out</a>' : L('login', 'Sign in', 'btn sm')}</li></ul></div></nav>`;

const ftr = () => `<footer><i class="ring" style="left:-120px;bottom:-120px;border-color:rgba(255,255,255,.06)"></i><div class="w"><div class="fg"><div><div class="logo" style="margin-bottom:12px">${logoImg('light')}</div><p>${T('footer_text')}</p></div><div><b>Services</b><ul><li>${L('jobs', 'Job search')}</li><li>${L('visa', 'Visa applications')}</li><li>${L('visa', 'Document legalisation')}</li></ul></div><div><b>Links</b><ul><li>${L('about', 'About us')}</li><li>${L('contact', 'Contact')}</li><li>${L('contact', 'Report suspicious contact')}</li><li>${L('login', 'Staff login')}</li></ul></div><div><b>Updates</b><form onsubmit="return sub(event)" style="display:flex;gap:8px"><input type="email" name="email" required placeholder="Email address" aria-label="Email address"><button class="btn sm">Join</button></form></div></div><p style="margin-top:36px;font-size:13px;border-top:1px solid rgba(255,255,255,.12);padding-top:20px">${T('footer_note')}</p></div></footer>`;

const jobCard = j => {
  const cat = SITE.categories.find(c => c.name == j.category) || {};
  return `<div class="card job hv" style="--k:${col(cat.color)}"><div class="th" ${pic(cat.image_url, j.category)}></div><div class="bd"><h3>${esc(j.title)}</h3><div class="m">${esc(j.employer)} · ${esc(j.city)}, ${esc(j.destination)}</div><div class="m">${esc(j.category)} · <b>${esc(j.salary)}</b></div>${j.verified ? '<div style="margin-top:8px"><span class="pill g1">Verified employer</span></div>' : ''}</div>${j.filled ? '<button class="btn sm" disabled>Filled</button>' : `<button class="btn sm" data-id="${esc(j.id)}" onclick="apply(this.dataset.id)">Apply</button>`}</div>`;
};
const banner = (t, imgKey) => `<section class="banner"><div class="ph" ${pic(R(imgKey), '')}></div><div class="w"><h1>${esc(t)}</h1><div class="crumb">Home / ${esc(t)}</div></div></section>`;
const heading = (p, extra = '') => `<span class="chip">${T(p + '_chip')}</span><h2 class="h2"${extra}>${T(p + '_title')} <em>${T(p + '_em')}</em></h2>`;

const quick = () => `<div class="apply"><div class="w"><form class="card" onsubmit="return qa(event)"><div class="chip">${T('apply_chip')}</div><h2 class="h2" style="margin-bottom:18px;font-size:26px">${T('apply_title')}</h2><div class="fr"><label>Full name<input name="name" required maxlength="100" placeholder="Your full name"></label><label>Destination<select name="destination">${DNAMES().map(d => `<option>${esc(d)}</option>`).join('')}</select></label><label>Phone<input name="phone" maxlength="40" placeholder="+000 000 0000"></label><label>Profession<input name="profession" required maxlength="100"></label><label>Email<input name="email" type="email" required></label><label>Upload CV<input name="cv" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"></label><label style="align-self:end"><button class="btn" style="width:100%;margin:0">Submit application</button></label></div></form></div></div>`;

const PAGES = {
  home: () => {
    const openJobs = SITE.jobs.filter(j => !j.filled);
    return `<section class="hero"><div class="ph" ${pic(R('img_hero'), 'Traveller walking through an airport with luggage')}></div><div class="w"><div><span class="chip">${T('hero_chip')}</span><h1>${T('hero_title')} <span>${T('hero_accent')}</span></h1><p class="lead">${T('hero_lead')}</p><p style="margin-top:28px;display:flex;gap:14px;flex-wrap:wrap">${L('jobs', T('hero_btn1'), 'btn wh')}${L('visa', T('hero_btn2'), 'btn ln')}</p><ul class="tick">${items('hero_ticks').map(t => `<li>${esc(t.title)}</li>`).join('')}</ul></div><div></div></div></section>${quick()}
<section class="sec">${deco}<div class="w g2"><div class="off"><div class="pic" style="min-height:420px" ${pic(R('img_about'), 'GoPath Legal team at work')}></div></div><div><span class="chip">${T('about_chip')}</span><h2 class="h2">${T('about_title')} <em>${T('about_em')}</em></h2><p class="m" style="font-size:15px;margin-bottom:20px">${T('about_lead')}</p>${items('about_items').map((x, i) => `<details${i ? '' : ' open'}><summary>${esc(x.title)}</summary><p>${esc(x.body)}</p></details>`).join('')}<p style="margin-top:20px">${L('about', T('about_btn'), 'btn')}</p></div></div></section>
<section class="stats"><div class="w">${items('stats').map(s => `<div><b>${esc(s.value)}</b><span>${esc(s.title)}</span></div>`).join('')}</div></section>
<section class="sec alt">${deco}<div class="w"><span class="chip">${T('jobs_chip')}</span><h2 class="h2">${T('jobs_title')} <em>${T('jobs_em')}</em></h2><div class="jb"><ul class="cats">${SITE.categories.map(c => `<li data-r="jobs" data-q="k=${encodeURIComponent(c.name)}"><span>${esc(c.name)}</span><span>→</span></li>`).join('')}</ul><div class="g" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr))">${openJobs.slice(0, 4).map(jobCard).join('') || '<p class="m">No open jobs right now. Check back soon.</p>'}</div></div><p style="margin-top:28px">${L('jobs', T('jobs_btn'), 'btn')}</p></div></section>
<section class="sec"><div class="w">${heading('svc')}<div class="g" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${items('services').map((s, i) => `<div class="card hv c${i % 5 + 1}"><div class="ico">${IC(ICONS[s.extra] || D.s)}</div><h3 style="font:600 17px Poppins;color:var(--n)">${esc(s.title)}</h3><p class="m" style="margin:6px 0 12px">${esc(s.body)}</p>${L('visa', 'Read more →', 'm')}</div>`).join('')}</div></div></section>
<section class="sec alt"><div class="w">${heading('dest')}<div class="g">${SITE.destinations.map(d => `<a href="#/jobs" data-r="jobs" data-q="d=${encodeURIComponent(d.name)}" class="dest" ${pic(d.image_url, d.name)}><div><h3>${esc(d.name)}</h3><span class="m" style="color:#cfe0ff">${openJobs.filter(j => j.destination == d.name).length} open roles →</span></div></a>`).join('')}</div></div></section>
<section class="sec"><div class="w"><div class="cta"><div><span class="chip">${T('cta_chip')}</span><h2>${T('cta_title')}</h2><p style="color:#c9d6f5;margin-bottom:22px">${T('cta_text')}</p>${L('login', T('cta_btn'), 'btn wh')}</div><div class="pic" ${pic(R('img_cta'), '')}></div></div></div></section>
<section class="sec alt">${deco}<div class="w">${heading('how')}<div class="steps">${items('how_steps').map((s, i) => `<div style="--k:${COL[i % 6]}"><b class="n">${i + 1}</b><b style="color:var(--n)">${esc(s.title)}</b><p class="m">${esc(s.body)}</p></div>`).join('')}</div></div></section>
<section class="sec"><div class="w">${heading('placed')}<div class="g">${items('placed').map((p, i) => `<div class="card cen hv" style="--k:${COL[i % 6]}"><div class="av" ${p.image_url ? `data-bg="${safeUrl(p.image_url)}"` : ''}>${esc((p.title || '?')[0])}</div><b style="color:var(--n)">${esc(p.title)}</b><div class="m">${esc(p.extra)}</div><span class="pill" style="margin-top:8px">${esc(p.value)}</span></div>`).join('')}</div></div></section>
<section class="sec alt"><div class="w">${heading('testi')}<div class="g" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))">${items('testimonials').map((t, i) => `<div class="card"><p style="font-size:30px;color:var(--b);line-height:1">“</p><p class="m" style="margin:6px 0 16px">${esc(t.body)}</p><div style="display:flex;gap:12px;align-items:center"><div class="av" ${t.image_url ? `data-bg="${safeUrl(t.image_url)}"` : ''} style="margin:0;width:52px;height:52px;font-size:16px;--k:${COL[i % 6]}">${esc((t.title || '?')[0])}</div><div><b style="color:var(--n)">${esc(t.title)}</b><div class="m">${esc(t.extra)}, ${esc(t.value)}</div></div></div></div>`).join('')}</div></div></section>
<section class="sec"><div class="w">${heading('news')}<div class="g" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))">${items('news').map(n => `<div class="card flat" style="padding:0;overflow:hidden"><div class="pic" ${pic(n.image_url, n.title)} style="border-radius:0;min-height:200px"></div><div style="padding:22px"><span class="pill">${esc(n.extra || 'News')}</span><h3 style="font:600 18px Poppins;color:var(--n);margin:10px 0">${esc(n.title)}</h3>${L('article', 'Read full article →', 'm', 'id=' + encodeURIComponent(n.id))}</div></div>`).join('')}</div></div></section>
<section class="dual"><div style="background:var(--n);color:#fff"><h2>${T('dual1_title')}</h2><p style="color:#c9d6f5">${T('dual1_text')}</p>${L('login', T('dual1_btn'), 'btn wh')}</div><div style="background:var(--l)"><h2 style="color:var(--n)">${T('dual2_title')}</h2><p class="m">${T('dual2_text')}</p>${L('contact', T('dual2_btn'), 'btn')}</div></section>`;
  },

  jobs: () => {
    const d = qs.get('d') || '', k = qs.get('k') || '', t = (qs.get('s') || '').toLowerCase();
    const l = SITE.jobs.filter(j => (!d || j.destination == d) && (!k || j.category == k) && (!t || [j.title, j.employer, j.city].join(' ').toLowerCase().includes(t)));
    return banner(R('jobs_page_title'), 'img_jobs_banner') + `<section class="sec alt"><div class="w"><div class="card" style="margin-bottom:28px"><div class="fr"><label>Destination<select onchange="flt('d',this.value)"><option value="">All</option>${DNAMES().map(x => `<option${x == d ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label><label>Category<select onchange="flt('k',this.value)"><option value="">All</option>${SITE.categories.map(c => `<option${c.name == k ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label><label>Search<input value="${esc(qs.get('s') || '')}" onchange="flt('s',this.value)" placeholder="Title, employer or city"></label></div></div><p class="m" style="margin-bottom:16px">${l.length} jobs found</p><div class="g" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))">${l.map(jobCard).join('') || '<p>No jobs match these filters.</p>'}</div></div></section>`;
  },

  visa: () => banner(R('visa_page_title'), 'img_visa_banner') + `<section class="sec"><div class="w">${heading('visa_routes')}<div class="g">${SITE.destinations.map(r => `<div class="card flat" style="padding:0;overflow:hidden"><div class="pic" ${pic(r.image_url, r.name)} style="border-radius:0;min-height:170px"></div><div style="padding:22px"><h3 style="font:700 20px Poppins;color:var(--n)">${esc(r.name)}</h3><p class="m" style="margin:6px 0">${esc(r.route_text)}</p>${r.typical_time ? `<span class="pill">Typical: ${esc(r.typical_time)}</span>` : ''}</div></div>`).join('')}</div></div></section>
<section class="sec alt">${deco}<div class="w">${heading('visa_proc')}<div class="steps">${items('visa_steps').map((s, i) => `<div style="--k:${COL[i % 6]}"><b class="n">${i + 1}</b><b style="color:var(--n)">${esc(s.title)}</b><p class="m">${esc(s.body)}</p></div>`).join('')}</div></div></section>
<section class="sec"><div class="w g2" style="align-items:start"><div>${heading('visa_check')}<div class="card flat">${items('checklist').map(x => `<div class="tr"><b>${esc(x.title)}</b><span class="m">${esc(x.value)}</span></div>`).join('')}</div></div><div>${heading('visa_fees')}<div class="card flat">${items('fees').map(x => `<div class="tr"><span>${esc(x.title)}</span><b style="text-align:right">${esc(x.value)}</b></div>`).join('')}</div><p class="m" style="margin:12px 0 20px">${T('visa_fee_note')}</p>${items('faq').map((x, i) => `<details${i ? '' : ' open'}><summary>${esc(x.title)}</summary><p>${esc(x.body)}</p></details>`).join('')}</div></div></section>`,

  about: () => banner(R('about_page_title'), 'img_about_banner') + `<section class="sec">${deco}<div class="w g2"><div><span class="chip">${T('story_chip')}</span><h2 class="h2">${T('story_title')} <em>${T('story_em')}</em></h2><p class="m" style="font-size:15px">${T('story_text')}</p></div><div class="off"><div class="pic" style="min-height:360px" ${pic(R('img_about'), 'GoPath Legal team at work')}></div></div></div></section>
<section class="sec alt"><div class="w">${heading('values')}<div class="g">${items('values').map((v, i) => `<div class="card hv c${i % 5 + 1}"><div class="ico">${IC(ICONS[v.extra] || D.v)}</div><h3 style="font:600 18px Poppins;color:var(--n)">${esc(v.title)}</h3><p class="m">${esc(v.body)}</p></div>`).join('')}</div></div></section>
<section class="sec"><div class="w">${heading('team')}<div class="g">${items('team').map((p, i) => `<div class="card cen hv" style="--k:${COL[i % 6]}"><div class="av" ${p.image_url ? `data-bg="${safeUrl(p.image_url)}"` : ''}>${esc((p.title || '?')[0])}</div><b style="color:var(--n)">${esc(p.title)}</b><div class="m">${esc(p.extra)}</div><div class="m">${esc(p.body)}</div></div>`).join('')}</div></div></section>
<section id="contact" class="sec alt">${deco}<div class="w">${heading('contact')}<div class="g2" style="align-items:start"><form class="card" onsubmit="return ct(event)"><div class="fr"><label>Full name<input name="name" required maxlength="100"></label><label>Email<input name="email" type="email" required></label></div><label style="margin:14px 0">Destination<select name="destination">${DNAMES().map(d => `<option>${esc(d)}</option>`).join('')}</select></label><label>Message<textarea name="message" rows="5" required maxlength="4000"></textarea></label><p style="margin:18px 0 8px"><button class="btn">Send message</button></p><p class="m">${T('contact_note')}</p></form><div><div class="card" style="margin-bottom:18px"><h3 style="font:600 18px Poppins;color:var(--n)">${T('contact_card_title')}</h3><p class="m" style="margin-top:8px">${T('office_address')}<br>${T('phone')} · ${T('email')}<br>${T('hours')}</p></div><div class="pic" ${pic(R('img_contact'), '')} style="min-height:200px"></div></div></div></div></section>`,

  article: () => {
    const n = items('news').find(x => x.id == qs.get('id'));
    if (!n) return banner('Article not found', 'img_visa_banner') + `<section class="sec"><div class="w"><p>${L('home', 'Back to the home page', 'btn')}</p></div></section>`;
    return banner(n.title, 'img_visa_banner') + `<section class="sec"><div class="w art" style="max-width:760px">${n.image_url ? `<div class="pic" ${pic(n.image_url, n.title)} style="min-height:300px;margin-bottom:26px"></div>` : ''}<span class="pill">${esc(n.extra || 'News')}</span><div style="margin-top:16px">${paras(n.body || '')}</div><p style="margin-top:28px">${L('home', '← Back to home', 'btn o')}</p></div></section>`;
  },

  login: () => `<section class="sec alt" style="padding:70px 0">${deco}<div class="w g2"><div class="pic" style="min-height:420px" ${pic(R('img_login'), '')}></div><form class="card" onsubmit="return login(event)"><div class="chip">${T('login_chip')}</div><h2 class="h2" style="font-size:28px;margin-bottom:18px">${T('login_title')}</h2><label>Email<input name="email" type="email" required autocomplete="username"></label><label style="margin-top:14px">Password<input name="password" type="password" required autocomplete="current-password"></label><p style="margin:20px 0"><button class="btn" style="width:100%">Sign in</button></p><p class="m">${L('forgot', 'Forgot password?', 'lnk')} · New here? ${L('home', 'Use the Apply form', 'lnk')} and we will email you a link to set your password.</p></form></div></section>`,

  forgot: () => `<section class="sec alt" style="padding:70px 0">${deco}<div class="w"><form class="card pw" onsubmit="return forgot(event)"><div class="chip">Password</div><h2 class="h2" style="font-size:26px;margin-bottom:12px">Reset your password</h2><p class="m" style="margin-bottom:16px">Enter your email and we will send you a link.</p><label>Email<input name="email" type="email" required></label><p style="margin:20px 0 0"><button class="btn" style="width:100%">Send reset link</button></p></form></div></section>`,

  setpw: () => `<section class="sec alt" style="padding:70px 0">${deco}<div class="w"><form class="card pw" onsubmit="return setpw(event)"><div class="chip">Password</div><h2 class="h2" style="font-size:26px;margin-bottom:12px">Choose your password</h2><label>New password<input name="password" type="password" minlength="8" required autocomplete="new-password"></label><label style="margin-top:14px">Repeat password<input name="again" type="password" minlength="8" required autocomplete="new-password"></label><p class="m" style="margin-top:8px">At least 8 characters.</p><p style="margin:20px 0 0"><button class="btn" style="width:100%">Save and continue</button></p></form></div></section>`,

  dashboard: async () => {
    DASH = await api('/client/dashboard');
    const u = DASH.user, a = DASH.applications[0], j = a && a.job;
    const latest = {};
    DASH.documents.forEach(d => { if (!latest[d.doc_type]) latest[d.doc_type] = d; });
    const types = [...new Set([...DASH.docTypes, ...Object.keys(latest)])];
    const state = t => { const d = latest[t]; return !d ? `<button class="btn sm o" style="flex:0" data-t="${esc(t)}" onclick="upDoc(this.dataset.t)">Upload</button>` : d.status == 'rejected' ? `<span class="pill bad">Please re-upload</span><button class="btn sm o" style="flex:0" data-t="${esc(t)}" onclick="upDoc(this.dataset.t)">Upload</button>` : `<span class="pill g1">${d.status == 'approved' ? 'Approved' : 'Received'}</span>`; };
    const title = x => (x.job ? x.job.title : x.profession || 'General application');
    return `<section class="banner"><div class="w" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div class="av" style="margin:0;--k:#1b6ef3">${esc((u.name || '?')[0])}</div><div><h1 style="font-size:30px">Welcome back, ${esc(u.name.split(' ')[0])}</h1><div class="crumb" style="margin:0">Client dashboard</div></div></div></section><section class="sec alt" style="padding-top:44px"><div class="w">${a ? `<div class="card" style="margin-bottom:22px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px"><div><span class="pill">${esc((j && j.destination && j.destination.name) || a.destination || 'Any destination')}</span><h3 style="font:600 20px Poppins;color:var(--n);margin-top:6px">${esc(title(a))}${j && j.employer ? ' · ' + esc(j.employer.name) : ''}</h3><div class="m">${j ? esc(j.city) + ', ' + esc(j.destination && j.destination.name) + ' · ' + esc(j.salary) : 'We will match you with verified employers.'}</div></div></div><div class="pb" style="margin:18px 0"><i style="width:${(a.stage + 1) / 6 * 100}%"></i></div><div class="st">${ST.map((s, i) => `<div class="${i < a.stage ? 'done' : i == a.stage ? 'now' : ''}"><b>${i + 1}. ${s}</b><div style="font-size:12px">${i < a.stage ? 'Complete' : i == a.stage ? 'In progress' : 'Waiting'}</div></div>`).join('')}</div></div>` : '<div class="card">No applications yet. ' + L('jobs', 'Browse jobs') + '</div>'}
<div class="g2" style="align-items:start"><div class="card"><h3 style="font:600 18px Poppins;color:var(--n);margin-bottom:8px">Document vault</h3>${types.map(t => `<div class="tr"><span>${esc(t)}</span>${state(t)}</div>`).join('')}<p class="m" style="margin-top:10px">Passport copy is requested only after a signed offer. PDF, JPG, PNG or Word, up to 8 MB.</p></div><div class="card"><h3 style="font:600 18px Poppins;color:var(--n);margin-bottom:8px">Messages</h3>${DASH.messages.map(m => `<div class="tr"><b style="flex:0 0 110px">${m.sender == 'staff' ? 'Your recruiter' : 'You'}</b><span style="flex:1 1 200px">${esc(m.body)}</span></div>`).join('') || '<p class="m">No messages yet.</p>'}<form onsubmit="return msg(event)" style="display:flex;gap:8px;margin-top:14px"><input name="body" placeholder="Write a message" required maxlength="2000"><button class="btn sm">Send</button></form></div></div>
<div class="card" style="margin-top:22px"><h3 style="font:600 18px Poppins;color:var(--n);margin-bottom:8px">My applications</h3>${DASH.applications.map(x => `<div class="tr"><b>${esc(title(x))}</b><span class="m">${esc(x.job && x.job.employer ? x.job.employer.name : '')}</span><span class="m">${esc((x.job && x.job.destination && x.job.destination.name) || x.destination || '')}</span><span class="pill">${ST[x.stage]}</span></div>`).join('')}</div></div></section>`;
  },

  admin: () => ADMIN(),
};

function parse() { const [p, q] = (location.hash.slice(2) || 'home').split('?'); cur = p || 'home'; qs = new URLSearchParams(q || ''); }

async function render() {
  const my = ++RT, keepY = window.scrollY, keep = KEEP; KEEP = false;
  let k = cur == 'contact' ? 'about' : cur == 'set-password' ? 'setpw' : cur;
  if (!PAGES[k]) k = 'home';
  if ((k == 'dashboard' && (!ME || ME.role != 'client')) || (k == 'admin' && (!ME || ME.role != 'admin'))) {
    if (ME) { cur = k = ME.role == 'admin' ? 'admin' : 'dashboard'; }
    else { toast('Please sign in first'); cur = k = 'login'; }
  }
  try {
    if (!SITE) SITE = await api('/public/site');
    const html = await PAGES[k]();
    if (my != RT) return; // a newer navigation took over
    $('#app').innerHTML = hdr() + html + (k == 'admin' ? '' : ftr());
    loadBg();
    if (typeof afterAdmin == 'function' && k == 'admin') afterAdmin();
    if (keep) window.scrollTo(0, keepY); else if (cur == 'contact') { const c = $('#contact'); c && c.scrollIntoView(); } else window.scrollTo(0, 0);
  } catch (e) {
    if (my != RT) return;
    $('#app').innerHTML = `<section class="sec"><div class="w cen"><h2 class="h2">Something went wrong</h2><p class="m" style="margin-bottom:20px">${esc(e.message)}</p><button class="btn" onclick="SITE=null;render()">Try again</button></div></section>`;
  }
}
function nav(r, q) { cur = r; qs = new URLSearchParams(q || ''); try { history.pushState(null, '', '#/' + r + (q ? '?' + q : '')); } catch (e) {} return render(); }
document.addEventListener('click', e => { const a = e.target.closest('[data-r]'); if (a) { e.preventDefault(); nav(a.dataset.r, a.dataset.q); } });
const flt = (k, v) => { v ? qs.set(k, v) : qs.delete(k); nav('jobs', qs.toString()); };

// ---- actions ----
async function apply(id) {
  if (!ME) { toast('Sign in to apply. New here? Use the Apply form on the home page.', 4500); return nav('login'); }
  if (ME.role == 'admin') return toast('Use a client account to apply');
  try { await api('/client/apply', { method: 'POST', body: { job_id: id } }); toast('Application sent'); refreshNotes(); nav('dashboard'); }
  catch (e) { toast(e.message); }
}
const qa = e => sb(e, async (fd, f) => {
  if (fd.get('cv') && !fd.get('cv').size) fd.delete('cv');
  const r = await api('/public/apply', { method: 'POST', form: fd });
  f.reset(); toast(r.message, 7000);
});
const ct = e => sb(e, async (fd, f) => { const r = await api('/public/contact', { method: 'POST', body: Object.fromEntries(fd) }); f.reset(); toast(r.message, 5000); });
const sub = e => sb(e, async (fd, f) => { await api('/public/subscribe', { method: 'POST', body: Object.fromEntries(fd) }); f.reset(); toast('Subscribed. Thank you!'); });
const login = e => sb(e, async fd => {
  const r = await api('/auth/login', { method: 'POST', body: Object.fromEntries(fd) });
  startSession(r);
});
function startSession(r) { tok.set(r.token); ME = r.user; refreshNotes(); nav(ME.role == 'admin' ? 'admin' : 'dashboard'); }
const forgot = e => sb(e, async fd => { const r = await api('/auth/forgot', { method: 'POST', body: Object.fromEntries(fd) }); toast(r.message, 6000); });
const setpw = e => sb(e, async fd => {
  if (fd.get('password') != fd.get('again')) throw new Error('The two passwords do not match.');
  const r = await api('/auth/set-password', { method: 'POST', body: { token: qs.get('token') || '', password: fd.get('password') } });
  toast('Password saved. Welcome!'); startSession(r);
});
function out() { tok.set(null); ME = null; DASH = null; NOTES = { items: [], unread: 0 }; }
function upDoc(type) {
  const i = document.createElement('input');
  i.type = 'file'; i.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
  i.onchange = async () => {
    if (!i.files[0]) return;
    const fd = new FormData(); fd.append('doc_type', type); fd.append('file', i.files[0]);
    try { toast('Uploading…'); await api('/client/documents', { method: 'POST', form: fd }); toast(type + ' received'); refreshNotes(); render(); } catch (e) { toast(e.message, 5000); }
  };
  i.click();
}
const msg = e => sb(e, async (fd, f) => { await api('/client/messages', { method: 'POST', body: Object.fromEntries(fd) }); toast('Message sent'); await render(); });

// ---- notification bell ----
async function refreshNotes() { if (!ME) return; try { NOTES = await api('/notifications'); paintBell(); } catch (e) {} }
function paintBell() {
  const b = $('.bell'); if (!b) return;
  let d = b.querySelector('.dot');
  if (NOTES.unread) { if (!d) { d = document.createElement('i'); d.className = 'dot'; b.appendChild(d); } d.textContent = NOTES.unread > 99 ? '99+' : NOTES.unread; }
  else if (d) d.remove();
}
const bellHtml = () => `<header>Notifications<button onclick="readAll()">Mark all read</button></header><div class="ls">${NOTES.items.length ? NOTES.items.map(n => `<button class="it${n.read ? '' : ' un'}" data-id="${esc(n.id)}" data-l="${esc(n.link || '')}" onclick="openNote(this)"><b>${esc(n.title)}</b>${esc(n.body || '')}<br><span>${ago(n.created_at)}</span></button>`).join('') : '<div class="em">No notifications yet.</div>'}</div>`;
async function toggleBell(e) {
  e.stopPropagation();
  const p = $('#bellp'); if (!p.hidden) { p.hidden = true; return; }
  await refreshNotes(); p.innerHTML = bellHtml(); p.hidden = false;
}
async function openNote(b) {
  try { await api('/notifications/read', { method: 'POST', body: { id: b.dataset.id } }); } catch (e) {}
  const l = b.dataset.l; refreshNotes();
  if (l) { const [r, q] = l.split('?'); nav(r, q); } else $('#bellp').hidden = true;
}
async function readAll() { try { await api('/notifications/read', { method: 'POST', body: {} }); await refreshNotes(); $('#bellp').innerHTML = bellHtml(); } catch (e) { toast(e.message); } }
document.addEventListener('click', e => { const p = $('#bellp'); if (p && !p.hidden && !e.target.closest('.bellw')) p.hidden = true; });

async function init() {
  window.addEventListener('bw-auth-expired', () => { if (!ME) return; tok.set(null); ME = null; DASH = null; toast('Your session expired. Please sign in again.'); nav('login'); });
  addEventListener('popstate', () => { parse(); render(); });
  parse();
  if (tok.get()) { try { ME = (await api('/auth/me')).user; } catch (e) { tok.set(null); } }
  if (ME) refreshNotes();
  setInterval(() => { if (ME && !document.hidden) refreshNotes(); }, 60000);
  await render();
}
