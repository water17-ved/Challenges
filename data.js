'use strict';
/* Challenge Room: data (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ---------- boot ---------- */
async function loadFirebase() {
  const V = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const [a, b, c] = await Promise.all([import(V + 'firebase-app.js'), import(V + 'firebase-auth.js'), import(V + 'firebase-firestore.js')]);
  ({ onAuthStateChanged, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, linkWithPopup, signInAnonymously, signOut } = b);
  ({ doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, serverTimestamp, getDocs, query, where } = c);
  const app = a.initializeApp(firebaseConfig); auth = b.getAuth(app); db = c.getFirestore(app);
  await setPersistence(auth, browserLocalPersistence);
}
async function start() {
  $('c-start').value = today(); $('c-end').value = dayOff(13); $('mc-start').value = today(); $('mc-end').value = dayOff(13);
  renderAll();
  if (!DEMO) { try { await loadFirebase(); } catch { DEMO = true; toast('Offline: showing demo mode.'); } }
  if (DEMO) { document.body.classList.remove('auth-required','auth-pending'); loadDemo(); setView('home'); return; }
  let lastUid = null;
  onAuthStateChanged(auth, u => {
    document.body.classList.remove('auth-pending');
    if (!u) { document.body.classList.add('auth-required'); setView('login'); return; }
    if (u.isAnonymous) {
      document.body.classList.remove('auth-required');
      const previousUid = lastUid || ls.get('cr_last_uid', null);
      if (previousUid && previousUid !== u.uid) {
        ls.set('cr_mine_' + previousUid, S.mine); ls.set('cr_active_' + previousUid, S.active);
        S.mine = ls.get('cr_mine_' + u.uid, []); S.active = ls.get('cr_active_' + u.uid, S.mine[0]?.code || '');
        ls.set('cr_mine', S.mine); ls.set('cr_active', S.active);
      }
      S.uid = u.uid; lastUid = u.uid; ls.set('cr_last_uid', u.uid);
      $('account-status').textContent = 'Guest session (this browser)';
      if (!S.name) openName(); else afterName();
      startNotifListeners();
      return;
    }
    document.body.classList.remove('auth-required');
    if (lastUid === u.uid) { $('account-status').textContent = u.isAnonymous ? 'Guest session (this browser)' : 'Google account connected: ' + (u.email || u.displayName || 'signed in'); return; }
    const previousUid = lastUid || ls.get('cr_last_uid', null);
    if (previousUid && previousUid !== u.uid) {
      ls.set('cr_mine_' + previousUid, S.mine);
      ls.set('cr_active_' + previousUid, S.active);
      const savedMine = ls.get('cr_mine_' + u.uid, []);
      S.mine = Array.isArray(savedMine) ? savedMine : [];
      S.active = ls.get('cr_active_' + u.uid, S.mine[0]?.code || '');
      ls.set('cr_mine', S.mine); ls.set('cr_active', S.active);
    }
    lastUid = u.uid; S.uid = u.uid; ls.set('cr_last_uid', u.uid);
    $('account-status').textContent = u.isAnonymous ? 'Guest session (this browser)' : 'Google account connected: ' + (u.email || u.displayName || 'signed in');
    if (!S.name) openName(); else afterName();
    startNotifListeners(); GCal.init();
  });
  // Wait for onAuthStateChanged before choosing the login or app screen. This avoids a login-screen flash on reload.
  // Existing anonymous sessions are not discarded; Google sign-in attempts to link them first.

}
function afterName() {
  if (S.active) watch(S.active);
  if (S.pendingCode) {
    $('join-code').value = S.pendingCode.toUpperCase().slice(0, 6);
    history.replaceState(null, '', location.pathname); S.pendingCode = null; setView('join');
  } else setView('home');
}

/* ---------- firebase watching ---------- */
function unwatch() { S.unsubs.forEach(f => f()); S.unsubs = []; S.chal = null; S.me = null; S.members = []; }
function watch(code) {
  if (DEMO) return watchDemo(code);
  unwatch(); S.active = code; ls.set('cr_active', code);
  S.unsubs.push(onSnapshot(doc(db, 'challenges', code), s => {
    if (!s.exists()) { toast('That challenge no longer exists.'); removeMine(code); return; }
    S.chal = { id: s.id, ...s.data() }; S.meta[code] = metaOf(S.chal); renderAll();
  }, () => toast('Could not load the challenge.')));
  S.unsubs.push(onSnapshot(doc(db, 'challenges', code, 'members', S.uid), s => { S.me = s.exists() ? s.data() : null; S.done[code] = S.me?.done || {}; renderAll(); }));
  S.unsubs.push(onSnapshot(collection(db, 'challenges', code, 'members'), s => { S.members = s.docs.map(d => ({ id: d.id, ...d.data() })); renderAll(); }));
  renderAll();
}
function addMine(code, title) { S.mine = [{ code, title }, ...S.mine.filter(m => m.code !== code)]; ls.set('cr_mine', S.mine); }
function removeMine(code) {
  S.mine = S.mine.filter(m => m.code !== code); ls.set('cr_mine', S.mine); delete S.meta[code];
  if (S.active === code) { unwatch(); S.active = S.mine[0]?.code || ''; ls.set('cr_active', S.active); if (S.active) watch(S.active); }
  renderAll();
}
async function loadMeta() {
  if (DEMO) return;
  await Promise.all(S.mine.map(async m => {
    try { const s = await getDoc(doc(db, 'challenges', m.code)); if (s.exists()) S.meta[m.code] = metaOf(s.data()); else S.meta[m.code] = { gone: true }; } catch {}
    try { const ms = await getDoc(doc(db, 'challenges', m.code, 'members', S.uid)); if (ms.exists()) S.done[m.code] = ms.data().done || {}; else if (!S.done[m.code]) S.done[m.code] = {}; } catch {}
  }));
  renderHome(); renderMegaHub();
}

