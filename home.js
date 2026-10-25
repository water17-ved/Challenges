'use strict';
/* Challenge Room: home (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ---------- mega folders, counts, home tasks ---------- */
const doneKey = (g, t) => g.daily ? `${g.id}@${t}` : g.id;
function counts(code) {
  const x = S.meta[code]; if (!x || x.gone || !x.targets) return null;
  const t = today(), d = S.done[code] || {}, dl = x.targets.filter(g => g.daily), on = x.targets.filter(g => !g.daily);
  return { dd: dl.filter(g => d[doneKey(g, t)]).length, dt: dl.length, od: on.filter(g => d[g.id]).length, ot: on.length };
}
function rollup(kids) {
  const r = { dd: 0, dt: 0, od: 0, ot: 0, joined: 0 };
  (kids || []).forEach(ch => { const c = counts(ch.code); if (c) { r.dd += c.dd; r.dt += c.dt; r.od += c.od; r.ot += c.ot; r.joined++; } });
  return r;
}
const pills = c => c ? `<div class="pills"><span class="pill">Daily ${c.dd}/${c.dt}</span><span class="pill">One-time ${c.od}/${c.ot}</span></div>` : '';
const pctOf = (a, b) => b ? Math.round(a / b * 100) : 0;
const megaList = () => S.mine.filter(m => S.meta[m.code]?.challengeType === 'mega' && !S.meta[m.code]?.gone);
const megaOf = code => megaList().find(m => (S.meta[m.code].childChallenges || []).some(ch => ch.code === code))?.code || '';
const claimed = (code, except) => megaList().some(m => m.code !== except && (S.meta[m.code].childChallenges || []).some(ch => ch.code === code));
const CHEV = '<svg class="i chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
const FOLDER = '<span class="fico"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg></span>';

