'use strict';
/* Challenge Room: admin (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ═══════════════════════════════════════════════════
   ADMIN PANEL
   ═══════════════════════════════════════════════════ */
function renderAdmin() {
  const el = $('pane-admin'); if (!el) return;
  const c = S.chal; const at = $('admin-tab');
  if (!c || c.ownerUid !== S.uid) { if (at) at.hidden = true; el.innerHTML = ''; return; }
  if (at) at.hidden = false;
  const st = status(c);
  const isArchived = !!c.archived;
  const members = S.members;
  const t = today();

  // Completion rate per target
  const totM = members.length || 1;
  const targetRows = (c.targets || []).map(g => {
    const key = g.daily ? `${g.id}@${t}` : g.id;
    const doneCount = members.filter(m => m.done?.[key]).length;
    const pct = Math.round(doneCount / totM * 100);
    return `<div class="completion-bar-wrap">
      <div class="meta"><span>${esc(g.text.slice(0,40))}${g.daily?' (daily)':''}</span><span>${doneCount}/${totM}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
    </div>`;
  }).join('');

  // Activity feed (last 10 events from members' done entries)
  const events = [];
  members.forEach(m => {
    Object.entries(m.done || {}).forEach(([k, date]) => {
      const g = (c.targets || []).find(x => x.id === k.split('@')[0]);
      if (g) events.push({ name: m.name || 'Player', text: g.text, date, pts: g.points });
    });
  });
  events.sort((a, b) => b.date.localeCompare(a.date));
  const feedHtml = events.slice(0, 10).map(e => `<div class="activity-row"><div class="av avatar">${esc(ini(e.name))}</div><div class="grow"><b>${esc(e.name)}</b> completed <i>${esc(e.text.slice(0,40))}</i><div class="meta">${fmt(e.date)} · +${e.pts} pts</div></div></div>`).join('') || '<div class="meta" style="padding:8px 0">No activity yet.</div>';

  // Inactive members (no task in last 3 days)
  const cutoff = dayOff(-3);
  const inactiveIds = new Set(members.filter(m => !Object.values(m.done || {}).some(d => d >= cutoff)).map(m => m.id));

  // Member kick rows
  const memberRows = members.filter(m => m.id !== S.uid).map(m => {
    const inactive = inactiveIds.has(m.id);
    return `<div class="admin-row"><div class="grow"><b>${esc(m.name||'Player')}${inactive?'<span class="inactive-chip">Inactive 3d</span>':''}</b><div class="meta">${m.points||0} pts</div></div><button class="btn bad sm" data-act="kick-member" data-uid="${esc(m.id)}" data-name="${esc(m.name||'Player')}">Kick</button></div>`;
  }).join('') || '<div class="meta" style="padding:8px 0">You are the only member.</div>';

  el.innerHTML = `
    ${isArchived ? `<div class="frozen-banner">🔒 This challenge is archived. The board and scores are frozen.</div>` : ''}
    <div class="lbl">Announcement</div>
    <p class="sub">Post a message visible to all members on their Home screen.</p>
    <textarea id="ann-text" maxlength="200" rows="2" placeholder="e.g. Mock test tomorrow — finish today's tasks!">${esc(c.announcement||'')}</textarea>
    <div class="btns"><button class="btn" data-act="post-announcement">Post announcement</button>${c.announcement?`<button class="btn sec" data-act="clear-announcement">Clear</button>`:''}</div>
    <div class="lbl">Extend / close date</div>
    <div class="row"><label for="admin-end" style="color:var(--mut);font-size:13px;flex:none;margin-right:8px">End date</label><input id="admin-end" type="date" value="${esc(c.endDate)}" style="flex:1"><button class="btn sm" style="margin-left:8px" data-act="admin-set-end">Save</button></div>
    <div class="btns"><button class="btn sec" data-act="close-challenge-now">Close challenge now</button></div>
    <div class="lbl">Transfer ownership</div>
    <select id="transfer-select" aria-label="Transfer to">
      <option value="">— choose member —</option>
      ${members.filter(m=>m.id!==S.uid).map(m=>`<option value="${esc(m.id)}">${esc(m.name||'Player')}</option>`).join('')}
    </select>
    <div class="btns"><button class="btn sec" data-act="admin-transfer">Transfer ownership</button></div>
    <div class="lbl">Members</div>
    <div class="group">${memberRows}</div>
    <div class="lbl">Completion rate — today's daily tasks</div>
    <div class="group" style="padding:10px 14px">${targetRows||'<div class="meta">No tasks.</div>'}</div>
    <div class="lbl">Activity feed</div>
    <div class="group" style="padding:10px 14px">${feedHtml}</div>
    <div class="lbl">Archive & export</div>
    ${isArchived
      ? `<div class="btns"><button class="btn sec" data-act="export-csv">Export CSV</button><button class="btn sec" data-act="clone-challenge">Rerun (clone challenge)</button></div>`
      : `<div class="btns"><button class="btn sec" data-act="export-csv">Export CSV</button><button class="btn sec" data-act="clone-challenge">Rerun (clone challenge)</button></div><div class="danger-zone"><div class="lbl">Archive</div><p class="sub">Freeze scores and mark challenge as complete. Cannot be undone.</p><button class="btn bad" data-act="archive-challenge">Archive and freeze</button></div>`
    }
    <div class="danger-zone"><div class="lbl">Delete</div><p class="sub">Remove this challenge for everyone. You can undo for 10 seconds.</p><button class="btn bad" data-act="delete">Delete challenge</button></div>`;
}

