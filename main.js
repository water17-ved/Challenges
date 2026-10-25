'use strict';
/* Challenge Room: main (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'view') setView(b.dataset.v);
  else if (a === 'pane') setPane(b.dataset.p);
  else if (a === 'daily-today') dailySelectDate(today());
  else if (a === 'daily-add-session') dailyAddSession(b.dataset.subject);
  else if (a === 'daily-new-session') dailyAddSession('Physics');
  else if (a === 'daily-remove-session') { dailyDraft.sessions=dailyDraft.sessions.filter(s=>s.id!==b.dataset.id); dailyPersistDraft(); dailyRenderUI(); }
  else if (a === 'daily-cycle-type') { const s=dailyDraft.sessions.find(x=>x.id===b.dataset.id); if(s){const types=['Questions','Revision','Notes Making'];s.type=types[(types.indexOf(s.type||'Questions')+1)%types.length];dailyPersistDraft();dailyRenderUI();} }
  else if (a === 'daily-toggle-period') { const s=dailyDraft.sessions.find(x=>x.id===b.dataset.id); const field=b.dataset.timeField; if(s&&['start','end'].includes(field)){const periodKey=field+'Period';const val=s[field];let period=val?((+val.split(':')[0])>=12?'PM':'AM'):(s[periodKey]||'AM');const next=period==='AM'?'PM':'AM';s[periodKey]=next;if(val){const parts=val.split(':');let h=+parts[0];h=h%12+(next==='PM'?12:0);s[field]=String(h).padStart(2,'0')+':'+parts[1];}dailyPersistDraft();dailyRenderUI();} }
  else if (a === 'daily-save') dailySave();
  else if (a === 'daily-copy') dailyCopy();
  else if (a === 'daily-cal-prev' || a === 'daily-cal-next') { dailyCalendarMonth += a==='daily-cal-prev'?-1:1; if(dailyCalendarMonth<0){dailyCalendarMonth=11;dailyCalendarYear--;} if(dailyCalendarMonth>11){dailyCalendarMonth=0;dailyCalendarYear++;} dailyRenderUI(); }
  else if (a === 'daily-select-date') dailySelectDate(b.dataset.date);
  else if (a === 'open') openChallenge(b.dataset.code);
  else if (a === 'toggle') toggle(b.dataset.id);
  else if (a === 'toggle-in') toggleIn(b.dataset.code, b.dataset.id);
  else if (a === 'open-notifs') openNotifSheet();
  else if (a === 'open-badges') openBadgeSheet();
  else if (a === 'close-badges') closeBadgeSheet();
  else if (a === 'close-notifs') closeNotifSheet();
  else if (a === 'nb-accept') nbAccept(b.dataset.id);
  else if (a === 'nb-decline') decideProgressRequest(b.dataset.id, false);
  else if (a === 'toggle-folder') toggleFolder(b.dataset.code);
  else if (a === 'open-mega') openMegaEntry();
  else if (a === 'dismiss-missed') dismissMissed();
  else if (a === 'open-bulk-adder') openBulkAdder();
  else if (a === 'close-bulk-adder') closeBulkAdder();
  else if (a === 'bulk-add-row') bulkAddRow();
  else if (a === 'bulk-save-topic') bulkSaveTopic();
  else if (a === 'bulk-clear-topic') bulkClearTopic();
  else if (a === 'suggest-edit') suggestEdit(b.dataset.code, b.dataset.title);
  else if (a === 'join-market') { S.pendingCode = b.dataset.code; setView('join'); $('join-code') && ($('join-code').value = b.dataset.code); }
  else if (a === 'dismiss-ann') { const k=b.dataset.key; S.dismissed[k]=true; ls.set('cr_dismissed',S.dismissed); renderHome(); }
  else if (a === 'home-cal-prev') { S.homeCalMonth--; if(S.homeCalMonth<0){S.homeCalMonth=11;S.homeCalYear--;} renderHomeCalendar(); }
  else if (a === 'home-cal-next') { S.homeCalMonth++; if(S.homeCalMonth>11){S.homeCalMonth=0;S.homeCalYear++;} renderHomeCalendar(); }
  else if (a === 'qjoin') qjoin();
  else if (a === 'post-announcement') postAnnouncement();
  else if (a === 'clear-announcement') clearAnnouncement();
  else if (a === 'admin-set-end') adminSetEndDate();
  else if (a === 'close-challenge-now') closeChallengeNow();
  else if (a === 'kick-member') kickMember(b.dataset.uid, b.dataset.name);
  else if (a === 'admin-transfer') adminTransfer();
  else if (a === 'archive-challenge') archiveChallenge();
  else if (a === 'delete-cancel') closeDeleteModal();
  else if (a === 'delete-confirm') startDelete();
  else if (a === 'undo-delete') undoDelete();
  else if (a === 'toggle-tree') { const o = treeOpen(); o[b.dataset.key] = !o[b.dataset.key]; ls.set('cr_tree', o); renderQuests(); }
  else if (a === 'export-csv') exportCSV();
  else if (a === 'clone-challenge') cloneChallenge();
  else if (a === 'toggle-live') toggleLive();
  else if (a === 'delete') removeChallenge();
  else if (a === 'calendar-prev' || a === 'calendar-next') { S.calendarMonth += a === 'calendar-prev' ? -1 : 1; if (S.calendarMonth < 0) { S.calendarMonth = 11; S.calendarYear--; } if (S.calendarMonth > 11) { S.calendarMonth = 0; S.calendarYear++; } renderProgress(); }
  else if (a === 'calendar-day') showCalendarDay(b.dataset.date);
  else if (a === 'join') join($('join-code').value);
  else if (a === 'add-target') addTarget();
  else if (a === 'rm-draft') { S.draft.splice(+b.dataset.i, 1); renderDraft(); }
  else if (a === 'create') createChallenge();
  else if (a === 'create-mega') createMegaChallenge();
  else if (a === 'edit-challenge') beginEditChallenge();
  else if (a === 'edit-add-task') addEditTask();
  else if (a === 'edit-remove-task') { S.editTargets.splice(+b.dataset.i, 1); renderEditTasks(); renderEditStructure(); }
  else if (a === 'struct-move') moveNode(b.dataset.kind, b.dataset.id, +b.dataset.dir);
  else if (a === 'save-edit') saveEditChallenge();
  else if (a === 'market-refresh') loadMarket();
  else if (a === 'market-join') join(b.dataset.code);
  else if (a === 'mega-branch') S.mine.some(m => m.code === b.dataset.code) ? openChallenge(b.dataset.code) : join(b.dataset.code);
  else if (a === 'share') share(b.dataset.code);
  else if (a === 'save-note') saveNote();
  else if (a === 'request-progress') requestProgressAccess(b.dataset.uid,b.dataset.name,S.active);
  else if (a === 'progress-accept') decideProgressRequest(b.dataset.id,true);
  else if (a === 'progress-decline') decideProgressRequest(b.dataset.id,false);
  else if (a === 'view-shared-progress') viewSharedProgress(b.dataset.id);
  else if (a === 'refresh-progress-access') loadProgressAccess();
  else if (a === 'toggle-live') toggleLive();
  else if (a === 'delete') removeChallenge();
  else if (a === 'leave') leave();
  else if (a === 'save-name') saveName();
  else if (a === 'profile-save') saveProfile();
  else if (a === 'pick-photo') $('p-photo-file').click();
  else if (a === 'profile-about-save') saveAbout();
  else if (a === 'download-data') downloadData();
  else if (a === 'logout') logout();
  else if (a === 'google-login') googleLogin();
  else if (a === 'guest-login') guestLogin();
  else if (a === 'copy-ai-start') copy(AI_START_PROMPT, 'Starting prompt copied');
  else if (a === 'copy-ai-final') copy(AI_FINAL_PROMPT, 'Final JSON prompt copied');
  else if (a === 'preview-ai') previewAIOutput();
  else if (a === 'create-ai-challenge') createChallengeFromAI();
  else if (a === 'export-backup') exportMemoryBackup();
  else if (a === 'import-backup') importMemoryBackup();
  else if (a === 'install-app') installApp();
  else if (a === 'google-existing-login') googleExistingLogin();
  else if (a === 'clear-data') { if (confirm('Clear your name and saved challenges on this device?')) { ['cr_name', 'cr_mine', 'cr_active'].forEach(ls.del); location.reload(); } }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-daily-field], [data-daily-target]')) { dailyInputUpdate(e.target); if(e.target.dataset.dailyField==='start'||e.target.dataset.dailyField==='end'||e.target.dataset.dailyField==='correct'||e.target.dataset.dailyField==='attempted') dailyRenderUI(); }
  if (e.target.id === 'switcher') watch(e.target.value);
  if (e.target.dataset.struct) renameNode(e.target.dataset.struct, e.target.dataset.id, e.target.value);
  const wrap = e.target.closest('.edit-task');
  if (wrap && e.target.dataset.editField) { const i = +wrap.dataset.editIndex, field = e.target.dataset.editField; if (S.editTargets[i]) S.editTargets[i][field] = field === 'daily' ? e.target.value === 'daily' : e.target.value; }
});
document.addEventListener('input', e => { if(e.target.matches('[data-daily-field], [data-daily-target]')) dailyInputUpdate(e.target); const wrap = e.target.closest('.edit-task'); if (wrap && e.target.dataset.editField) { const i = +wrap.dataset.editIndex, field = e.target.dataset.editField; if (S.editTargets[i]) S.editTargets[i][field] = e.target.value; } });
$('t-text')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addTarget(); } });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-subj]');
  if (b && b.closest('#disc-filters')) { e.preventDefault(); setDiscFilter(b.dataset.subj); }
});
$('disc-search')?.addEventListener('input', e => { S.discSearch = e.target.value; loadMarket(); });
$('join-code').addEventListener('keydown', e => { if (e.key === 'Enter') join($('join-code').value); });
$('name-input').addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); });
$('p-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveProfile(); });
$('p-photo-file').addEventListener('change', e => { choosePhoto(e.target.files?.[0]); e.target.value = ''; });
$('backup-file').addEventListener('change', () => { parsedAIPlan = null; });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstallPrompt = e; const el = $('install-status'); if (el) el.textContent = 'Ready to install. Tap Install.'; });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; const el = $('install-status'); if (el) el.textContent = 'Installed on this device.'; toast('Challenge Room installed.'); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js', {scope:'./'}).then(reg => { if (reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'}); }).catch(err => { console.warn('Service worker registration failed:', err); const el = $('install-status'); if (el) el.textContent = 'Install unavailable: service worker registration failed. Refresh the site and try again.'; }));
history.replaceState({ crApp: true, view: S.view, pane: S.pane, modal: null }, '', location.href);
document.body.classList.add('auth-pending');
start();