function rowHtml(code, title, x, detail, nested) {
  if (nested && !x) return `<button class="li" data-act="mega-branch" data-code="${esc(code)}"><div class="grow"><b>${esc(title)}</b><div class="meta">Not joined yet. Tap to join this challenge.</div></div>${CHEV}</button>`;
  const st = x && !x.gone ? status(x) : null;
  const info = !x ? 'Loading' : x.gone ? 'No longer available' : `${fmt(x.startDate)} to ${fmt(x.endDate)}, ${x.n} ${x.n === 1 ? 'target' : 'targets'}`;
  return `<button class="li" data-act="open" data-code="${esc(code)}"><div class="grow"><b>${esc(title)}</b>${detail || !nested ? `<div class="meta">${esc(info)}</div>` : ''}${detail ? pills(counts(code)) : ''}</div>${st ? `<span class="badge ${st}">${st}</span>` : ''}${CHEV}</button>`;
}
function folderHtml(m, x, detail) {
  const open = !!S.expanded[m.code], kids = x.childChallenges || [], st = status(x);
  const head = `<button class="li folder-head" data-act="toggle-folder" data-code="${esc(m.code)}" aria-expanded="${open}">${FOLDER}<div class="grow"><b>${esc(m.title)}</b><div class="meta">Mega challenge, ${kids.length} ${kids.length === 1 ? 'challenge' : 'challenges'}</div>${detail ? pills(rollup(kids)) : ''}</div><span class="badge ${st}">${st}</span>${CHEV}</button>`;
  const body = open ? `<div class="folder-body"><button class="li" data-act="open" data-code="${esc(m.code)}"><div class="grow"><b>Open mega challenge</b><div class="meta">Branches, invite code and settings</div></div>${CHEV}</button>${kids.map(ch => rowHtml(ch.code, ch.title, S.meta[ch.code], detail, true)).join('')}</div>` : '';
  return `<div class="folder ${open ? 'open' : ''}">${head}${body}</div>`;
}
function isArchived(x) { return x && (x.archived || status(x) === 'ended'); }
function listHtml(detail) {
  const inFolder = new Set(); megaList().forEach(m => (S.meta[m.code].childChallenges || []).forEach(ch => inFolder.add(ch.code)));
  const rows = [];
  S.mine.forEach(m => {
    const x = S.meta[m.code];
    if (!x || x.gone || isArchived(x)) return; // ended/archived go to Archive only
    if (x.challengeType === 'mega') rows.push(folderHtml(m, x, detail));
    else if (!inFolder.has(m.code)) rows.push(rowHtml(m.code, m.title, x, detail, false));
  });
  if (!rows.length) return '<div class="group">' + empty('No active challenges', 'Ended challenges are in Archive.') + '</div>';
  return '<div class="group">' + rows.join('') + '</div>';
}
function todayHtml() {
  const t = today(); let tot = 0, dn = 0; const parts = [];
  S.mine.forEach(m => {
    const x = S.meta[m.code]; if (!x || x.gone || x.challengeType === 'mega' || status(x) !== 'live') return;
    const d = (x.targets || []).filter(g => g.daily); if (!d.length) return;
    const done = S.done[m.code] || {}, c = d.filter(g => done[`${g.id}@${t}`]).length, parent = megaOf(m.code);
    tot += d.length; dn += c;
    parts.push(`<div class="today-head"><b>${esc(m.title)}</b>${parent ? `<span class="meta">in ${esc(S.meta[parent].title)}</span>` : ''}<span class="cnt">${c}/${d.length}</span></div>
      <div class="group">${d.map(g => `<button class="li quest ${done[`${g.id}@${t}`] ? 'on' : ''}" data-act="toggle-in" data-code="${esc(m.code)}" data-id="${esc(g.id)}"><span class="box"></span><span class="t">${esc(g.text)}</span><span class="p">+${g.points}</span></button>`).join('')}</div>`);
  });
  if (!parts.length) return '';
  return `<div class="lbl">Today's daily tasks, ${dn} of ${tot} done</div><div class="bar" aria-hidden="true"><i style="width:${pctOf(dn, tot)}%"></i></div>` + parts.join('');
}
function renderMegaHub() {
  const el = $('mega-hub-list'); if (!el) return;
  const megas = megaList();
  if (!megas.length) { el.innerHTML = empty('No mega challenges yet', 'Combine several challenges into one mission.'); return; }
  el.innerHTML = megas.map(m => {
    const x = S.meta[m.code], kids = x.childChallenges || [], r = rollup(kids), st = status(x);
    return `<div class="mega-card"><div class="row"><div class="grow"><b>${esc(m.title)}</b><div class="meta">${fmt(x.startDate)} to ${fmt(x.endDate)}, ${kids.length} ${kids.length === 1 ? 'challenge' : 'challenges'}</div></div><span class="badge ${st}">${st}</span></div>
      <div class="mrow"><span>Daily tasks done today</span><b>${r.dd}/${r.dt}</b></div><div class="bar"><i style="width:${pctOf(r.dd, r.dt)}%"></i></div>
      <div class="mrow"><span>One-time tasks done</span><b>${r.od}/${r.ot}</b></div><div class="bar"><i style="width:${pctOf(r.od, r.ot)}%"></i></div>
      <div class="group">${kids.map(ch => { const c = counts(ch.code); return `<button class="li" data-act="${c ? 'open' : 'mega-branch'}" data-code="${esc(ch.code)}"><div class="grow"><b>${esc(ch.title)}</b>${c ? pills(c) : '<div class="meta">Not joined yet. Tap to join.</div>'}</div>${CHEV}</button>`; }).join('')}</div>
      <div class="btns"><button class="btn sec" data-act="open" data-code="${esc(m.code)}">Open mega challenge</button></div></div>`;
  }).join('');
}
function openMegaEntry() {
  const megas = megaList();
  if (!megas.length) return setView('create-mega');
  if (megas.length === 1) { openChallenge(megas[0].code); return; }
  setView('challenge-mega');
}
function toggleFolder(code) { S.expanded[code] = !S.expanded[code]; ls.set('cr_open', S.expanded); renderHome(); }
async function toggleIn(code, tid) {
  if (code === S.active && S.chal) return toggle(tid);
  const x = S.meta[code]; if (!x || status(x) !== 'live') return;
  if (DEMO) return demoMsg();
  const t = x.targets.find(g => g.id === tid); if (!t) return;
  const day = today(), key = doneKey(t, day), done = { ...(S.done[code] || {}) };
  if (done[key]) delete done[key]; else done[key] = day;
  const points = Object.keys(done).reduce((a, k) => a + (x.targets.find(g => g.id === k.split('@')[0])?.points || 0), 0);
  const prev = S.done[code]; S.done[code] = done; renderHome(); renderMegaHub();
  try { await ensureMember(code); await updateDoc(doc(db, 'challenges', code, 'members', S.uid), { name: S.name, done, points, updatedAt: serverTimestamp() }); }
  catch { S.done[code] = prev; renderHome(); renderMegaHub(); toast('Could not save. Check your connection.'); }
}
function branchMeta(code) {
  const c = counts(code);
  return c ? `Daily ${c.dd}/${c.dt} today, one-time ${c.od}/${c.ot}` : (S.mine.some(m => m.code === code) ? 'Open linked challenge branch' : 'Join this challenge branch');
}
function megaSummary(kids) {
  const r = rollup(kids); if (!r.joined) return '';
  return `<div class="mega-card" style="margin-top:0"><div class="mrow" style="margin-top:0"><span>Daily tasks done today</span><b>${r.dd}/${r.dt}</b></div><div class="bar"><i style="width:${pctOf(r.dd, r.dt)}%"></i></div><div class="mrow"><span>One-time tasks done</span><b>${r.od}/${r.ot}</b></div><div class="bar"><i style="width:${pctOf(r.od, r.ot)}%"></i></div></div>`;
}


