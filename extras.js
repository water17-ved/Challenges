'use strict';
/* Challenge Room: extras (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ═══════════════════════════════════════════════════
   GOOGLE CALENDAR SYNC (OAuth via GIS)
   ═══════════════════════════════════════════════════ */
const GCal = (() => {
  const CLIENT_ID = ''; // user must fill in
  const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
  let tokenClient = null, accessToken = null;
  function init() {
    if (!window.google?.accounts?.oauth2 || !CLIENT_ID) return;
    tokenClient = window.google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: r => { if (r?.access_token) { accessToken = r.access_token; ls.set('gcal_token', accessToken); toast('Google Calendar connected.'); } } });
    const saved = ls.get('gcal_token', null); if (saved) accessToken = saved;
  }
  function connect() { if (!tokenClient) return toast('Google Calendar not configured. Add your OAuth Client ID.'); tokenClient.requestAccessToken(); }
  async function createEvent(title, startDate, endDate, description) {
    if (!accessToken) return;
    const body = { summary: title, description, start: { date: startDate }, end: { date: endDate }, reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 480 }] } };
    try {
      const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method:'POST', headers:{ Authorization:`Bearer ${accessToken}`, 'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (!r.ok) { accessToken = null; ls.set('gcal_token', null); return; }
      const ev = await r.json(); return ev.id;
    } catch {}
  }
  async function syncChallenge(code, title, startDate, endDate, desc) {
    if (!accessToken) return;
    const evId = ls.get('gcal_ev_' + code, null);
    if (evId) return;
    const id = await createEvent(`📌 ${title}`, startDate, endDate, desc || 'Challenge Room challenge');
    if (id) { ls.set('gcal_ev_' + code, id); toast('Synced to Google Calendar.'); }
  }
  return { init, connect, syncChallenge };
})();

function qjoin() {
  const code = $('qjoin-code')?.value.trim().toUpperCase().slice(0,6);
  if (!code || code.length < 4) return toast('Enter a valid code.');
  S.pendingCode = code; setView('join'); $('join-code').value = code;
}


/* ═══════════════════════════════════════════════════
   GLOBAL LEADERBOARD
   ═══════════════════════════════════════════════════ */
async function loadGlobalLeaderboard() {
  const el = $('global-lb-list'); if (!el) return;
  el.innerHTML = '<div class="meta" style="padding:8px 0">Loading…</div>';
  try {
    const snap = await getDocs(query(collection(db, 'challenges'), where('discoverable', '==', true)));
    const playerMap = {};
    await Promise.all(snap.docs.map(async d => {
      const members = await getDocs(collection(db, 'challenges', d.id, 'members'));
      members.docs.forEach(m => {
        const data = m.data();
        const uid = m.id;
        if (!playerMap[uid]) playerMap[uid] = { name: data.name || 'Player', pts: 0, challenges: 0 };
        playerMap[uid].pts += Number(data.points) || 0;
        playerMap[uid].challenges++;
      });
    }));
    const list = Object.values(playerMap).sort((a, b) => b.pts - a.pts).slice(0, 50);
    if (!list.length) { el.innerHTML = empty('No data yet', 'Join public challenges to appear here.'); return; }
    el.innerHTML = '<div class="group" style="padding:10px 14px">' + list.map((p, i) => {
      const cls = i === 0 ? 'lb-row top1' : i === 1 ? 'lb-row top2' : i === 2 ? 'lb-row top3' : 'lb-row';
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
      return `<div class="${cls}"><div class="lb-rank">${medal}</div><div class="avatar">${esc(ini(p.name))}</div><div class="grow"><b>${esc(p.name)}</b><div class="meta">${p.challenges} challenge${p.challenges > 1 ? 's' : ''}</div></div><div class="lb-pts">${p.pts}</div></div>`;
    }).join('') + '</div>';
  } catch { el.innerHTML = empty('Unavailable', 'Firestore rules must allow reading member subcollections of public challenges.'); }
}