/* ═══════════════════════════════════════════════════
   ADMIN ACTIONS
   ═══════════════════════════════════════════════════ */
async function postAnnouncement() {
  const c = S.chal; if (!c || c.ownerUid !== S.uid) return;
  const text = $('ann-text')?.value.trim() || '';
  if (DEMO) return demoMsg();
  try {
    await updateDoc(doc(db, 'challenges', c.id), { announcement: text, announcementAt: today() });
    S.chal.announcement = text; S.meta[c.id] = metaOf(S.chal);
    toast(text ? 'Announcement posted.' : 'Announcement cleared.'); renderAdmin(); renderHome();
  } catch { toast('Could not post. Check connection.'); }
}
async function clearAnnouncement() { $('ann-text') && ($('ann-text').value = ''); postAnnouncement(); }
async function adminSetEndDate() {
  const c = S.chal; if (!c || c.ownerUid !== S.uid) return;
  const end = $('admin-end')?.value; if (!end || end < c.startDate) return toast('End date must be after start date.');
  if (DEMO) return demoMsg();
  try { await updateDoc(doc(db, 'challenges', c.id), { endDate: end }); toast('End date updated.'); S.chal.endDate = end; S.meta[c.id] = metaOf(S.chal); renderAll(); } catch { toast('Could not update.'); }
}
async function closeChallengeNow() {
  const c = S.chal; if (!c || c.ownerUid !== S.uid) return;
  if (!confirm('End this challenge now? This sets today as the end date.')) return;
  if (DEMO) return demoMsg();
  try { await updateDoc(doc(db, 'challenges', c.id), { endDate: today(), live: false }); toast('Challenge closed.'); S.chal.endDate = today(); S.chal.live = false; S.meta[c.id] = metaOf(S.chal); renderAll(); } catch { toast('Could not close.'); }
}
async function kickMember(uid, name) {
  const c = S.chal; if (!c || c.ownerUid !== S.uid) return;
  if (!confirm(`Remove ${name} from this challenge?`)) return;
  if (DEMO) return demoMsg();
  try { await deleteDoc(doc(db, 'challenges', c.id, 'members', uid)); toast(`${name} removed.`); } catch { toast('Could not remove member.'); }
}
async function adminTransfer() {
  const c = S.chal; if (!c || c.ownerUid !== S.uid) return;
  const uid = $('transfer-select')?.value; if (!uid) return toast('Choose a member.');
  const name = S.members.find(m => m.id === uid)?.name || 'Player';
  if (!confirm(`Transfer ownership to ${name}? You will lose admin access.`)) return;
  if (DEMO) return demoMsg();
  try { await updateDoc(doc(db, 'challenges', c.id), { ownerUid: uid, ownerName: name }); toast('Ownership transferred.'); } catch { toast('Could not transfer.'); }
}
async function archiveChallenge() {
  const c = S.chal; if (!c || c.ownerUid !== S.uid) return;
  if (!confirm('Archive and freeze this challenge? Scores are locked. This cannot be undone.')) return;
  if (DEMO) return demoMsg();
  try { await updateDoc(doc(db, 'challenges', c.id), { archived: true, live: false, archivedAt: today() }); toast('Challenge archived and scores frozen.'); } catch { toast('Could not archive.'); }
}
function exportCSV() {
  const c = S.chal; if (!c) return;
  const rows = [['Name', 'Points', 'Rank', ...( c.targets || []).map(t => t.text.slice(0,30))]];
  const list = [...S.members].sort((a,b) => (b.points||0)-(a.points||0));
  list.forEach((m, i) => {
    const done = m.done || {};
    const t = today();
    const cells = (c.targets || []).map(g => { const key = g.daily ? `${g.id}@${t}` : g.id; return done[key] ? 'done' : ''; });
    rows.push([m.name || 'Player', m.points || 0, i + 1, ...cells]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = (c.title || 'challenge').replace(/[^a-z0-9]/gi, '_') + '_results.csv';
  a.click(); toast('CSV downloaded.');
}
async function cloneChallenge() {
  const c = S.chal; if (!c || c.ownerUid !== S.uid) return;
  if (!confirm('Clone this challenge? A new copy will be created with the same tasks and fresh start/end dates (today + same duration).')) return;
  if (DEMO) return demoMsg();
  try {
    const dur = Math.max(1, Math.round((new Date(c.endDate) - new Date(c.startDate)) / 86400000));
    const start = today(), end = dayOff(dur);
    let code; for (let i = 0; i < 5; i++) { code = genCode(); if (!(await getDoc(doc(db, 'challenges', code))).exists()) break; }
    const title = c.title + ' (rerun)';
    await setDoc(doc(db, 'challenges', code), { title, desc: c.desc || '', startDate: start, endDate: end, ...stampPlan(c.targets || [], c.syllabus), childChallenges: [], challengeType: c.challengeType || 'standard', discoverable: true, live: true, ownerUid: S.uid, ownerName: S.name, createdAt: serverTimestamp() });
    await ensureMember(code); addMine(code, title); watch(code); await loadMeta();
    toast('Challenge cloned! Opening new copy.'); setView('challenge');
  } catch { toast('Could not clone. Check connection.'); }
}