/* ========================================================
   NOTIFICATION ENGINE
   ======================================================== */
function reqState(uid) {
  const r = S.notifs.outgoing.find(r => r.targetUid === uid && r.challengeCode === S.active);
  if (!r) return '';
  if (r.status === 'pending') return 'pending';
  if (r.status === 'accepted') return 'accepted';
  return 'declined';
}
function reqStateLabel(uid) {
  const st = reqState(uid);
  return { pending: 'Request pending', accepted: 'Accepted – open Notifications to view', declined: 'Declined', '': 'Request progress' }[st];
}
function startNotifListeners() {
  if (DEMO || !S.uid) return;
  S.notifUnsubs.forEach(f => f());
  S.notifUnsubs = [];
  const now = Date.now;
  const qIn = query(collection(db,'progressAccessRequests'),where('targetUid','==',S.uid));
  S.notifUnsubs.push(onSnapshot(qIn, snap => {
    S.notifs.incoming = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !r.expiresAt || r.expiresAt > Date.now());
    updateNotifUI();
  }));
  const qOut = query(collection(db,'progressAccessRequests'),where('requesterUid','==',S.uid));
  S.notifUnsubs.push(onSnapshot(qOut, snap => {
    const prev = S.notifs.outgoing.filter(r => r.status === 'pending').map(r => r.id);
    S.notifs.outgoing = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !r.expiresAt || r.expiresAt > Date.now());
    // toast when something changed from pending to accepted/declined
    S.notifs.outgoing.forEach(r => {
      if (prev.includes(r.id) && r.status === 'accepted') toast(`${r.targetName || 'Friend'} allowed access — open Notifications to view.`);
      if (prev.includes(r.id) && r.status === 'declined') toast(`${r.targetName || 'Friend'} declined your request.`);
    });
    updateNotifUI(); renderChallenge();
  }));
  const qSh = query(collection(db,'temporaryProgressShares'),where('viewerUid','==',S.uid));
  S.notifUnsubs.push(onSnapshot(qSh, snap => {
    S.notifs.shares = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(sh => sh.expiresAt > Date.now());
    updateNotifUI();
  }));
}
function stopNotifListeners() { S.notifUnsubs.forEach(f => f()); S.notifUnsubs = []; }
function notifCount() {
  const now = Date.now();
  const unread = S.notifs.incoming.filter(r => r.status === 'pending').length
    + S.notifs.outgoing.filter(r => r.status === 'accepted').length
    + S.notifs.shares.length;
  return unread;
}
function updateNotifUI() {
  const n = notifCount();
  const dot = $('notif-dot');
  if (dot) { dot.textContent = n > 9 ? '9+' : (n || ''); dot.classList.toggle('on', n > 0); }
  renderHomeBanners();
  // if sheet is open, re-render it
  const sheet = $('notif-sheet');
  if (sheet?.classList.contains('open')) renderNotifSheet();
  // re-render challenge board so logo-button states update
  if (document.querySelector('#view-challenge.active')) renderChallenge();
}
function renderHomeBanners() {
  const el = $('home-banners'); if (!el) return;
  const pending = S.notifs.incoming.filter(r => r.status === 'pending');
  const accepted = S.notifs.outgoing.filter(r => r.status === 'accepted');
  const banners = [];
  pending.forEach(r => {
    banners.push(`<div class="notif-banner">
      <div class="nb-icon"><svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true" style="display:block"><defs><linearGradient id="lg1" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#5B8DEF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#lg1)"/><path d="M18 18h28v6H35v22h-7V24H18z" fill="#081326"/><path d="m42 31 6 6-6 6" fill="none" stroke="#081326" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="nb-body"><b>${esc(r.requesterName || 'Friend')} wants your progress</b>
        <small>${esc(r.challengeTitle || 'A challenge')} · ` + '${Math.max(1, Math.ceil((r.expiresAt - Date.now()) / 3600000))}h left' + `</small>
        <div class="nb-acts">
          <div class="share-opts"><input type="checkbox" id="nb-notes-${esc(r.id)}" checked><label for="nb-notes-${esc(r.id)}">Include journal notes</label></div>
        </div>
        <div class="nb-acts" style="margin-top:6px">
          <button class="btn sm" data-act="nb-accept" data-id="${esc(r.id)}" data-rid="${esc(r.id)}">Allow</button>
          <button class="btn sec sm" data-act="nb-decline" data-id="${esc(r.id)}">Decline</button>
        </div>
      </div></div>`);
  });
  accepted.forEach(r => {
    banners.push(`<div class="notif-banner">
      <div class="nb-icon"><svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true" style="display:block"><defs><linearGradient id="lg1" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#5B8DEF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#lg1)"/><path d="M18 18h28v6H35v22h-7V24H18z" fill="#081326"/><path d="m42 31 6 6-6 6" fill="none" stroke="#081326" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="nb-body"><b>${esc(r.targetName || 'Friend')} allowed access</b>
        <small>${esc(r.challengeTitle || 'A challenge')}</small>
        <div class="nb-acts"><button class="btn sm" data-act="view-shared-progress" data-id="${esc(r.shareId || r.id)}">View now</button></div>
      </div></div>`);
  });
  el.innerHTML = banners.join('');
}
function renderNotifSheet() {
  const el = $('notif-list'); if (!el) return;
  const now = Date.now(), rows = [];
  S.notifs.incoming.filter(r => r.status === 'pending').forEach(r => {
    rows.push(`<div class="notif-item">
      <div class="ni-icon"><svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true" style="display:block"><defs><linearGradient id="lg1" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#5B8DEF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#lg1)"/><path d="M18 18h28v6H35v22h-7V24H18z" fill="#081326"/><path d="m42 31 6 6-6 6" fill="none" stroke="#081326" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="ni-body"><b>${esc(r.requesterName || 'Friend')} wants your progress</b>
        <small>${esc(r.challengeTitle || 'Challenge')} · ` + '${Math.max(1,Math.ceil((r.expiresAt-now)/3600000))}h left' + `</small>
        <div class="ni-acts">
          <div class="share-opts" style="margin-bottom:6px"><input type="checkbox" id="ns-notes-${esc(r.id)}" checked><label for="ns-notes-${esc(r.id)}">Include notes</label></div>
          <button class="btn sm" data-act="nb-accept" data-id="${esc(r.id)}">Allow</button>
          <button class="btn sec sm" data-act="nb-decline" data-id="${esc(r.id)}">Decline</button>
        </div></div></div>`);
  });
  S.notifs.incoming.filter(r => r.status === 'accepted' || r.status === 'declined').forEach(r => {
    rows.push(`<div class="notif-item">
      <div class="ni-icon" style="background:${r.status==='declined'?'var(--bad)':'var(--ok)'}"><svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true" style="display:block"><defs><linearGradient id="lg1" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#5B8DEF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#lg1)"/><path d="M18 18h28v6H35v22h-7V24H18z" fill="#081326"/><path d="m42 31 6 6-6 6" fill="none" stroke="#081326" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="ni-body"><b>${esc(r.requesterName || 'Friend')} — ${r.status === 'declined' ? 'declined' : 'you allowed'}</b>
        <small>${esc(r.challengeTitle || 'Challenge')}</small></div></div>`);
  });
  S.notifs.outgoing.forEach(r => {
    const st = r.status;
    const stLabel = st === 'pending' ? '⏳ Waiting' : st === 'accepted' ? '✓ Accepted' : '✗ Declined';
    const acts = st === 'accepted' ? `<div class="ni-acts"><button class="btn sm" data-act="view-shared-progress" data-id="${esc(r.shareId || r.id)}">View progress</button></div>` : '';
    rows.push(`<div class="notif-item">
      <div class="ni-icon"><svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true" style="display:block"><defs><linearGradient id="lg1" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#5B8DEF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#lg1)"/><path d="M18 18h28v6H35v22h-7V24H18z" fill="#081326"/><path d="m42 31 6 6-6 6" fill="none" stroke="#081326" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="ni-body"><b>Request to ${esc(r.targetName || 'Friend')}</b>
        <small>${esc(r.challengeTitle || 'Challenge')} · ${stLabel}</small>${acts}</div></div>`);
  });
  S.notifs.shares.forEach(sh => {
    const min = Math.max(1, Math.ceil((sh.expiresAt - now) / 60000));
    rows.push(`<div class="notif-item">
      <div class="ni-icon" style="background:var(--ok)"><svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true" style="display:block"><defs><linearGradient id="lg1" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#5B8DEF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#lg1)"/><path d="M18 18h28v6H35v22h-7V24H18z" fill="#081326"/><path d="m42 31 6 6-6 6" fill="none" stroke="#081326" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="ni-body"><b>${esc(sh.ownerName || 'Friend')} shared progress</b>
        <small>${esc(sh.challengeTitle || 'Challenge')} · ${min} min left</small>
        <div class="ni-acts"><button class="btn sm" data-act="view-shared-progress" data-id="${esc(sh.id)}">View</button></div></div></div>`);
  });
  el.innerHTML = rows.length ? rows.join('') : '<div class="notif-empty">Nothing here yet</div>';
}
function openNotifSheet() {
  renderNotifSheet();
  const sh = $('notif-sheet'); sh.classList.add('open');
  $('notif-bell')?.classList.add('active');
}
function closeNotifSheet() {
  $('notif-sheet')?.classList.remove('open');
  $('notif-bell')?.classList.remove('active');
}
async function nbAccept(id) {
  const r = S.notifs.incoming.find(x => x.id === id);
  if (!r) return toast('Request no longer available.');
  const incNotes = !!document.querySelector(`#nb-notes-${id}, #ns-notes-${id}`)?.checked;
  await decideProgressRequest(id, true, incNotes);
}

