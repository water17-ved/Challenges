'use strict';
/* Challenge Room: challenge-actions (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ═══════════════════════════════════════════════════
   AUTO-MEGA ON CREATE
   ═══════════════════════════════════════════════════ */
async function createChallengeAutoMega() {
  if (DEMO) return demoMsg();
  const title = $('c-title')?.value.trim(), desc = $('c-desc')?.value.trim() || '';
  const startDate = $('c-start')?.value, endDate = $('c-end')?.value;
  if (!title) return toast('Add a title.');
  if (!S.draft.length) return toast('Add at least one task.');
  if (!startDate || !endDate || endDate < startDate) return toast('Check the start and end dates.');
  const vis = $('c-vis')?.value || 'public';
  const discoverable = vis !== 'private';
  const allowSuggest = vis === 'editable';
  // auto-mega check
  const subjects = [...new Set(S.draft.map(t => t.subject).filter(Boolean))];
  if (subjects.length >= 3) {
    // create one standard challenge per subject, then wrap in mega
    const childCodes = [];
    for (const subj of subjects) {
      const tasks = S.draft.filter(t => t.subject === subj);
      let code; for (let i = 0; i < 5; i++) { code = genCode(); if (!(await getDoc(doc(db, 'challenges', code))).exists()) break; }
      await setDoc(doc(db, 'challenges', code), { title: `${title} – ${subj}`, desc, startDate, endDate, ...stampPlan(tasks), childChallenges: [], challengeType: 'standard', discoverable, allowSuggest, live: true, ownerUid: S.uid, ownerName: S.name, createdAt: serverTimestamp() });
      await ensureMember(code); addMine(code, `${title} – ${subj}`);
      childCodes.push({ code, title: `${title} – ${subj}` });
    }
    // create mega
    let megaCode; for (let i = 0; i < 5; i++) { megaCode = genCode(); if (!(await getDoc(doc(db, 'challenges', megaCode))).exists()) break; }
    await setDoc(doc(db, 'challenges', megaCode), { title, desc, startDate, endDate, targets: [], childChallenges: childCodes, challengeType: 'mega', discoverable, allowSuggest, live: true, ownerUid: S.uid, ownerName: S.name, createdAt: serverTimestamp() });
    await ensureMember(megaCode); addMine(megaCode, title);
    watch(megaCode);
    S.draft = []; renderDraft(); $('auto-mega-note').hidden = true;
    toast(`Auto Mega Challenge created with ${subjects.length} branches!`);
    const box = $('created-box'); box.hidden = false;
    box.innerHTML = `<b>Mega Challenge live! ${subjects.length} branches created.</b><div class="codebox">${megaCode}</div><div class="sub">Share this code. Members can join individual branches too.</div><div class="btns"><button class="btn" data-act="share" data-code="${megaCode}">Share</button><button class="btn sec" data-act="open" data-code="${megaCode}">Open</button></div>`;
    return;
  }
  // standard create
  let code; for (let i = 0; i < 5; i++) { code = genCode(); if (!(await getDoc(doc(db, 'challenges', code))).exists()) break; }
  await setDoc(doc(db, 'challenges', code), { title, desc, startDate, endDate, ...stampPlan(S.draft), childChallenges: [], challengeType: 'standard', discoverable, allowSuggest, live: true, ownerUid: S.uid, ownerName: S.name, createdAt: serverTimestamp() });
  await ensureMember(code); addMine(code, title); watch(code);
  S.draft = []; renderDraft();
  const box = $('created-box'); box.hidden = false;
  box.innerHTML = `<b>Your challenge is live</b><div class="codebox">${code}</div><div class="sub">Friends open the link, or enter this code under Join with code.</div><div class="btns"><button class="btn" data-act="share" data-code="${code}">Share</button><button class="btn sec" data-act="open" data-code="${code}">Open</button></div>`;
}