/* ═══════════════════════════════════════════════════
   ARCHIVE VIEW
   ═══════════════════════════════════════════════════ */
function renderArchive() {
  const el = $('archive-list'); if (!el) return;
  const ended = S.mine.filter(m => { const x = S.meta[m.code]; return x && !x.gone && (status(x) === 'ended' || x.archived); });
  if (!ended.length) { el.innerHTML = empty('No archived challenges', 'Challenges you complete will appear here.'); return; }
  el.innerHTML = '<div class="group">' + ended.map(m => {
    const x = S.meta[m.code], st = x.archived ? 'archived' : 'ended';
    const c = counts(m.code);
    return `<button class="li" data-act="open" data-code="${esc(m.code)}">
      <div class="grow"><b>${esc(m.title)}</b>
        <div class="meta">${fmt(x.startDate)} – ${fmt(x.endDate)}</div>
        ${c ? `<div class="meta">${c.od}/${c.ot} tasks · ${c.dd}/${c.dt} daily</div>` : ''}
      </div>
      <span class="badge ${st}">${st}</span>
      <svg class="i chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
    </button>`;
  }).join('') + '</div>';
}

/* ═══════════════════════════════════════════════════
   IMPROVED DISCOVERY
   ═══════════════════════════════════════════════════ */

async function suggestEdit(code, title) {
  if (!S.uid) return toast('Sign in to suggest edits.');
  const text = prompt(`Suggest a task or change for "${title}":\n(Describe what you'd add or change)`);
  if (!text?.trim()) return;
  try {
    await setDoc(doc(db, 'challenges', code, 'suggestions', S.uid + '_' + Date.now()), { uid: S.uid, name: S.name || 'Player', text: text.trim(), createdAt: serverTimestamp() });
    toast('Suggestion sent to the challenge owner.');
  } catch { toast('Could not send suggestion. Check connection.'); }
}

/* ═══════════════════════════════════════════════════
   BULK TASK ADDER
   ═══════════════════════════════════════════════════ */
function openBulkAdder() {
  $('bulk-adder-card').hidden = false;
  renderBulkRows();
}
function closeBulkAdder() { $('bulk-adder-card').hidden = true; }
function renderBulkRows() {
  const el = $('bulk-task-rows'); if (!el) return;
  el.innerHTML = Array.from({length: S.bulkRows}, (_, i) => `
    <div class="bulk-task-row">
      <input class="bulk-task-text" data-i="${i}" maxlength="100" placeholder="Task ${i+1}" aria-label="Task ${i+1}">
      <select class="bulk-task-type" data-i="${i}"><option value="daily">Daily</option><option value="once">One-time</option></select>
    </div>`).join('');
}
function bulkAddRow() { S.bulkRows++; renderBulkRows(); }
function bulkSaveTopic() {
  const subj = $('b-subject')?.value || 'General';
  const chapter = $('b-chapter')?.value.trim() || '';
  const topic = $('b-topic')?.value.trim() || '';
  const texts = [...document.querySelectorAll('.bulk-task-text')];
  const types = [...document.querySelectorAll('.bulk-task-type')];
  let added = 0;
  texts.forEach((inp, i) => {
    const text = inp.value.trim(); if (!text) return;
    const type = types[i]?.value || 'daily';
    if (S.draft.length >= 100) return;
    S.draft.push({ id: 't' + Date.now().toString(36) + S.draft.length + i, text, subject: subj, chapter, topic, daily: type === 'daily', points: 10 });
    added++;
  });
  if (!added) return toast('Enter at least one task.');
  toast(`${added} task${added>1?'s':''} added.`);
  renderDraft(); checkAutoMega();
}
function bulkClearTopic() {
  $('b-topic') && ($('b-topic').value = '');
  S.bulkRows = 1; renderBulkRows();
  toast('Topic cleared — set a new topic and add more tasks.');
}
function checkAutoMega() {
  const subjects = new Set(S.draft.map(t => t.subject).filter(Boolean));
  const el = $('auto-mega-note'); if (el) el.hidden = subjects.size < 3;
}

