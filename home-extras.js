'use strict';
/* Challenge Room: home-extras (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ═══════════════════════════════════════════════════
   HOME ADDITIONS
   ═══════════════════════════════════════════════════ */
function allTimePoints() { return S.mine.reduce((a, m) => a + (S.done[m.code] ? Object.keys(S.done[m.code]).reduce((s, k) => { const x = S.meta[m.code]; return s + (x?.targets?.find(t => t.id === k.split('@')[0])?.points || 0); }, 0) : 0), 0); }
function streak7Days() {
  // streak across ALL challenges (any task done = green day)
  const allDone = new Set();
  S.mine.forEach(m => { const d = S.done[m.code] || {}; Object.values(d).forEach(v => { if (v) allDone.add(v); }); });
  let n = 0;
  for (let i = 1; ; i++) { const d = dayOff(-i); if (allDone.has(d)) n++; else break; if (n > 365) break; }
  return n;
}
function todayScore() {
  const t = today(); let pts = 0;
  S.mine.forEach(m => { const x = S.meta[m.code]; if (!x || x.gone) return; const d = S.done[m.code] || {}; Object.entries(d).forEach(([k, v]) => { if (v === t) pts += (x.targets?.find(g => g.id === k.split('@')[0])?.points || 0); }); });
  return pts;
}
function nextDeadline() {
  const t = today(); let best = null;
  S.mine.forEach(m => { const x = S.meta[m.code]; if (!x || x.gone || status(x) !== 'live') return; if (!best || x.endDate < best.endDate) best = { title: m.title, endDate: x.endDate, code: m.code }; });
  if (!best) return null;
  const days = Math.max(0, Math.round((new Date(best.endDate) - new Date(t)) / 86400000));
  return { ...best, days };
}
function whoAhead() {
  // find person just above me in the most active challenge
  let result = null;
  S.mine.forEach(m => {
    const x = S.meta[m.code]; if (!x || x.gone || status(x) !== 'live' || x.challengeType === 'mega') return;
    if (m.code !== S.active) return; // only current
    const list = [...S.members].sort((a, b) => (b.points || 0) - (a.points || 0));
    const myIdx = list.findIndex(p => p.id === S.uid);
    if (myIdx <= 0) return;
    const above = list[myIdx - 1];
    const diff = (above.points || 0) - (list[myIdx]?.points || 0);
    result = { name: above.name || 'Player', diff, challenge: m.title };
  });
  return result;
}
function personalBest() { return ls.get('cr_pb', 0); }
function updatePB() { const t = todayScore(), pb = personalBest(); if (t > pb) { ls.set('cr_pb', t); } }
function missedYesterday() {
  const y = dayOff(-1);
  const key = 'cr_missed_dismissed_' + y;
  if (ls.get(key, false)) return false;
  let hasTasks = false, done = false;
  S.mine.forEach(m => { const x = S.meta[m.code]; if (!x || x.gone || x.challengeType === 'mega') return; const d = (x.targets || []).filter(g => g.daily); if (!d.length) return; hasTasks = true; const md = S.done[m.code] || {}; if (d.some(g => md[`${g.id}@${y}`])) done = true; });
  return hasTasks && !done;
}
function dismissMissed() { const y = dayOff(-1); ls.set('cr_missed_dismissed_' + y, true); renderHome(); }
function renderRivalry() {
  const el = $('home-rivalry'); if (!el) return;
  const ahead = whoAhead(), pb = personalBest(), ts = todayScore();
  let html = '';
  if (ahead) html += `<div class="rivalry"><div><b>${ahead.diff} pts behind ${esc(ahead.name)}</b><div class="meta" style="font-size:11px">${esc(ahead.challenge)}</div></div><div class="pb">PB ${pb}</div></div>`;
  el.innerHTML = html;
}
function renderMissedBanner() {
  const el = $('home-missed'); if (!el) return;
  if (!missedYesterday()) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="missed-banner"><div class="dot"></div><div><b>Missed yesterday</b><div>No daily tasks completed yesterday — keep the streak alive today.</div></div><button class="btn sec sm" style="margin-left:auto;flex:none" data-act="dismiss-missed">✕</button></div>`;
}
function creatorAnnouncements() {
  const out = [];
  S.mine.forEach(m => {
    const x = S.meta[m.code]; if (!x || x.gone) return;
    const ann = x.announcement; if (!ann) return;
    const key = 'ann_' + m.code + '_' + (x.announcementAt || '');
    if (S.dismissed[key]) return;
    out.push({ code: m.code, title: m.title, text: ann, key });
  });
  return out;
}
function renderHomeAnnouncements() {
  // already handled in renderHomeBanners for request banners
  // add announcement cards before it
  const el = $('home-banners'); if (!el) return;
  const anns = creatorAnnouncements();
  const annHtml = anns.map(a => `<div class="ann-strip"><b>📣 ${esc(a.title)}</b>${esc(a.text)}<button class="btn sec sm" style="margin-left:8px" data-act="dismiss-ann" data-key="${esc(a.key)}">✕</button></div>`).join('');
  // prepend to existing banners
  el.innerHTML = annHtml + (el.innerHTML || '');
}
function homeDotColor(date) {
  const t = today();
  if (date > t) return 'dot-gray';
  let hasTasks = false, totalD = 0, doneD = 0;
  S.mine.forEach(m => {
    const x = S.meta[m.code]; if (!x || x.gone || x.challengeType === 'mega') return;
    if (x.startDate > date || x.endDate < date) return;
    const d = (x.targets || []).filter(g => g.daily); if (!d.length) return;
    hasTasks = true; totalD += d.length;
    const md = S.done[m.code] || {};
    doneD += d.filter(g => md[`${g.id}@${date}`]).length;
  });
  if (!hasTasks) return 'dot-gray';
  if (doneD === 0) return date < t ? 'dot-red' : 'dot-gray';
  if (doneD >= totalD) return 'dot-green';
  return 'dot-amber';
}
function renderHomeCalendar() {
  const el = $('home-cal-wrap'); if (!el) return;
  const year = S.homeCalYear, month = S.homeCalMonth;
  const first = new Date(year, month, 1), offset = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const t = today();
  const dayNames = ['S','M','T','W','T','F','S'];
  let cells = dayNames.map(d => `<div class="hc-dlbl">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += '<div></div>';
  for (let n = 1; n <= days; n++) {
    const date = `${year}-${String(month+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
    const dot = homeDotColor(date);
    const numCls = date === t ? ' today' : '';
    cells += `<div class="hc-cell"><div class="hc-num${numCls}">${n}</div><div class="hc-dot ${dot}"></div></div>`;
  }
  const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  el.innerHTML = `<div class="lbl">Calendar</div><div class="home-cal">
    <div class="hc-hd">${title}<span>Tap month to navigate</span></div>
    <div class="hc-days">${cells}</div>
    <div class="hc-legend">
      <span><i style="background:#34D399"></i>All done</span>
      <span><i style="background:#F59E0B"></i>Partial</span>
      <span><i style="background:#F87171"></i>Missed</span>
      <span><i style="background:var(--acc)"></i>Today</span>
    </div>
    <div class="row" style="gap:6px;margin-top:8px">
      <button class="btn sec sm" data-act="home-cal-prev">‹</button>
      <button class="btn sec sm" data-act="home-cal-next">›</button>
    </div>
  </div>`;
}
function renderOneTimeDue() {
  const el = $('home-onetimes'); if (!el) return;
  const t = today(); const items = [];
  S.mine.forEach(m => {
    const x = S.meta[m.code]; if (!x || x.gone || status(x) !== 'live' || x.challengeType === 'mega') return;
    const d = S.done[m.code] || {};
    (x.targets || []).filter(g => !g.daily && !d[g.id]).forEach(g => items.push({ code: m.code, title: m.title, g, endDate: x.endDate }));
  });
  if (!items.length) { el.innerHTML = ''; return; }
  items.sort((a, b) => a.endDate.localeCompare(b.endDate));
  const shown = items.slice(0, 5);
  el.innerHTML = `<div class="lbl">One-time tasks due soon</div><div class="group">${shown.map(it => `<button class="li quest" data-act="toggle-in" data-code="${esc(it.code)}" data-id="${esc(it.g.id)}"><span class="box"></span><span class="t">${esc(it.g.text)} <span class="meta">· ${esc(it.title)}</span></span><span class="p">+${it.g.points}</span></button>`).join('')}</div>`;
}
function renderWeekChart() {
  const el = $('home-week'); if (!el) return;
  const days = Array.from({length:7}, (_, i) => dayOff(i - 6));
  const labels = ['M','T','W','T','F','S','S'].slice(0,7);
  const vals = days.map(date => {
    let pts = 0;
    S.mine.forEach(m => { const x = S.meta[m.code]; if (!x || x.gone) return; const d = S.done[m.code] || {}; Object.entries(d).forEach(([k, v]) => { if (v === date) pts += x.targets?.find(g => g.id === k.split('@')[0])?.points || 0; }); });
    return pts;
  });
  const max = Math.max(1, ...vals);
  const bars = vals.map((v, i) => `<div class="wbar-col"><div class="wbar-inner${days[i] === today() ? ' acc' : ''}" style="height:${Math.round(v/max*44)+4}px"></div><div class="wday">${labels[i]}</div></div>`).join('');
  const atp = allTimePoints();
  const ended = S.mine.filter(m => { const x = S.meta[m.code]; return x && !x.gone && status(x) === 'ended'; }).length;
  el.innerHTML = `<div class="lbl">This week</div><div class="week-card"><div class="wbars">${bars}</div><div class="week-totals"><div><div class="big">${atp} pts</div><div class="meta">All-time total</div></div><div style="text-align:right"><div class="big">${ended}</div><div class="meta">Challenges done</div></div></div></div>`;
}
function renderTabDailyStrip() {
  const el = $('tab-daily-strip'); if (!el) return;
  const c = S.chal; if (!c || c.challengeType === 'mega') { el.hidden = true; return; }
  const t = today(), done = S.me?.done || {}, daily = (c.targets || []).filter(g => g.daily);
  if (!daily.length) { el.hidden = true; return; }
  const dn = daily.filter(g => done[`${g.id}@${t}`]).length;
  el.hidden = false;
  el.innerHTML = `<div class="lbl">Today — ${dn}/${daily.length} daily tasks</div><div class="group">${daily.map(g => { const on = !!done[`${g.id}@${t}`]; return `<button class="li quest ${on?'on':''}" data-act="toggle" data-id="${esc(g.id)}"><span class="box"></span><span class="t">${esc(g.text)}</span><span class="p">+${g.points}</span></button>`; }).join('')}</div>`;
}