/* BADGES */
const BADGE_DEFS={oak:{name:"Oak",sub:"Mega Champion"},cherry_blossom:{name:"Cherry Blossom",sub:"Runner-up"},lotus:{name:"Lotus",sub:"Third Place"},sunflower:{name:"Sunflower",sub:"Top 5"},pine:{name:"Pine",sub:"Top 10"},bamboo:{name:"Bamboo",sub:"Participant"},lily:{name:"Lily",sub:"First Challenge"},olive:{name:"Olive",sub:"7-day streak"},willow:{name:"Willow",sub:"Mega Veteran"},dead_tree:{name:"Dead Tree",sub:"Never Gave Up"}};
const BADGE_IMGS={
  'oak': 'images/badges/oak.png',
  'lily': 'images/badges/lily.png',
  'bamboo': 'images/badges/bamboo.png',
  'cherry_blossom': 'images/badges/cherry_blossom.png',
  'pine': 'images/badges/pine.png',
  'olive': 'images/badges/olive.png',
  'willow': 'images/badges/willow.png',
  'lotus': 'images/badges/lotus.png',
  'sunflower': 'images/badges/sunflower.png',
  'dead_tree': 'images/badges/dead_tree.png'
};
function badgeSvg(k,size=52){const src=BADGE_IMGS[k]||'';return src?`<img src="${src}" width="${size}" height="${size}" alt="${k}" style="border-radius:8px;object-fit:cover">`:'';}
function earnedBadges(){
  const e=new Set(ls.get("cr_badges",[]));
  if(streak7Days()>=7)e.add("olive");
  if(S.mine.length>=1)e.add("lily");
  if(S.mine.filter(m=>{const x=S.meta[m.code];return x&&x.challengeType==="mega"&&(status(x)==="ended"||x.archived);}).length>=2)e.add("willow");
  if(S.mine.filter(m=>{const x=S.meta[m.code];return x&&(status(x)==="ended"||x.archived);}).length>=1)e.add("dead_tree");
  return[...e];
}
function awardMegaBadge(rank){
  const b=ls.get("cr_badges",[]);
  const k=rank===1?"oak":rank===2?"cherry_blossom":rank===3?"lotus":rank<=5?"sunflower":rank<=10?"pine":"bamboo";
  if(!b.includes(k)){b.push(k);ls.set("cr_badges",b);toast("\uD83C\uDFC5 Badge earned: "+BADGE_DEFS[k].name+"!");}
  renderBadgeShelf();renderProfileBadges();
}
function checkMegaWinner(megaCode){
  const x=S.meta[megaCode];if(!x||x.challengeType!=="mega")return;
  if(status(x)!=="ended"&&!x.archived)return;
  const totals={};
  (x.childChallenges||[]).forEach(ch=>{S.members.forEach(m=>{totals[m.id]=(totals[m.id]||0)+(m.points||0);});});
  const sorted=Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  const myRank=sorted.findIndex(([uid])=>uid===S.uid)+1;
  if(myRank>0)awardMegaBadge(myRank);
}
function renderBadgeShelf(){
  const el=$("badge-shelf");if(!el)return;
  const e=new Set(earnedBadges());if(!e.size){el.innerHTML="";return;}
  el.innerHTML='<div class="lbl">Your badges</div><div class="badge-wall">'+[...e].map(k=>{const d=BADGE_DEFS[k];return'<div class="badge-card earned" title="'+d.sub+'"><div>'+badgeSvg(k)+'</div><div class="bc-name">'+d.name+'</div><div class="bc-sub">'+d.sub+'</div></div>';}).join("")+"</div>";
}
function renderProfileBadges(){
  const el=$("profile-badges");if(!el)return;
  const e=new Set(earnedBadges());
  if(!e.size){el.innerHTML='<div class="meta">No badges yet. Win a mega challenge to earn one.</div>';return;}
  el.innerHTML=[...e].map(k=>{const d=BADGE_DEFS[k];return'<div class="pb-chip">'+badgeSvg(k)+'<span>'+d.name+'</span></div>';}).join("");
}

