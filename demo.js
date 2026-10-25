'use strict';
/* Challenge Room: demo (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ---------- demo data ---------- */
const rnd = s => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };
const DT = [
  { id: 't1', text: 'Solve 30 Physics problems', daily: true, points: 10 },
  { id: 't2', text: 'Revise 1 Chemistry chapter', daily: true, points: 10 },
  { id: 't3', text: 'Maths PYQ set (25 Qs)', daily: true, points: 10 },
  { id: 't4', text: 'Full syllabus mock test', daily: false, points: 10 },
  { id: 't5', text: 'Finish Organic notes', daily: false, points: 10 }
];
function genDone(targets, start, end, p, seed) {
  const done = {}; let d = new Date(start + 'T00:00'), i = 0;
  while (ymd(d) <= end && ymd(d) <= today()) {
    targets.filter(t => t.daily).forEach((t, j) => { if (rnd(seed + i * 7 + j) < p) done[`${t.id}@${ymd(d)}`] = ymd(d); });
    d.setDate(d.getDate() + 1); i++;
  }
  if (rnd(seed) < .6) done.t5 = start;
  return done;
}
function mkDemo(code, title, desc, s, e, live, p0) {
  const chal = { id: code, title, desc, startDate: dayOff(s), endDate: dayOff(e), live, ownerUid: code === 'DEMO42' ? 'me' : 'x', targets: DT };
  const names = ['Aarav', 'Meera', 'Kabir', 'Isha'], ps = [.9, .75, .55, .4];
  const others = names.map((n, i) => { const done = genDone(DT, chal.startDate, chal.endDate, ps[i] * p0, 11 + i * 5 + code.length); return { id: 'u' + i, name: n, done, points: calcPoints(chal, done), joinedAt: new Date(Date.now() - (i + 1) * 86400000 * (s < 0 ? 1 : 0)) }; });
  const done = genDone(DT, chal.startDate, chal.endDate, .65 * p0, 3);
  if (s < 0 && e >= 0) done[`t1@${today()}`] = today();
  const me = { name: S.name || 'You', done, points: calcPoints(chal, done), notes: s < 0 ? { [dayOff(-1)]: 'Mock went okay. Need to fix silly mistakes in Maths.' } : {} };
  return { chal, me, others };
}
const DEMO_DB = {};
function loadDemo() {
  S.uid = 'me'; S.name = S.name || 'You';
  DEMO_DB.DEMO42 = mkDemo('DEMO42', 'JEE 30-day grind', 'Top points win snacks.', -9, 20, true, 1);
  DEMO_DB.DEMO77 = mkDemo('DEMO77', 'Physics PYQ sprint', 'Two weeks, one chapter a day.', 3, 17, true, 0);
  DEMO_DB.DEMO11 = mkDemo('DEMO11', 'September revision', 'Wrapped up last month.', -40, -12, true, 1);
  S.mine = Object.values(DEMO_DB).map(d => ({ code: d.chal.id, title: d.chal.title }));
  S.mine.forEach(m => { S.meta[m.code] = metaOf(DEMO_DB[m.code].chal); S.done[m.code] = DEMO_DB[m.code].me?.done || {}; });
  $('demo-note').hidden = false; $('demo-exit').hidden = location.protocol === 'file:';
  watchDemo('DEMO42');
}
function watchDemo(code) {
  const d = DEMO_DB[code]; S.active = code; S.chal = d.chal; S.me = d.me; demoSync();
}
function demoSync() {
  const d = DEMO_DB[S.active]; d.me = S.me; S.me.name = S.name; S.done[S.active] = S.me.done || {};
  S.members = [...d.others, { id: 'me', ...S.me }]; renderAll();
}
const demoMsg = () => toast('Demo mode. Open the hosted site to do this.');
const metaOf = c => ({ targets: (c.targets || []).map(g => ({ id: g.id, text: g.text, points: g.points || 0, daily: !!g.daily, subject: g.subject || '' })), announcement: c.announcement || '', announcementAt: c.announcementAt || '', archived: !!c.archived, allowSuggest: !!c.allowSuggest, title: c.title, startDate: c.startDate, endDate: c.endDate, live: c.live, n: (c.targets || []).length, owner: c.ownerUid, challengeType: c.challengeType || 'standard', childChallenges: c.childChallenges || [], desc: c.desc || '' });