/* ---------- actions ---------- */
async function ensureMember(code) {
  const ref = doc(db, 'challenges', code, 'members', S.uid);
  if (!(await getDoc(ref)).exists()) await setDoc(ref, { name: S.name, photo: S.photo || '', about: S.about || '', points: 0, done: {}, notes: {}, joinedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
const SHARE_TTL_MS = 10 * 60 * 1000;
function cleanShareData(data) {
  const now = Date.now();
  return { ...data, expiresAt: now + SHARE_TTL_MS };
}
async function requestProgressAccess(targetUid, targetName, code) {
  if (DEMO) return demoMsg();
  if (!S.uid || !targetUid || targetUid === S.uid) return toast('Choose another member.');
  try {
    const existing = await getDocs(query(collection(db, 'progressAccessRequests'), where('requesterUid', '==', S.uid), where('targetUid', '==', targetUid), where('challengeCode', '==', code), where('status', '==', 'pending')));
    if (!existing.empty) return toast('Request already sent.');
    const ref = doc(collection(db, 'progressAccessRequests'));
    await setDoc(ref, { requesterUid:S.uid, requesterName:S.name || 'Friend', targetUid, targetName:targetName || 'Friend', challengeCode:code, challengeTitle:S.chal?.title || 'Challenge', status:'pending', createdAt:Date.now(), expiresAt:Date.now()+24*60*60*1000 });
    toast('Progress access request sent.');
  } catch (e) { console.error(e); toast('Could not send request. Check Firestore rules.'); }
}
async function decideProgressRequest(id, accept, includeNotes=true) {
  if (DEMO) return demoMsg();
  try {
    const rr = doc(db,'progressAccessRequests',id), snap = await getDoc(rr);
    if (!snap.exists()) return toast('Request has expired.');
    const r = snap.data();
    if (r.targetUid !== S.uid || r.expiresAt < Date.now()) return toast('This request is no longer valid.');
    if (!accept) { await updateDoc(rr,{status:'declined',decidedAt:Date.now()}); toast('Request declined.'); return; }
    const ms = await getDoc(doc(db,'challenges',r.challengeCode,'members',S.uid));
    const cs = await getDoc(doc(db,'challenges',r.challengeCode));
    if (!ms.exists() || !cs.exists()) return toast('Your challenge data is unavailable.');
    const m=ms.data(), c=cs.data(), expiresAt=Date.now()+SHARE_TTL_MS;
    const share = { requestId:id, challengeCode:r.challengeCode, challengeTitle:c.title||r.challengeTitle, ownerUid:S.uid, ownerName:S.name||m.name||'Friend', viewerUid:r.requesterUid, viewerName:r.requesterName, points:Number(m.points)||0, done:m.done||{}, notes: includeNotes?(m.notes||{}):{}, targets:(c.targets||[]).map(t=>({id:t.id,text:t.text,subject:t.subject||'',chapter:t.chapter||'',topic:t.topic||'',points:t.points||0,daily:!!t.daily})), expiresAt, createdAt:Date.now() };
    await setDoc(doc(db,'temporaryProgressShares',id),share);
    await updateDoc(rr,{status:'accepted',shareId:id,decidedAt:Date.now(),expiresAt});
    toast(`Access granted${includeNotes?'':' (notes hidden)'} for 10 minutes.`);
  } catch(e) { console.error(e); toast('Could not update access. Check Firestore rules.'); }
}

async function loadProgressAccess() {
  const el=$('progress-access-panel'); if(!el) return;
  if(DEMO || !S.uid) { el.innerHTML='<div class="li"><div class="grow">Sign in to manage progress sharing.</div></div>'; return; }
  el.innerHTML='<div class="li"><div class="grow">Loading requests…</div></div>';
  try {
    const [incoming,outgoing,sharedToMe]=await Promise.all([
      getDocs(query(collection(db,'progressAccessRequests'),where('targetUid','==',S.uid))),
      getDocs(query(collection(db,'progressAccessRequests'),where('requesterUid','==',S.uid))),
      getDocs(query(collection(db,'temporaryProgressShares'),where('viewerUid','==',S.uid)))
    ]);
    const now=Date.now(), rows=[];
    for(const d of incoming.docs){const r=d.data(); if(r.expiresAt && r.expiresAt<now){try{await deleteDoc(d.ref)}catch{};continue;} if(r.status==='pending') rows.push(`<div class="li"><div class="grow"><b>${esc(r.requesterName||'Friend')}</b><div class="meta">Wants to view ${esc(r.challengeTitle||'a challenge')}</div></div><button class="btn sm" data-act="progress-accept" data-id="${esc(d.id)}">Accept</button><button class="btn sec sm" data-act="progress-decline" data-id="${esc(d.id)}">Decline</button></div>`); }
    for(const d of outgoing.docs){const r=d.data(); if(r.status==='pending' && (!r.expiresAt||r.expiresAt>now)) rows.push(`<div class="li"><div class="grow"><b>Request to ${esc(r.targetName||'friend')}</b><div class="meta">${esc(r.challengeTitle||'Challenge')} · Pending</div></div></div>`); }
    for(const d of sharedToMe.docs){const sh=d.data(); if(sh.expiresAt>now) rows.push(`<div class="li"><div class="grow"><b>${esc(sh.ownerName||'Friend')} · ${esc(sh.challengeTitle||'Challenge')}</b><div class="meta">Temporary access · ${Math.max(1,Math.ceil((sh.expiresAt-now)/60000))} min left</div></div><button class="btn sm" data-act="view-shared-progress" data-id="${esc(d.id)}">View</button></div>`); else {try{await deleteDoc(d.ref)}catch{}} }
    el.innerHTML=rows.length?rows.join(''):'<div class="li"><div class="grow">No active progress requests or shares.</div></div>';
  } catch(e){ console.error(e); el.innerHTML='<div class="li"><div class="grow">Could not load requests. Update Firestore rules for progressAccessRequests and temporaryProgressShares.</div></div>'; }
}
async function viewSharedProgress(id) {
  try { const s=await getDoc(doc(db,'temporaryProgressShares',id)); if(!s.exists()) return toast('This temporary share has expired.'); const x=s.data(); if(x.viewerUid!==S.uid || x.expiresAt<=Date.now()){try{await deleteDoc(doc(db,'temporaryProgressShares',id))}catch{};return toast('This temporary share has expired.');}
    const total=x.targets.length, done=Object.keys(x.done||{}).length;
    const lines=x.targets.map(t=>{const keys=Object.keys(x.done||{}).filter(k=>k===t.id||k.startsWith(t.id+'@'));const completed=keys.length>0;return `<div class="li"><div class="grow"><b>${esc(t.text||'Task')}</b><div class="meta">${esc([t.subject,t.chapter,t.topic].filter(Boolean).join(' · '))}</div></div><span class="badge ${completed?'live':''}">${completed?'Completed':'Pending'}</span></div>`}).join('');
    const notes=Object.entries(x.notes||{}).map(([d,n])=>`<div class="li"><div class="grow"><b>${esc(d)}</b><div style="white-space:pre-wrap">${esc(n)}</div></div></div>`).join('');
    const el=$('progress-access-panel'); el.innerHTML=`<div class="li"><div class="grow"><b>${esc(x.ownerName)} · ${esc(x.challengeTitle)}</b><div class="meta">${x.points} points · ${total} tasks · Expires in ${Math.max(1,Math.ceil((x.expiresAt-Date.now())/60000))} min</div></div><button class="btn sec sm" data-act="refresh-progress-access">Back</button></div><div class="lbl">Tasks</div>${lines||'<p class="sub">No tasks included.</p>'}<div class="lbl">Journal history</div>${notes||'<p class="sub">No notes shared.</p>'}`;
  } catch(e){console.error(e);toast('Could not open shared progress.');}
}
async function saveMe(fields) {
  if (DEMO) { S.me = { ...S.me, ...fields }; demoSync(); return; }
  if (!S.me) await ensureMember(S.chal.id);
  await updateDoc(doc(db, 'challenges', S.chal.id, 'members', S.uid), { ...fields, updatedAt: serverTimestamp() });
}
async function join(raw) {
  if (DEMO) return demoMsg();
  const code = String(raw || '').trim().toUpperCase();
  if (code.length !== 6) return toast('Codes have 6 characters.');
  try {
    const snap = await getDoc(doc(db, 'challenges', code));
    if (!snap.exists()) return toast('No challenge with that code.');
    const c = snap.data();
    if (!c.live && c.ownerUid !== S.uid) return toast('This challenge is not live yet.');
    await ensureMember(code); addMine(code, c.title); watch(code); S.pane = 'quests'; setView('challenge'); toast('Joined ' + c.title);
  } catch { toast('Could not join. Check your connection.'); }
}
async function toggle(tid) {
  const c = S.chal; if (!c || status(c) !== 'live') return;
  const t = c.targets.find(x => x.id === tid); if (!t) return;
  const day = today(), key = t.daily ? `${tid}@${day}` : tid;
  const done = { ...(S.me?.done || {}) };
  if (done[key]) delete done[key]; else done[key] = day;
  try { await saveMe({ name: S.name, done, points: calcPoints(c, done) }); } catch { toast('Could not save. Check your connection.'); }
}