function renderBadgeSheet(){
  const el=$('badge-sheet-body'); if(!el) return;
  const earned=new Set(earnedBadges());
  const all=Object.keys(BADGE_DEFS);
  if(!all.length){el.innerHTML='<div class="meta">No badges defined.</div>';return;}
  const earnedList=all.filter(k=>earned.has(k));
  const lockedList=all.filter(k=>!earned.has(k));
  const pct=Math.round((earnedList.length/Math.max(1,all.length))*100);
  const imgOrLock=(k,size=52)=>{const src=BADGE_IMGS[k];return src?`<img src="${src}" width="${size}" height="${size}" alt="${BADGE_DEFS[k]?.name||k}" loading="lazy">`:
    `<div style="width:${size}px;height:${size}px;border-radius:16px;display:grid;place-items:center;font-size:22px">🔒</div>`;};
  const card=k=>{const d=BADGE_DEFS[k];return`<div class="badge-card ${earned.has(k)?'earned':'locked'}"><div>${imgOrLock(k,76)}</div><div class="bc-name">${d.name}</div><div class="bc-sub">${d.sub}</div></div>`;};
  el.innerHTML=`
    <div class="badge-collection-head">
      <div style="flex:1;min-width:0">
        <div class="bch-title">Your collection</div>
        <div class="bch-count">${earnedList.length} of ${all.length} badges discovered</div>
        <div class="badge-progress"><span style="width:${pct}%"></span></div>
      </div>
      <div class="bch-number">${pct}%</div>
    </div>
    ${earnedList.length?`
      <div class="badge-section-title"><span>✦ Unlocked</span><span class="bst-count">${earnedList.length}</span></div>
      <div class="badge-wall">${earnedList.map(card).join('')}</div>
    `:`<div class="meta" style="padding:14px;border:1px dashed var(--line);border-radius:14px;margin:8px 0 14px">Your collection starts with your first win. Complete a mega challenge to unlock a badge.</div>`}
    ${lockedList.length?`
      <div class="badge-section-title"><span>◈ Still to discover</span><span class="bst-count">${lockedList.length}</span></div>
      <div class="badge-wall">${lockedList.map(card).join('')}</div>
    `:''}`;
}
function openBadgeSheet(){ renderBadgeSheet(); $('badge-sheet')?.classList.add('open'); $('badge-trigger')?.classList.add('active'); }
function closeBadgeSheet(){ $('badge-sheet')?.classList.remove('open'); $('badge-trigger')?.classList.remove('active'); }
async function saveNote() {
  if (!S.chal) return toast('Open a challenge first.');
  const notes = { ...(S.me?.notes || {}) }; const v = $('j-text').value.trim();
  if (v) notes[today()] = v; else delete notes[today()];
  try { await saveMe({ notes }); toast('Note saved'); } catch { toast('Could not save the note.'); }
}
async function toggleLive() {
  const c = S.chal; if (!c || c.ownerUid !== S.uid) return; if (DEMO) return demoMsg();
  try { await updateDoc(doc(db, 'challenges', c.id), { live: !c.live }); toast(c.live ? 'Challenge paused' : 'Challenge is live'); } catch { toast('Could not update.'); }
}
async function leave() {
  if (DEMO) return demoMsg();
  const c = S.chal; if (!c || !confirm('Leave this challenge? Your points will be removed.')) return;
  try { await deleteDoc(doc(db, 'challenges', c.id, 'members', S.uid)); } catch {}
  removeMine(c.id); setView('home');
}
/* ---------- delete with warning + 10 s undo ---------- */
const UNDO_MS = 10000;
function showUndoBar(title) { const b = $('undo-bar'); $('undo-msg').textContent = `Deleting “${title}”`; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
function hideUndoBar() { $('undo-bar').classList.remove('show'); }
function removeChallenge() {
  const c = S.chal; if (!c || c.ownerUid !== S.uid) return toast('Only the challenge owner can delete it.');
  if (DEMO) return demoMsg();
  const others = Math.max(0, S.members.length - 1);
  $('del-body').textContent = `“${c.title}” will be deleted` + (others ? ` for you and ${others} other ${others === 1 ? 'member' : 'members'}.` : '.');
  $('del-modal').classList.add('on');
}
function closeDeleteModal() { $('del-modal').classList.remove('on'); }
function startDelete() {
  const c = S.chal; closeDeleteModal(); if (!c || c.ownerUid !== S.uid) return;
  if (S.pendingDel) commitDelete(); // only one undo window at a time: finish the previous delete first
  const idx = S.mine.findIndex(m => m.code === c.id), entry = S.mine[idx] || { code: c.id, title: c.title };
  const parent = megaOf(c.id), parentMeta = parent ? S.meta[parent] : null;
  S.pendingDel = { code: c.id, title: c.title, idx, entry, parent: parentMeta && parentMeta.owner === S.uid ? parent : '', timer: setTimeout(commitDelete, UNDO_MS) };
  if (idx >= 0) S.mine.splice(idx, 1);           // hide everywhere locally; nothing is written to Firestore yet
  unwatch(); S.active = '';
  setView('home'); renderAll(); showUndoBar(c.title);
}
function undoDelete() {
  const p = S.pendingDel; if (!p) return;
  clearTimeout(p.timer); S.pendingDel = null; hideUndoBar();
  if (p.idx >= 0) S.mine.splice(Math.min(p.idx, S.mine.length), 0, p.entry);
  S.active = p.code; watch(p.code); renderAll(); toast('Delete undone.');
}
async function commitDelete() {
  const p = S.pendingDel; if (!p) return;
  clearTimeout(p.timer); S.pendingDel = null; hideUndoBar();
  try {
    await deleteDoc(doc(db, 'challenges', p.code));
    if (p.parent) { try { await updateDoc(doc(db, 'challenges', p.parent), { childChallenges: (S.meta[p.parent].childChallenges || []).filter(ch => ch.code !== p.code) }); } catch {} }
    delete S.meta[p.code]; delete S.done[p.code]; ls.set('cr_mine', S.mine);
    if (!S.active) { S.active = S.mine[0]?.code || ''; if (S.active) watch(S.active); }
    ls.set('cr_active', S.active);
    renderAll(); toast('Challenge deleted.');
  } catch {
    if (p.idx >= 0) S.mine.splice(Math.min(p.idx, S.mine.length), 0, p.entry);
    S.active = p.code; watch(p.code); renderAll(); toast('Could not delete. The challenge was restored.');
  }
}
async function createChallenge() {
  try { await createChallengeAutoMega(); } catch(e) { console.error(e); toast('Could not create. Check Firestore rules and your connection.'); }
}
function beginEditChallenge() {
  const c = S.chal;
  if (!c || c.ownerUid !== S.uid) return toast('Only the challenge owner can edit it.');
  if (DEMO) return demoMsg();
  S.editCode = c.id;
  S.editSyllabus = JSON.parse(JSON.stringify(c.syllabus || []));
  S.editTargets = (c.targets || []).map((t, i) => ({ subjectId: t.subjectId, chapterId: t.chapterId, id: t.id || `t${Date.now().toString(36)}${i}`, text: t.text || '', subject: t.subject || 'General', chapter: t.chapter || 'General', topic: t.topic || 'General', daily: !!t.daily, points: Number(t.points) || 10 }));
  $('e-title').value = c.title || ''; $('e-desc').value = c.desc || '';
  $('e-start').value = c.startDate || today(); $('e-end').value = c.endDate || today();
  const mega = c.challengeType === 'mega';
  $('edit-mega-children').hidden = !mega;
  ['et-subject','et-chapter','et-topic','et-text','et-type'].forEach(id => { $(id).disabled = mega; });
  $('edit-task-list').hidden = mega;
  renderEditTasks(); renderEditStructure();
  if (mega) renderMegaPicksEdit(c.childChallenges || []);
  setView('edit');
}
function renderEditTasks() {
  const el = $('edit-task-list'); if (!el) return;
  if (!S.editTargets.length) { el.innerHTML = '<div class="empty"><b>No tasks yet</b>Add a task below to start building this challenge.</div>'; return; }
  el.innerHTML = S.editTargets.map((t,i) => `<div class="market-card edit-task" data-edit-index="${i}">
    <label>Task</label><input maxlength="100" data-edit-field="text" value="${esc(t.text)}" aria-label="Task text ${i+1}">
    <div class="row"><div class="grow"><label>Subject / field</label><input maxlength="80" data-edit-field="subject" value="${esc(t.subject)}"></div><div class="grow"><label>Chapter / branch</label><input maxlength="80" data-edit-field="chapter" value="${esc(t.chapter)}"></div></div>
    <label>Topic / sub-branch</label><input maxlength="80" data-edit-field="topic" value="${esc(t.topic)}">
    <div class="row" style="margin-top:10px"><select data-edit-field="daily" aria-label="Task frequency"><option value="daily" ${t.daily?'selected':''}>Daily task</option><option value="once" ${!t.daily?'selected':''}>One-time task</option></select><button class="btn bad sm" data-act="edit-remove-task" data-i="${i}">Remove</button></div>
  </div>`).join('');
}
function renderMegaPicksEdit(current) {
  const el = $('mega-picks-edit'); if (!el) return;
  const selected = new Set((current || []).map(x => x.code));
  const candidates = S.mine.filter(m => m.code !== S.editCode && (S.meta[m.code]?.challengeType || 'standard') !== 'mega' && !S.meta[m.code]?.gone && !claimed(m.code, S.editCode));
  el.innerHTML = candidates.length ? candidates.map(m => `<label class="checkline"><input type="checkbox" data-mega-edit-code="${esc(m.code)}" data-mega-edit-title="${esc(m.title)}" ${selected.has(m.code)?'checked':''}><span><b>${esc(m.title)}</b><div class="meta">Code ${esc(m.code)}</div></span></label>`).join('') : '<div class="empty"><b>No standard challenges available</b>Create or join standard challenges to add branches.</div>';
}
function addEditTask() {
  if (!S.editCode || S.chal?.challengeType === 'mega') return;
  const text = $('et-text').value.trim(); if (!text) return toast('Enter a task first.');
  if (S.editTargets.length >= 100) return toast('Up to 100 tasks per challenge.');
  S.editTargets.push({ id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2,5), text, subject: $('et-subject').value.trim() || 'General', chapter: $('et-chapter').value.trim() || 'General', topic: $('et-topic').value.trim() || 'General', daily: $('et-type').value === 'daily', points: 10 });
  $('et-text').value = ''; renderEditTasks(); renderEditStructure(); toast('Task added to the edit list. Save changes to publish it.');
}
async function saveEditChallenge() {
  if (DEMO) return demoMsg();
  const c = S.chal; if (!c || c.id !== S.editCode || c.ownerUid !== S.uid) return toast('You can only edit a challenge you own.');
  const title = $('e-title').value.trim(), desc = $('e-desc').value.trim(), startDate = $('e-start').value, endDate = $('e-end').value;
  if (!title) return toast('Add a title.');
  if (!startDate || !endDate || endDate < startDate) return toast('Check the start and end dates.');
  const fields = { title, desc, startDate, endDate, updatedAt: serverTimestamp() };
  if (c.challengeType === 'mega') {
    const childChallenges = [...document.querySelectorAll('[data-mega-edit-code]:checked')].map(x => ({ code:x.dataset.megaEditCode, title:x.dataset.megaEditTitle }));
    if (!childChallenges.length) return toast('Select at least one smaller challenge.');
    fields.childChallenges = childChallenges;
  } else {
    const targets = S.editTargets.map(t => ({ ...t, text:String(t.text||'').trim(), subject:String(t.subject||'').trim() || 'General', chapter:String(t.chapter||'').trim() || 'General', topic:String(t.topic||'').trim() || 'General', daily:!!t.daily, points:Number(t.points)||10 }));
    if (!targets.length) return toast('Add at least one task.');
    if (targets.some(t => !t.text)) return toast('Every task needs task text.');
    const plan = stampPlan(targets, S.editSyllabus); fields.targets = plan.targets; fields.syllabus = plan.syllabus;
  }
  try {
    await updateDoc(doc(db, 'challenges', c.id), fields);
    addMine(c.id, title); S.chal = { ...c, ...fields }; S.meta[c.id] = metaOf(S.chal); renderAll(); setView('challenge');
    toast('Challenge changes saved.');
  } catch { toast('Could not save changes. Check your connection and Firestore rules.'); }
}

