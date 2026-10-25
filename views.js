'use strict';
/* Challenge Room: views (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ---------- views ---------- */
const TAB = { home: 'home', join: 'home', create: 'challenge', edit: 'challenge', 'create-mega': 'challenge', 'challenge-hub': 'challenge', 'challenge-market': 'challenge', 'challenge-mine': 'challenge', 'challenge-mega': 'challenge', 'global-lb': 'challenge', archive: 'challenge', challenge: 'challenge', activity: 'activity', ai: 'ai', profile: 'profile' };
function paintView(v, scroll = true) {
  S.view = v;
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('on', el.id === 'view-' + v));
  document.querySelectorAll('nav button').forEach(b => b.dataset.v === TAB[v] ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  $('back').classList.toggle('on', v === 'join' || v === 'create' || v === 'create-mega' || v === 'edit' || v === 'challenge' || v === 'challenge-hub' || v === 'challenge-market' || v === 'challenge-mine' || v === 'challenge-mega' || v === 'global-lb' || v === 'archive' || v === 'activity' || v === 'ai' || v === 'profile');
  if (v === 'home' || v === 'challenge-mine' || v === 'challenge-mega' || v === 'create-mega' || v === 'archive') loadMeta(); if (v === 'global-lb') loadGlobalLeaderboard(); if (v === 'market') loadMarket();
  if (v === 'create-mega') renderMegaPicksCreate();
  if (v === 'challenge-market') loadMarket();
  renderAll(); if (scroll) window.scrollTo(0, 0);
}
function setView(v, opts = {}) {
  if (!opts.fromPop && v !== S.view) history.pushState({ crApp: true, view: v, pane: S.pane, modal: null }, '', location.href);
  paintView(v, opts.scroll !== false);
  if (!opts.fromPop && history.state?.crApp) history.replaceState({ ...history.state, view: S.view, pane: S.pane }, '', location.href);
}
function setPane(p, opts = {}) {
  if (!opts.fromPop && p !== S.pane && S.view === 'challenge') history.pushState({ crApp: true, view: S.view, pane: p, modal: null }, '', location.href);
  S.pane = p;
  document.querySelectorAll('.pane').forEach(el => el.classList.toggle('on', el.id === 'pane-' + p));
  document.querySelectorAll('#seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === p)));
}
function goBack() {
  if ($('name-modal').classList.contains('on')) { history.back(); return; }
  if (history.state?.crApp && (history.state.view !== 'home' || history.state.pane !== 'quests')) { history.back(); return; }
  if (S.view !== 'home') { setView('home'); return; }
  // On the home screen, let the browser/app close normally.
  history.back();
}
window.addEventListener('popstate', e => {
  const st = e.state;
  if (st?.crApp) {
    if (st.modal === 'name') { $('name-modal').classList.add('on'); }
    else $('name-modal').classList.remove('on');
    const targetView = document.body.classList.contains('auth-required') ? 'login' : (st.view || 'home');
    paintView(targetView, true);
    if (st.pane) setPane(st.pane, { fromPop: true });
    if (history.state?.crApp && history.state.view !== targetView) history.replaceState({ ...history.state, view: targetView }, '', location.href);
  } else {
    // Keep the app's home state as a safe fallback if the browser returns to an entry
    // created before the app's internal navigation history.
    if (S.view !== 'home' || $('name-modal').classList.contains('on')) {
      $('name-modal').classList.remove('on'); paintView(document.body.classList.contains('auth-required') ? 'login' : 'home');
      history.replaceState({ crApp: true, view: S.view, pane: S.pane, modal: null }, '', location.href);
    }
  }
});
const empty = (h, p) => `<div class="empty"><b>${h}</b>${p}</div>`;
function renderAll() { renderHome(); renderMegaHub(); renderChallenge(); renderActivity(); renderProfile(); renderAdmin(); renderArchive(); renderProfileBadges(); setPane(S.pane); }

function renderHome() {
  $('home-h').textContent = S.name ? `Hello, ${S.name}` : 'Hello';
  updatePB();
  let live = 0, dTot = 0, dDone = 0;
  S.mine.forEach(m => { const x = S.meta[m.code]; if (x && !x.gone && status(x) === 'live') { live++; if (x.challengeType !== 'mega') { const c = counts(m.code); if (c) { dTot += c.dt; dDone += c.dd; } } } });
  const n = megaList().length;
  const megaBtn = n === 0 ? ['＋', 'Create a mega challenge'] : n === 1 ? ['Enter ›', 'Enter mega challenge'] : [`${n} megas ›`, 'Choose a mega challenge'];
  const dl = nextDeadline();
  const str = streak7Days(), ts = todayScore();
  $('home-stats').innerHTML = `
    <div class="stat"><b>🔥 ${str}</b><span>Day streak</span></div>
    <div class="stat"><b>+${ts}</b><span>Today's score</span></div>
    <div class="stat"><b style="font-size:clamp(16px,5vw,24px)">${dl ? dl.days + 'd' : '-'}</b><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${dl ? esc(dl.title.slice(0,16)) : 'Next deadline'}</span></div>
    <button class="stat megabtn" data-act="open-mega"><b>${megaBtn[0]}</b><span>${megaBtn[1]}</span></button>`;
  const el = $('home-list');
  if (!S.mine.length) { $('home-today').innerHTML = ''; if($('home-rivalry')) $('home-rivalry').innerHTML=''; el.innerHTML = empty('No challenges yet', 'Create one or join with a code.'); $('mine-list').innerHTML = el.innerHTML; renderMegaPicksCreate(); return; }
  renderRivalry(); renderMissedBanner(); renderHomeBanners(); renderHomeAnnouncements();
  renderHomeCalendar(); renderOneTimeDue();
  $('home-today').innerHTML = todayHtml();
  el.innerHTML = listHtml(false);
  $('mine-list').innerHTML = listHtml(true); renderMegaPicksCreate(); renderWeekChart();
}

function renderChallenge() {
  const head = $('ch-head'), c = S.chal;
  $('seg').hidden = !c;
  if (!c) {
    head.innerHTML = empty('No challenge open', 'Pick one from Home, or create a new one.') + `<div class="btns"><button class="btn" data-act="view" data-v="home">Go to Home</button></div>`;
    ['quests', 'progress', 'board'].forEach(p => $('pane-' + p).innerHTML = '');
    $('journal-hist').innerHTML = ''; return;
  }
  const st = status(c);
  const msg = { live: `Ends ${fmt(c.endDate)}`, upcoming: `Starts ${fmt(c.startDate)}`, ended: `Ended ${fmt(c.endDate)}`, paused: 'Paused by the host' }[st];
  const sw = S.mine.length > 1 ? `<select class="grow" id="switcher" aria-label="Switch challenge" style="margin-top:12px">${S.mine.map(m => `<option value="${esc(m.code)}" ${m.code === S.active ? 'selected' : ''}>${esc(m.title)}</option>`).join('')}</select>` : '';
  head.innerHTML = `<h1>${esc(c.title)}</h1>
    <div class="row" style="margin-top:8px;flex-wrap:wrap"><span class="badge ${st}">${st}</span><span class="sub" style="margin:0">${esc(msg)}, ${S.members.length} ${S.members.length === 1 ? 'player' : 'players'}</span></div>
    ${c.desc ? `<p class="sub">${esc(c.desc)}</p>` : ''}${sw}`;
  renderQuests(); renderProgress(); renderBoard(); renderJournal(); renderAdmin(); renderTabDailyStrip(); if(S.chal?.challengeType==='mega')checkMegaWinner(S.active);
}

/* Group tasks into Subject > Chapter > Topic > tasks, with done/total counts at each level. */
function buildTree(list, isDone, order) {
  const subs = new Map();
  list.forEach(g => {
    const su = nclean(g.subject), ch = nclean(g.chapter), to = nclean(g.topic), d = isDone(g) ? 1 : 0, sk = nkey(su), ck = nkey(ch), tk = nkey(to);
    const S1 = subs.get(sk) || subs.set(sk, { name: su, done: 0, total: 0, map: new Map() }).get(sk);
    const C1 = S1.map.get(ck) || S1.map.set(ck, { name: ch, done: 0, total: 0, map: new Map() }).get(ck);
    const T1 = C1.map.get(tk) || C1.map.set(tk, { name: to, tasks: [] }).get(tk);
    T1.tasks.push(g); S1.total++; C1.total++; S1.done += d; C1.done += d;
  });
  // follow the challenge's syllabus order when it has one (unknown names go last, in the order they appear)
  const rankOf = keys => { const m = new Map(keys.map((k, i) => [k, i])); return k => m.has(k) ? m.get(k) : 1e9; };
  const sRank = rankOf((order || []).map(s => nkey(s.name)));
  return [...subs.entries()].sort((a, b) => sRank(a[0]) - sRank(b[0])).map(([sk, su]) => {
    const cRank = rankOf(((order || []).find(s => nkey(s.name) === sk)?.chapters || []).map(c => nkey(c.name)));
    return { name: su.name, done: su.done, total: su.total, chapters: [...su.map.entries()].sort((a, b) => cRank(a[0]) - cRank(b[0])).map(([, ch]) => ({ name: ch.name, done: ch.done, total: ch.total, topics: [...ch.map.values()] })) };
  });
}
const treeOpen = () => (S.treeOpen ||= ls.get('cr_tree', {}));
function renderQuests() {
  const c = S.chal, st = status(c), t = today(), done = S.me?.done || {};
  const isDone = g => g.daily ? !!done[`${g.id}@${t}`] : !!done[g.id];
  const row = g => `<button class="li quest ${isDone(g) ? 'on' : ''}" data-act="toggle" data-id="${esc(g.id)}" ${st !== 'live' ? 'disabled' : ''}>
    <span class="box"></span><span class="t">${esc(g.text)}</span><span class="p">+${g.points}</span></button>`;
  const targets = c.targets || [], daily = targets.filter(g => g.daily), once = targets.filter(g => !g.daily);
  const dn = daily.filter(isDone).length, pct = daily.length ? Math.round(dn / daily.length * 100) : 0;
  const owner = c.ownerUid === S.uid;
  const tree = (list, heading, kind) => {
    const subs = buildTree(list, isDone, c.syllabus), multi = subs.length > 1, open = treeOpen();
    const chapterBody = ch => ch.topics.map(tp => `${ch.topics.length > 1 || tp.name !== 'General' ? `<div class="topic-head">${esc(tp.name)}</div>` : ''}<div class="group">${tp.tasks.map(row).join('')}</div>`).join('');
    const fold = (key, title, n, inner) => { const o = !!open[key]; return `<div class="folder tree-fold ${o ? 'open' : ''}"><button class="li folder-head" data-act="toggle-tree" data-key="${esc(key)}" aria-expanded="${o}"><div class="grow"><b>${esc(title)}</b></div><span class="pill">${n.done}/${n.total}</span>${CHEV}</button>${o ? `<div class="folder-body">${inner}</div>` : ''}</div>`; };
    if (!multi) return subs.map(su => `<div class="tree-sub">${esc(heading)} · ${esc(su.name)}</div>${su.chapters.map(ch => `<div class="tree-branch"><b>${esc(ch.name)}</b>${chapterBody(ch)}</div>`).join('')}`).join('');
    return `<div class="tree-sub">${esc(heading)}</div>` + subs.map(su => fold(`${c.id}|${kind}|${su.name}`, su.name, su, su.chapters.map(ch => fold(`${c.id}|${kind}|${su.name}|${ch.name}`, ch.name, ch, chapterBody(ch))).join(''))).join('');
  };
  const children = c.childChallenges || [];
  $('pane-quests').innerHTML = `
    ${daily.length ? tree(daily, 'Daily tasks', 'd') + `<div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div><div class="sub" style="font-size:13px;margin-top:6px">${dn} of ${daily.length} daily tasks done today</div>` : ''}
    ${once.length ? tree(once, 'One-time tasks', 'o') : ''}
    ${children.length ? megaSummary(children) + `<div class="lbl">Mega challenge branches</div><div class="group">${children.map(ch => `<button class="li" data-act="mega-branch" data-code="${esc(ch.code)}"><div class="grow"><b>${esc(ch.title)}</b><div class="meta">${branchMeta(ch.code)}</div></div><span>›</span></button>`).join('')}</div>` : ''}
    <div class="lbl">Invite friends</div>
    <div class="group"><div class="li"><div class="grow"><b>Code ${esc(c.id)}</b><div class="meta">Friends enter this code or open your link.</div></div>
      <button class="btn sm" data-act="share" data-code="${esc(c.id)}">Share</button></div></div>
    ${owner ? `<div class="btns"><button class="btn sec" data-act="edit-challenge">Edit challenge</button></div>` : ''}
    <div class="btns"><button class="btn bad" data-act="leave">Leave</button></div>`;
}

function series() {
  const c = S.chal, last = [today(), c.endDate].sort()[0];
  if (last < c.startDate) return null;
  const days = []; for (let d = new Date(c.startDate + 'T00:00'); ymd(d) <= last; d.setDate(d.getDate() + 1)) days.push(ymd(d));
  const use = days.slice(-30);
  const lines = S.members.map(m => {
    const per = {}; Object.entries(m.done || {}).forEach(([k, d]) => { const p = ptsOf(c, k); if (p) per[d] = (per[d] || 0) + p; });
    let cum = Object.entries(per).filter(([d]) => d < use[0]).reduce((a, [, v]) => a + v, 0);
    return { id: m.id, name: m.name || 'Player', vals: use.map(d => cum += per[d] || 0) };
  });
  return { days: use, lines };
}
function chartSvg(sr) {
  const W = 340, H = 190, pl = 30, pr = 62, pt = 10, pb = 24, n = sr.days.length;
  let lines = [...sr.lines].sort((a, b) => b.vals[n - 1] - a.vals[n - 1]);
  const meL = lines.find(l => l.id === S.uid); lines = lines.slice(0, 5); if (meL && !lines.includes(meL)) lines[4] = meL;
  const max = Math.max(10, ...lines.flatMap(l => l.vals));
  const x = i => pl + (n === 1 ? 0 : i * (W - pl - pr) / (n - 1)), y = v => pt + (H - pt - pb) * (1 - v / max);
  const greys = ['#9AA7C2', '#74829F', '#566480', '#46536D'];
  let g = '', k = 0;
  for (let i = 0; i <= 4; i++) { const v = max * i / 4, yy = y(v); g += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="#25324F" stroke-width="1"/><text x="${pl - 6}" y="${yy + 4}" text-anchor="end" font-size="10" fill="#8D9AB5">${Math.round(v)}</text>`; }
  const ordered = [...lines.filter(l => l.id !== S.uid), ...lines.filter(l => l.id === S.uid)];
  const ends = ordered.map(l => ({ l, y: y(l.vals[n - 1]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 11) ends[i].y = ends[i - 1].y + 11;
  let paths = '', labels = '';
  ordered.forEach(l => {
    const me = l.id === S.uid, col = me ? '#5B8DEF' : greys[k++ % greys.length];
    const d = l.vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    paths += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${me ? 2.6 : 1.6}" stroke-linejoin="round" stroke-linecap="round"/>`;
    const e = ends.find(z => z.l === l);
    labels += `<text x="${W - pr + 6}" y="${e.y + 4}" font-size="11" font-weight="${me ? 800 : 600}" fill="${me ? '#5B8DEF' : '#8D9AB5'}">${esc((me ? 'You' : l.name).slice(0, 8))}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative points by day">${g}${paths}${labels}
    <text x="${pl}" y="${H - 6}" font-size="10" fill="#8D9AB5">${fmt(sr.days[0])}</text><text x="${W - pr}" y="${H - 6}" text-anchor="end" font-size="10" fill="#8D9AB5">${fmt(sr.days[n - 1])}</text></svg>`;
}
function renderProgress() {
  const c = S.chal, el = $('pane-progress'), done = S.me?.done || {}, list = sorted(), idx = list.findIndex(m => m.id === S.uid);
  const t = today(), d = c.targets.filter(g => g.daily), dn = d.filter(g => done[`${g.id}@${t}`]).length;
  const sr = series();
  const cells = []; for (let i = 13; i >= 0; i--) { const day = dayOff(-i), n = Object.values(done).filter(v => v === day).length, a = Math.min(1, n / Math.max(1, d.length));
    cells.push(`<i style="${n ? `background:rgba(91,141,239,${(.25 + .75 * a).toFixed(2)})` : ''}" title="${fmt(day)}: ${n}"></i>`); }
  el.innerHTML = `<div class="stats">
      <div class="stat"><b>${S.me?.points || 0}</b><span>Your points</span></div>
      <div class="stat"><b>${idx < 0 ? '-' : '#' + (idx + 1)}</b><span>Rank of ${list.length}</span></div>
      <div class="stat"><b>${streak(done)}</b><span>Day streak</span></div>
      <div class="stat"><b>${d.length ? dn + '/' + d.length : '-'}</b><span>Daily quests today</span></div></div>
    <div class="lbl">Points over time</div>
    ${sr ? `<div class="chart">${chartSvg(sr)}</div>` : '<div class="group">' + empty('Not started yet', 'The chart appears once the challenge begins.') + '</div>'}
    <div class="lbl">Your last 14 days</div>
    <div class="heat" aria-label="Quests cleared per day">${cells.join('')}</div>
    <div class="heat-l"><span>${fmt(dayOff(-13))}</span><span>Today</span></div>
    ${renderMonthCalendar(done, d)}
    <p class="sub" style="margin-top:8px">Tap a day to see how many tasks you completed. Daily task history is based on saved completion dates.</p>`;
}
function renderMonthCalendar(done, dailyTasks) {
  const year = S.calendarYear, month = S.calendarMonth;
  const first = new Date(year, month, 1), offset = first.getDay(), days = new Date(year, month + 1, 0).getDate();
  const counts = {};
  Object.entries(done || {}).forEach(([key, date]) => { if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) counts[date] = (counts[date] || 0) + 1; });
  const cells = Array.from({length: offset}, () => '<div class="month-day empty"></div>');
  for (let n = 1; n <= days; n++) {
    const date = `${year}-${String(month + 1).padStart(2,'0')}-${String(n).padStart(2,'0')}`, count = counts[date] || 0;
    cells.push(`<button class="month-day ${count ? 'active' : ''} ${date === today() ? 'today' : ''}" data-act="calendar-day" data-date="${date}" aria-label="${fmtLong(date)}: ${count} completed tasks">${n}<span class="day-count">${count ? count + ' ✓' : '·'}</span></button>`);
  }
  return `<div class="month-head"><button class="btn sec sm" data-act="calendar-prev" aria-label="Previous month">‹</button><div class="month-title">${first.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</div><button class="btn sec sm" data-act="calendar-next" aria-label="Next month">›</button></div><div class="month-grid">${['S','M','T','W','T','F','S'].map(x=>`<div class="month-week">${x}</div>`).join('')}${cells.join('')}</div><div id="calendar-day-detail" class="sub" style="margin-top:10px">Select a date to view completion details.</div>`;
}
function showCalendarDay(date) {
  const done = S.me?.done || {}, c = S.chal; if (!c) return;
  const completed = c.targets.filter(t => t.daily ? done[`${t.id}@${date}`] : done[t.id] === date || (done[t.id] && done[t.id] <= date));
  const detail = $('calendar-day-detail'); if (!detail) return;
  detail.innerHTML = `<b>${esc(fmtLong(date))}</b> · ${completed.length} completed ${completed.length === 1 ? 'task' : 'tasks'}${completed.length ? `<div class="group" style="margin-top:8px">${completed.map(t=>`<div class="li"><span class="grow">${esc(t.text)}</span><span class="p">+${t.points}</span></div>`).join('')}</div>` : '<div>No task completions recorded for this date.</div>'}`;
}

function renderBoard() {
  const list = sorted(), top = Math.max(1, list[0]?.points || 0);
  $('pane-board').innerHTML = `<div class="lbl">Standings</div>` + (list.length ? `<div class="group">` + list.map((m, i) => `<div class="li ${i === 0 ? 'lead' : ''}">
    <div class="rk">${i + 1}</div>${m.photo ? `<div class="avatar ${m.id === S.uid ? 'me' : ''}" style="padding:0"><img src="${esc(m.photo)}" alt="" onerror="this.remove()"></div>` : `<div class="avatar ${m.id === S.uid ? 'me' : ''}">${esc(ini(m.name))}</div>`}
    <div class="grow"><b>${esc(m.name || 'Player')}${m.id === S.uid ? ' (you)' : ''}</b>${m.about ? `<div class="meta">${esc(m.about)}</div>` : ''}<div class="mini"><i style="width:${Math.round((m.points || 0) / top * 100)}%"></i></div></div>
    <div class="pts">${m.points || 0}</div>${m.id !== S.uid ? `<button class="req-logo-btn" data-act="request-progress" data-uid="${esc(m.id)}" data-name="${esc(m.name||'Friend')}" title="Request to view progress" aria-label="Request progress for ${esc(m.name||'friend')}"><svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="ntg" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#5B8DEF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#ntg)"/><path d="M18 18h28v6H35v22h-7V24H18z" fill="#081326"/><path d="m42 31 6 6-6 6" fill="none" stroke="#081326" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="req-state ${reqState(m.id)}" title="${reqStateLabel(m.id)}"></span></button>` : ''}</div>`).join('') + '</div>' : empty('No players yet', 'Share the code to get friends in.'));
}
function renderJournal() {
  const hist = $('journal-hist'), ta = $('j-text'), notes = S.me?.notes || {}, done = S.me?.done || {};
  if (document.activeElement !== ta) ta.value = notes[today()] || '';
  const counts = {}; Object.values(done).forEach(d => counts[d] = (counts[d] || 0) + 1);
  const days = [...new Set([...Object.keys(counts), ...Object.keys(notes)])].sort().reverse();
  hist.innerHTML = days.length ? days.map(d => `<div class="li" style="align-items:flex-start"><div class="grow"><b>${fmt(d)}</b> <span class="meta">${counts[d] || 0} ${(counts[d] || 0) === 1 ? 'quest' : 'quests'} cleared</span>${notes[d] ? `<div style="margin-top:4px;white-space:pre-wrap">${esc(notes[d])}</div>` : ''}</div></div>`).join('')
    : empty('No entries yet', 'Clear a quest or write a note to start.');
}

const DAILY_KEY = 'cr_daily_reports_v1';
const DAILY_SUBJECTS = ['Physics','Chemistry','Mathematics'];
const DAILY_TYPES = ['Questions','Revision','Notes Making'];
let dailySelectedDate = today();
let dailyCalendarMonth = new Date().getMonth();
let dailyCalendarYear = new Date().getFullYear();
let dailyDraft = null;
function dailyAll(){ return ls.get(DAILY_KEY, {}); }
function dailyBlank(date=today()) { return {date, sessions:[], targets:{Physics:{questions:'',hours:''},Chemistry:{questions:'',hours:''},Mathematics:{questions:'',hours:''}}, pending:''}; }
function dailyLoad(date){ const all=dailyAll(); return JSON.parse(JSON.stringify(all[date] || dailyBlank(date))); }
function dailyPersistDraft(){ if(!dailyDraft)return; ls.set('cr_daily_draft_'+dailyDraft.date,dailyDraft); }
function dailyDuration(s){ if(!s.start||!s.end)return 0; const a=s.start.split(':').map(Number),b=s.end.split(':').map(Number); let mins=b[0]*60+b[1]-(a[0]*60+a[1]); if(mins<0)mins+=1440; return mins; }
function dailyFmtMins(m){return `${Math.floor(m/60)}h ${m%60}m`;}
function dailyDisplayTime(t){if(!t)return '';const [hh,mm]=t.split(':').map(Number);return `${hh%12||12}:${String(mm).padStart(2,'0')} ${hh>=12?'PM':'AM'}`;}
function dailyDateLabel(d){return new Date(d+'T12:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
function dailyAttr(s,k){return esc(s?.[k]??'');}
function dailyRenderSession(s,i){const type=s.type||'Questions';return `<div class="daily-session" data-daily-session="${esc(s.id)}"><div class="daily-session-top"><strong>${esc(s.subject)} · Session ${i+1}</strong><button type="button" class="btn sec daily-type" data-act="daily-cycle-type" data-id="${esc(s.id)}">${esc(type)} ↻</button><button type="button" class="btn sec" data-act="daily-remove-session" data-id="${esc(s.id)}">Remove</button></div><div class="daily-grid"><div class="daily-field"><label>Start time</label><div class="daily-time-row"><input type="time" data-daily-field="start" value="${dailyAttr(s,'start')}" aria-label="Start time"><button type="button" class="btn sec daily-period" data-act="daily-toggle-period" data-id="${esc(s.id)}" data-time-field="start">${s.start?((+s.start.split(':')[0])>=12?'PM':'AM'):(s.startPeriod||'AM')}</button></div></div><div class="daily-field"><label>End time</label><div class="daily-time-row"><input type="time" data-daily-field="end" value="${dailyAttr(s,'end')}" aria-label="End time"><button type="button" class="btn sec daily-period" data-act="daily-toggle-period" data-id="${esc(s.id)}" data-time-field="end">${s.end?((+s.end.split(':')[0])>=12?'PM':'AM'):(s.endPeriod||'AM')}</button></div></div><div class="daily-field" style="grid-column:1/-1"><label>Topic / notes</label><textarea data-daily-field="topic" placeholder="Chapter, topic or what you worked on">${dailyAttr(s,'topic')}</textarea></div>${type==='Questions'?`<div class="daily-field"><label>Questions solved</label><input type="number" min="0" step="1" data-daily-field="questions" value="${dailyAttr(s,'questions')}" placeholder="Optional"></div><div class="daily-field"><label>Correct answers</label><input type="number" min="0" step="1" data-daily-field="correct" value="${dailyAttr(s,'correct')}" placeholder="Optional"></div><div class="daily-field"><label>Attempted questions</label><input type="number" min="0" step="1" data-daily-field="attempted" value="${dailyAttr(s,'attempted')}" placeholder="Optional"></div>`:''}<div class="daily-field"><label>Test score (optional)</label><input type="number" step="any" data-daily-field="testScore" value="${dailyAttr(s,'testScore')}" placeholder="Score"></div><div class="daily-field"><label>Maximum marks</label><input type="number" min="0" step="any" data-daily-field="testMax" value="${dailyAttr(s,'testMax')}" placeholder="Out of"></div></div><div class="daily-progress">${dailyDuration(s)?'Duration: '+dailyFmtMins(dailyDuration(s)):'Add start and end times to calculate duration.'}${s.attempted>0&&s.correct!==''&&s.correct!=null&&Number(s.correct)<=Number(s.attempted)?' · Accuracy: '+Math.round(Number(s.correct)/Number(s.attempted)*100)+'%':''}</div></div>`;}
function dailyRenderCalendar(){const first=new Date(dailyCalendarYear,dailyCalendarMonth,1),n=new Date(dailyCalendarYear,dailyCalendarMonth+1,0).getDate(),offset=(first.getDay()+6)%7,all=dailyAll();let html=`<div class="month-head"><button class="btn sec sm" data-act="daily-cal-prev">‹</button><div class="month-title">${first.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</div><button class="btn sec sm" data-act="daily-cal-next">›</button></div><div class="month-grid">${['M','T','W','T','F','S','S'].map(x=>`<div class="month-week">${x}</div>`).join('')}`;for(let i=0;i<offset;i++)html+='<div class="daily-cal-day blank"></div>';for(let d=1;d<=n;d++){const key=`${dailyCalendarYear}-${String(dailyCalendarMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;html+=`<button class="daily-cal-day ${all[key]?'saved':''} ${key===dailySelectedDate?'selected':''}" data-act="daily-select-date" data-date="${key}" title="${all[key]?'Saved report':'No saved report'}">${d}${all[key]?'<span style="display:block;font-size:9px">●</span>':''}</button>`;}return html+'</div>';}
function dailyRenderUI(){const root=$('daily-report-app');if(!root)return;if(!dailyDraft||dailyDraft.date!==dailySelectedDate){dailyDraft=dailyLoad(dailySelectedDate);const unsaved=ls.get('cr_daily_draft_'+dailySelectedDate,null);if(unsaved&&unsaved.date===dailySelectedDate)dailyDraft=unsaved;}
const isSaved=!!dailyAll()[dailySelectedDate];let sessions='';for(const sub of DAILY_SUBJECTS){const arr=dailyDraft.sessions.filter(s=>s.subject===sub);sessions+=`<div class="daily-subject"><h3>${sub}</h3>${arr.length?arr.map(s=>dailyRenderSession(s,dailyDraft.sessions.indexOf(s))).join(''):'<p class="sub" style="margin:0 0 10px">No sessions yet.</p>'}<button class="btn sec" data-act="daily-add-session" data-subject="${sub}">+ Add ${sub} session</button><div class="daily-grid" style="margin-top:10px"><div class="daily-field"><label>Question target (optional)</label><input type="number" min="0" step="1" data-daily-target="questions" data-subject="${sub}" value="${esc(dailyDraft.targets?.[sub]?.questions??'')}" placeholder="Questions"></div><div class="daily-field"><label>Study-hour target (optional)</label><input type="number" min="0" step="0.25" data-daily-target="hours" data-subject="${sub}" value="${esc(dailyDraft.targets?.[sub]?.hours??'')}" placeholder="Hours"></div></div></div>`;}
const totals={mins:0,questions:0};for(const s of dailyDraft.sessions){totals.mins+=dailyDuration(s);if((s.type||'Questions')==='Questions'&&s.questions!==''&&Number.isFinite(+s.questions))totals.questions+=Math.max(0,+s.questions);}
root.innerHTML=`<div class="daily-wrap"><div class="daily-head"><h2>Daily Study Report</h2><span class="meta">${isSaved?'Saved report':'Draft'}</span></div><p class="daily-sub">${dailyDateLabel(dailySelectedDate)} · Stored on this device only</p><button class="btn sec" data-act="daily-today" style="margin-bottom:8px">Update Your Daily Report</button>${sessions}<div class="daily-field"><label>Pending work / notes (optional)</label><textarea data-daily-field="pending" placeholder="What remains for tomorrow?">${dailyAttr(dailyDraft,'pending')}</textarea></div><div class="daily-progress"><b>Live summary:</b> ${dailyFmtMins(totals.mins)} timed study · ${totals.questions} questions solved (Questions sessions only). Targets are optional and do not count revision or notes-making toward question totals.</div><div class="daily-actions"><button class="btn" data-act="daily-save">Save / Update Report</button><button class="btn sec" data-act="daily-copy">Copy Today's Report</button><button class="btn sec wide" data-act="daily-new-session">+ Add session</button></div><div class="daily-calendar"><b>Saved report calendar</b><p class="daily-sub">Tap a date to open its report. Green outline means a report is saved.</p>${dailyRenderCalendar()}<div class="daily-history-note">${Object.keys(dailyAll()).length} saved ${Object.keys(dailyAll()).length===1?'report':'reports'} on this device.</div></div></div>`;}
function dailyAddSession(subject){dailyDraft.sessions.push({id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),subject:subject||'Physics',type:'Questions',start:'',end:'',topic:'',questions:'',correct:'',attempted:'',testScore:'',testMax:''});dailyPersistDraft();dailyRenderUI();}
function dailySave(){if(!dailyDraft)return;const all=dailyAll();all[dailyDraft.date]=JSON.parse(JSON.stringify(dailyDraft));ls.set(DAILY_KEY,all);ls.set('cr_daily_draft_'+dailyDraft.date,dailyDraft);dailyRenderUI();toast('Daily report saved on this device.');}
function dailyCopy(){if(!dailyDraft)return;const lines=[`*DAILY STUDY REPORT*`,`*Date:* ${dailyDateLabel(dailyDraft.date)}`];let totalMins=0,totalQ=0;for(const sub of DAILY_SUBJECTS){const ss=dailyDraft.sessions.filter(s=>s.subject===sub);const target=dailyDraft.targets?.[sub]||{};if(!ss.length&&(target.questions===''||target.questions==null)&&(target.hours===''||target.hours==null))continue;lines.push('',`*${sub.toUpperCase()}*`);let sm=0,sq=0;for(const s of ss){const type=s.type||'Questions',dur=dailyDuration(s);sm+=dur;totalMins+=dur;lines.push(`• *${type}:* ${s.topic?.trim()||'Study session'}`);if(s.start&&s.end)lines.push(`  Time: ${dailyDisplayTime(s.start)}–${dailyDisplayTime(s.end)} (${dailyFmtMins(dur)})`);if(type==='Questions'&&s.questions!==''&&s.questions!=null){sq+=Math.max(0,Number(s.questions)||0);lines.push(`  Questions solved: ${s.questions}`);}if(type==='Questions'&&s.attempted!==''&&s.attempted!=null&&Number(s.attempted)>0&&s.correct!==''&&s.correct!=null&&Number(s.correct)<=Number(s.attempted)){lines.push(`  Accuracy: ${s.correct}/${s.attempted} (${Math.round(Number(s.correct)/Number(s.attempted)*100)}%)`);}if(s.testScore!==''&&s.testScore!=null&&s.testMax!==''&&s.testMax!=null)lines.push(`  Test score: ${s.testScore}/${s.testMax}`);else if(s.testScore!==''&&s.testScore!=null)lines.push(`  Test score: ${s.testScore}`);}totalQ+=sq;if(target.questions!==''&&target.questions!=null)lines.push(`• Question target: ${sq}/${target.questions} (${+target.questions?Math.round(sq/+target.questions*100):0}%)`);if(target.hours!==''&&target.hours!=null)lines.push(`• Study-hour target: ${(sm/60).toFixed(2)}/${target.hours} h (${+target.hours?Math.round(sm/60/+target.hours*100):0}%)`);}
lines.push('','*DAILY SUMMARY*',`• Total timed study: ${dailyFmtMins(totalMins)}`,`• Total questions solved: ${totalQ}`);if(dailyDraft.pending?.trim())lines.push(`• Pending work: ${dailyDraft.pending.trim()}`);const txt=lines.join('\n');if(navigator.clipboard?.writeText){navigator.clipboard.writeText(txt).then(()=>toast('WhatsApp report copied.')).catch(()=>dailyFallbackCopy(txt));}else dailyFallbackCopy(txt);}
function dailyFallbackCopy(txt){const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('WhatsApp report copied.');}catch{toast('Copy failed. Please try again.');}ta.remove();}
function dailyInputUpdate(el){if(!dailyDraft)return;const card=el.closest('[data-daily-session]');if(card){const s=dailyDraft.sessions.find(x=>x.id===card.dataset.dailySession);if(s){const field=el.dataset.dailyField;const previous=s[field];s[field]=el.value;if((field==='start'||field==='end')&&el.value){const periodKey=field+'Period';let h=+el.value.split(':')[0];if(!previous&&s[periodKey]){h=h%12+(s[periodKey]==='PM'?12:0);s[field]=String(h).padStart(2,'0')+':'+el.value.split(':')[1];}s[periodKey]=(+s[field].split(':')[0])>=12?'PM':'AM';}}}else if(el.dataset.dailyTarget){dailyDraft.targets=dailyDraft.targets||{};dailyDraft.targets[el.dataset.subject]=dailyDraft.targets[el.dataset.subject]||{questions:'',hours:''};dailyDraft.targets[el.dataset.subject][el.dataset.dailyTarget]=el.value;}else if(el.dataset.dailyField==='pending')dailyDraft.pending=el.value;dailyPersistDraft();}
function dailySelectDate(date){dailyPersistDraft();dailySelectedDate=date;dailyDraft=null;dailyCalendarMonth=Number(date.slice(5,7))-1;dailyCalendarYear=Number(date.slice(0,4));dailyRenderUI();}

function renderActivity() {
  dailyRenderUI();
  const c = S.chal, el = $('act-body');
  if (!c) { $('act-sub').textContent = ''; el.innerHTML = empty('No challenge open', 'Open a challenge to see what your friends are doing.'); return; }
  $('act-sub').textContent = c.title;
  const items = [];
  S.members.forEach(m => {
    const by = {}; Object.entries(m.done || {}).forEach(([k, d]) => { const p = ptsOf(c, k); if (!p) return; by[d] = by[d] || { n: 0, xp: 0 }; by[d].n++; by[d].xp += p; });
    const who = m.id === S.uid ? 'You' : (m.name || 'Player');
    Object.entries(by).forEach(([d, v]) => items.push({ d, who, m, text: `cleared ${v.n} ${v.n === 1 ? 'quest' : 'quests'}`, xp: v.xp }));
    let j = m.joinedAt; j = j && j.toDate ? j.toDate() : j instanceof Date ? j : null;
    if (j) items.push({ d: ymd(j), who, m, text: 'joined the challenge', xp: null });
  });
  items.sort((a, b) => b.d.localeCompare(a.d) || (b.xp || 0) - (a.xp || 0));
  if (!items.length) { el.innerHTML = empty('Nothing yet', 'Clear a quest and it shows up here for everyone.'); return; }
  let out = '', cur = '';
  items.slice(0, 40).forEach(it => {
    if (it.d !== cur) { if (cur) out += '</div>'; cur = it.d; out += `<div class="feed-d">${esc(fmtLong(it.d))}</div><div class="group">`; }
    out += `<div class="li"><div class="avatar ${it.m.id === S.uid ? 'me' : ''}">${esc(ini(it.m.name))}</div>
      <div class="grow"><b>${esc(it.who)}</b> ${esc(it.text)}</div>${it.xp ? `<span class="pts">+${it.xp}</span>` : ''}</div>`;
  });
  el.innerHTML = out + '</div>';
}

function renderProfile() {
  const av = $('p-av'); av.innerHTML = S.photo ? `<img src="${esc(S.photo)}" alt="Profile picture" onerror="this.remove();this.parentElement.textContent='${esc(ini(S.name))}'">` : esc(ini(S.name));
  $('p-name-h').textContent = S.name || 'Profile';
  const currentUser = auth?.currentUser;
  $('p-id').textContent = currentUser?.email ? currentUser.email : (S.uid ? 'Guest account · ' + String(S.uid).slice(0, 6) : 'Signing in');
  const accountStatus = $('account-status');
  if (accountStatus && currentUser) accountStatus.textContent = currentUser.isAnonymous ? 'Guest session — link Google to preserve it.' : 'Google account connected: ' + (currentUser.email || currentUser.displayName || 'signed in');
  if (document.activeElement !== $('p-name')) $('p-name').value = S.name;
  if (document.activeElement !== $('p-about')) $('p-about').value = S.about || '';
  const hosted = Object.values(S.meta).filter(x => x && x.owner === S.uid).length;
  const row = (a, b) => `<div class="li"><div class="grow">${a}</div><b>${b}</b></div>`;
  $('p-stats').innerHTML = row('Challenges joined', S.mine.length) + row('Challenges you host', hosted) + row('Points in current challenge', S.me?.points || 0) + row('Current streak', streak(S.me?.done || {}));
  if (!S._accessLoading) { S._accessLoading = true; loadProgressAccess().finally(()=>{ S._accessLoading=false; }); }
}
async function loadMarket() {
  const el = $('market-list'); if (!el) return;
  if (DEMO) { el.innerHTML = empty('Market preview', 'Public challenge discovery appears here on the live site.'); return; }
  el.innerHTML = empty('Loading market…', 'Looking for public challenges.');
  try {
    const snap = await getDocs(query(collection(db, 'challenges'), where('discoverable', '==', true)));
    const items = snap.docs.map(d => ({ code:d.id, ...d.data() })).filter(c => c.live && c.ownerUid !== S.uid && !S.mine.some(m => m.code === c.code));
    if (!items.length) { el.innerHTML = empty('No public challenges yet', 'Create a challenge and make it discoverable so other students can find it.'); return; }
    el.innerHTML = items.map(c => `<div class="market-card"><b>${esc(c.title || 'Untitled challenge')}</b><p>${esc(c.desc || 'No description added.')}</p><div class="meta">${esc(c.challengeType === 'mega' ? 'Mega challenge' : 'Study challenge')} · ${(c.targets||[]).length} tasks · By ${esc(c.ownerName || 'Student')}</div><button class="btn" style="margin-top:10px" data-act="market-join" data-code="${esc(c.code)}">Join challenge</button></div>`).join('');
  } catch { el.innerHTML = empty('Market unavailable', 'Firestore rules must allow signed-in users to read discoverable challenges. You can still join using a challenge code.'); }
}
function renderMegaPicksCreate() {
  const el = $('mega-picks-create'); if (!el) return;
  const candidates = S.mine.filter(m => (S.meta[m.code]?.challengeType || 'standard') !== 'mega' && !S.meta[m.code]?.gone && !claimed(m.code, ''));
  if (!candidates.length) { el.innerHTML = '<div class="li"><div class="grow"><b>No smaller challenges available</b><div class="meta">Create or join standard challenges first, then return here to combine them.</div></div></div>'; return; }
  el.innerHTML = candidates.map(m => `<label class="checkline"><input type="checkbox" data-mega-create-code="${esc(m.code)}" data-mega-create-title="${esc(m.title)}"><span><b>${esc(m.title)}</b><div class="meta">Code ${esc(m.code)}${S.meta[m.code]?.n != null ? ` · ${S.meta[m.code].n} tasks` : ''}</div></span></label>`).join('');
}

function renderDraft() {
  const el = $('draft-list'); el.hidden = !S.draft.length;
  el.innerHTML = S.draft.map((g, i) => `<div class="draft"><div class="grow"><b>${esc(g.text)}</b><div class="meta sub" style="margin:0;font-size:13px">${esc(g.subject||'General')} → ${esc(g.chapter||'General')} → ${esc(g.topic||'General')} · ${g.daily ? 'Daily' : 'One-time'} · 10 pts</div></div>
    <button class="x" data-act="rm-draft" data-i="${i}" aria-label="Remove task">Remove</button></div>`).join('');
}

