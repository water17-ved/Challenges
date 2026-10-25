'use strict';
/* Challenge Room: syllabus (classic script; shares one global scope with the other js/ files, loaded in order by index.html)
   Subject → Chapter → Task tree with stable ids.
   Tasks stay in challenge.targets (a flat list, so progress keys and older cached app versions keep working) and carry
   subjectId / chapterId plus the subject and chapter names. challenge.syllabus holds the ordered subjects and chapters
   with their ids, so a rename or a reorder changes one node instead of every task. */
const nid = p => p + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6);
const nclean = v => String(v == null ? '' : v).trim().replace(/\s+/g, ' ') || 'General';
const nkey = v => nclean(v).toLowerCase();

/* Give every task its subjectId/chapterId (matched by name, case-insensitive), reusing nodes and ids from the
   previous syllabus, keeping the previous order, and dropping empty nodes. Returns { targets, syllabus }. */
function stampPlan(targets, prev) {
  const old = Array.isArray(prev) ? prev : [];
  const oldSub = new Map(old.map(s => [nkey(s.name), s]));
  const subs = new Map();
  const stamped = (targets || []).map(t => {
    const sk = nkey(t.subject), ck = nkey(t.chapter);
    let sub = subs.get(sk);
    if (!sub) {
      const o = oldSub.get(sk);
      sub = { id: o?.id || nid('s'), name: o ? o.name : nclean(t.subject), chapters: new Map(), old: o };
      subs.set(sk, sub);
    }
    let ch = sub.chapters.get(ck);
    if (!ch) {
      const oc = (sub.old?.chapters || []).find(c => nkey(c.name) === ck);
      ch = { id: oc?.id || nid('c'), name: oc ? oc.name : nclean(t.chapter) };
      sub.chapters.set(ck, ch);
    }
    return { ...t, subject: sub.name, chapter: ch.name, subjectId: sub.id, chapterId: ch.id };
  });
  const rank = (arr, id) => { const i = arr.findIndex(x => x.id === id); return i < 0 ? 1e9 : i; };
  const syllabus = [...subs.values()]
    .sort((a, b) => rank(old, a.id) - rank(old, b.id))
    .map(s => ({ id: s.id, name: s.name, chapters: [...s.chapters.values()].sort((a, b) => rank(s.old?.chapters || [], a.id) - rank(s.old?.chapters || [], b.id)) }));
  return { targets: stamped, syllabus };
}

/* ---- edit screen: structure (rename / reorder subjects and chapters) ---- */
function syncEdit() { const r = stampPlan(S.editTargets, S.editSyllabus); S.editTargets = r.targets; S.editSyllabus = r.syllabus; }
function renameNode(kind, id, raw) {
  syncEdit();
  const name = nclean(raw);
  if (kind === 'subject') {
    const s = S.editSyllabus.find(x => x.id === id); if (!s || s.name === name) return renderEditStructure();
    if (S.editSyllabus.some(x => x.id !== id && nkey(x.name) === nkey(name))) { toast('A subject with that name already exists.'); return renderEditStructure(); }
    s.name = name; S.editTargets.forEach(t => { if (t.subjectId === id) t.subject = name; });
  } else {
    const s = S.editSyllabus.find(x => x.chapters.some(c => c.id === id)), c = s?.chapters.find(x => x.id === id); if (!c || c.name === name) return renderEditStructure();
    if (s.chapters.some(x => x.id !== id && nkey(x.name) === nkey(name))) { toast('That subject already has a chapter with that name.'); return renderEditStructure(); }
    c.name = name; S.editTargets.forEach(t => { if (t.chapterId === id) t.chapter = name; });
  }
  renderEditStructure(); renderEditTasks();
}
function moveNode(kind, id, dir) {
  syncEdit();
  const list = kind === 'subject' ? S.editSyllabus : S.editSyllabus.find(s => s.chapters.some(c => c.id === id))?.chapters; if (!list) return;
  const i = list.findIndex(x => x.id === id), j = i + dir; if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]]; renderEditStructure();
}
function renderEditStructure() {
  const wrap = $('edit-structure-wrap'), el = $('edit-structure'); if (!el) return;
  syncEdit();
  const mega = S.chal?.challengeType === 'mega';
  if (wrap) wrap.hidden = mega || !S.editSyllabus.length;
  const mv = (kind, id, dir, label, off) => `<button type="button" class="btn sec sm" data-act="struct-move" data-kind="${kind}" data-id="${esc(id)}" data-dir="${dir}" aria-label="${label}" ${off ? 'disabled' : ''}>${dir < 0 ? '↑' : '↓'}</button>`;
  const line = (kind, n, i, len) => `<div class="row" style="align-items:flex-end;margin-top:8px"><div class="grow"><label>${kind === 'subject' ? 'Subject' : 'Chapter'}</label><input maxlength="80" data-struct="${kind}" data-id="${esc(n.id)}" value="${esc(n.name)}"></div>${mv(kind, n.id, -1, 'Move up', i === 0)}${mv(kind, n.id, 1, 'Move down', i === len - 1)}</div>`;
  el.innerHTML = S.editSyllabus.map((s, i) => `<div class="market-card">${line('subject', s, i, S.editSyllabus.length)}<div style="margin-left:14px;border-left:2px solid var(--line);padding-left:10px">${s.chapters.map((c, j) => line('chapter', c, j, s.chapters.length)).join('')}</div></div>`).join('');
}