async function createMegaChallenge() {
  if (DEMO) return demoMsg();
  const title = $('mc-title').value.trim(), desc = $('mc-desc').value.trim();
  const startDate = $('mc-start').value, endDate = $('mc-end').value;
  const childChallenges = [...document.querySelectorAll('[data-mega-create-code]:checked')].map(x => ({ code: x.dataset.megaCreateCode, title: x.dataset.megaCreateTitle }));
  if (!title) return toast('Add a title for your mega challenge.');
  if (!childChallenges.length) return toast('Select at least one smaller challenge.');
  if (!startDate || !endDate || endDate < startDate) return toast('Check the start and end dates.');
  try {
    let code;
    for (let i = 0; i < 5; i++) { code = genCode(); if (!(await getDoc(doc(db, 'challenges', code))).exists()) break; }
    await setDoc(doc(db, 'challenges', code), { title, desc, startDate, endDate, targets: [], childChallenges, challengeType: 'mega', discoverable: true, live: true, ownerUid: S.uid, ownerName: S.name, createdAt: serverTimestamp() });
    await ensureMember(code); addMine(code, title); watch(code); await loadMeta();
    $('mc-title').value = ''; $('mc-desc').value = '';
    document.querySelectorAll('[data-mega-create-code]').forEach(x => { x.checked = false; });
    const box = $('mega-created-box'); box.hidden = false;
    box.innerHTML = `<b>Mega challenge created!</b><div class="codebox">${code}</div><div class="sub">Your smaller challenges are linked as branches. Share the code with friends.</div><div class="btns"><button class="btn" data-act="share" data-code="${code}">Share</button><button class="btn sec" data-act="open" data-code="${code}">Open</button></div>`;
    toast('Mega challenge created');
  } catch { toast('Could not create mega challenge. Check Firestore rules and your connection.'); }
}

function addTarget() {
  const text = $('t-text').value.trim();
  if (!text) return toast('Type a target first.');
  if (S.draft.length >= 100) return toast('Up to 100 tasks per challenge.');
  const subject = $('t-subject').value, chapter = $('t-chapter').value.trim() || 'General', topic = $('t-topic').value.trim() || 'General';
  S.draft.push({ id: 't' + Date.now().toString(36) + S.draft.length, text, subject, chapter, topic, daily: $('t-type').value === 'daily', points: 10 });
  $('t-text').value = ''; renderDraft(); $('t-text').focus();
}
async function share(code) {
  const url = link(code), text = `Join my challenge on Challenge Room. Code: ${code}`;
  if (navigator.share) { try { await navigator.share({ title: 'Challenge Room', text, url }); } catch {} return; }
  copy(url, 'Link copied');
}
function openChallenge(code) { const wasChallenge = S.view === 'challenge', previousCode = S.active; if (code !== S.active || !S.chal) watch(code); if (wasChallenge && previousCode !== code) history.pushState({ crApp: true, view: 'challenge', pane: 'quests', modal: null }, '', location.href); S.pane = 'quests'; setView('challenge'); }

