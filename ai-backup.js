'use strict';
/* Challenge Room: ai-backup (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ---------- AI Plan + local memory backups ---------- */
const AI_START_PROMPT = `You are my Challenge Room planning assistant. Help me design a practical challenge by asking one clear question at a time. Establish the goal, timeframe, daily available time, the subjects/fields, the chapters inside each subject, task difficulty, and which tasks should be Daily versus One-time. Structure the plan as Subject → Chapter → Task. Use a Topic only when a chapter has several distinct parts; otherwise skip it. If there is more than one subject, the app shows them as collapsible folders (subject, then chapter, then tasks), so keep subject and chapter names short and consistent, and give each chapter a handful of focused tasks. Do not output the final JSON yet. Summarize the agreed plan grouped by subject and chapter, and wait until I send my final conversion prompt.`;
const AI_FINAL_PROMPT = `Convert the challenge plan from this conversation into a valid JSON object ONLY (no Markdown fences or commentary), ready to import into Challenge Room. Use this schema: {"title":"Challenge title","description":"Short description","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","tasks":[{"subject":"Physics","chapter":"Optics","topic":"Lenses","text":"Task text","frequency":"daily","points":10}]}. Rules: the title must be 60 characters or fewer and the description 140 characters or fewer. Every task needs a subject and a chapter. Use the exact same spelling and capitalisation each time the same subject or chapter appears, because tasks are grouped into collapsible Subject → Chapter folders by name. Use "topic" only when it adds something; otherwise use "General". frequency must be exactly "daily" or "once" ("once" means a one-time task). points is a whole number (10 by default, higher for harder tasks). List the tasks grouped by subject, then by chapter. Include every agreed task, do not invent tasks, use today's date for startDate only if no date was agreed, and make endDate on or after startDate. Keep each task text concise. Return a single JSON object only.`;
function parseAIPlan(raw) {
  const text = String(raw || '').trim(); if (!text) throw new Error('Paste the AI response first.');
  let obj;
  const cleaned = text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  try { obj = JSON.parse(cleaned); } catch {
    const first = cleaned.indexOf('{'), last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) { try { obj = JSON.parse(cleaned.slice(first,last+1)); } catch {} }
  }
  if (obj && typeof obj === 'object') {
    const title = String(obj.title || obj.name || 'AI planned challenge').trim();
    const description = String(obj.description || obj.desc || '').trim();
    const tasksRaw = Array.isArray(obj.tasks) ? obj.tasks : Array.isArray(obj.targets) ? obj.targets : [];
    const tasks = tasksRaw.map((t,i) => ({ id:'ai'+Date.now().toString(36)+i, text:String(t.text || t.task || t.title || '').trim(), subject:String(t.subject || t.field || 'General').trim(), chapter:String(t.chapter || t.branch || 'General').trim(), topic:String(t.topic || t.subtopic || 'General').trim(), daily: String(t.frequency || (t.daily ? 'daily' : 'once')).toLowerCase() === 'daily' || t.daily === true, points:Number(t.points)||10 })).filter(t=>t.text);
    // Merge subject/chapter names that differ only by case or spacing, so they land in the same folder.
    const sm = new Map(), cm = new Map(), canon = (m, k, v) => { k = k.toLowerCase(); if (!m.has(k)) m.set(k, v); return m.get(k); };
    tasks.forEach(t => { t.subject = canon(sm, t.subject.replace(/\s+/g, ' '), t.subject.replace(/\s+/g, ' ')); t.chapter = t.chapter.replace(/\s+/g, ' '); t.chapter = canon(cm, t.subject + '|' + t.chapter, t.chapter); });
    if (!tasks.length) throw new Error('JSON found, but no tasks were recognized. Include a tasks array with text fields.');
    const startDate = /^\d{4}-\d{2}-\d{2}$/.test(obj.startDate || obj.start_date || '') ? (obj.startDate || obj.start_date) : today();
    const endDate = /^\d{4}-\d{2}-\d{2}$/.test(obj.endDate || obj.end_date || '') ? (obj.endDate || obj.end_date) : dayOff(13);
    if (endDate < startDate) throw new Error('The end date is earlier than the start date.');
    return {title, desc:description, startDate, endDate, targets:tasks};
  }
  // Friendly fallback for structured text: one task per non-empty line, optionally Task | Subject | Chapter | Topic | daily/once.
  const lines = cleaned.split(/\r?\n/).map(x=>x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').trim()).filter(Boolean);
  const tasks = [];
  for (const line of lines) {
    if (/^(title|description|start date|end date|tasks?)\s*:/i.test(line)) continue;
    const parts = line.split(/\s*\|\s*/);
    if (parts.length >= 2) tasks.push({id:'ai'+Date.now().toString(36)+tasks.length,text:parts[0],subject:parts[1]||'General',chapter:parts[2]||'General',topic:parts[3]||'General',daily:/^daily$/i.test(parts[4]||''),points:10});
  }
  if (!tasks.length) throw new Error('Could not parse this output. Use the final prompt to ask the AI for JSON, or format each task as Task | Subject | Chapter | Topic | daily/once.');
  const titleMatch = cleaned.match(/^title\s*:\s*(.+)$/im);
  return {title:titleMatch?.[1]?.trim()||'AI planned challenge',desc:'Imported from structured AI text',startDate:today(),endDate:dayOff(13),targets:tasks};
}
function previewAIOutput() {
  try {
    parsedAIPlan = parseAIPlan($('ai-output').value);
    $('ai-preview').hidden = false;
    $('ai-preview').innerHTML = `<b>${esc(parsedAIPlan.title)}</b><p class="sub">${esc(parsedAIPlan.desc || 'No description')}</p><div class="meta">${esc(parsedAIPlan.startDate)} → ${esc(parsedAIPlan.endDate)} · ${parsedAIPlan.targets.length} tasks · ${parsedAIPlan.targets.filter(t=>t.daily).length} daily · ${parsedAIPlan.targets.filter(t=>!t.daily).length} one-time</div><div class="tree-branch">${parsedAIPlan.targets.map(t=>`<div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>${esc(t.text)}</b><div class="meta">${esc(t.subject)} → ${esc(t.chapter)} → ${esc(t.topic)} · ${t.daily?'Daily':'One-time'}</div></div>`).join('')}</div>`;
    $('ai-create-btn').disabled = false; toast('AI output parsed. Review before creating.');
  } catch (e) { parsedAIPlan = null; $('ai-preview').hidden = false; $('ai-preview').innerHTML = `<b>Could not parse output</b><p class="sub">${esc(e.message)}</p>`; $('ai-create-btn').disabled = true; }
}
async function createChallengeFromAI() {
  if (!parsedAIPlan) return toast('Preview valid AI output first.');
  if (DEMO) return toast('AI challenge creation needs an authenticated or guest Firebase session.');
  const plan = parsedAIPlan; if (!S.uid) return toast('Sign in or continue as guest first.');
  try {
    let code;
    for (let i=0;i<6;i++) { code=genCode(); if (!(await getDoc(doc(db,'challenges',code))).exists()) break; }
    await setDoc(doc(db,'challenges',code), {title:plan.title.slice(0,60),desc:plan.desc.slice(0,140),startDate:plan.startDate,endDate:plan.endDate,...stampPlan(plan.targets.map((t,i)=>({...t,id:'t'+Date.now().toString(36)+i}))),childChallenges:[],challengeType:'standard',discoverable:true,live:true,ownerUid:S.uid,ownerName:S.name||'Guest',createdAt:serverTimestamp()});
    await ensureMember(code); addMine(code,plan.title); await loadMeta(); watch(code); parsedAIPlan=null; $('ai-create-btn').disabled=true; $('ai-output').value=''; $('ai-preview').hidden=true; toast('Challenge created from AI plan.'); openChallenge(code);
  } catch { toast('Could not create the challenge. Check Firebase permissions and connection.'); }
}
function downloadJSON(payload, filename) {
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=filename; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function exportMemoryBackup() {
  const backup={format:'challenge-room-memory',version:1,exportedAt:new Date().toISOString(),originalUid:S.uid,profile:{name:S.name,about:S.about,photo:S.photo},local:{mine:S.mine,active:S.active},challenges:[]};
  if (!DEMO && db && S.uid) {
    for (const m of S.mine) {
      try {
        const snap=await getDoc(doc(db,'challenges',m.code)); if (!snap.exists()) continue;
        const challenge={code:m.code,...snap.data()};
        try { const ms=await getDoc(doc(db,'challenges',m.code,'members',S.uid)); if(ms.exists()) challenge.myMembership=ms.data(); } catch {}
        backup.challenges.push(challenge);
      } catch {}
    }
  }
  backup.localStorage={};
  for (const k of ['cr_name','cr_mine','cr_active','cr_photo','cr_about']) { try { const v=localStorage.getItem(k); if(v!==null) backup.localStorage[k]=JSON.parse(v); } catch {} }
  downloadJSON(backup,'challenge-room-memory-backup.json'); toast('Memory backup exported.');
}
async function importMemoryBackup() {
  const file=$('backup-file').files?.[0]; if(!file) return toast('Choose a JSON backup file first.');
  let data; try { data=JSON.parse(await file.text()); } catch { return toast('That file is not valid JSON.'); }
  if (!data || typeof data!=='object') return toast('Unsupported backup file.');
  if (Array.isArray(data.tasks) || Array.isArray(data.targets)) { $('ai-output').value=JSON.stringify(data,null,2); setView('ai'); previewAIOutput(); return toast('AI plan loaded for preview.'); }
  if (!data.profile && !data.localStorage && !Array.isArray(data.challenges)) return toast('This JSON is not a recognized Challenge Room backup.');
  const profile=data.profile||{};
  if(profile.name){S.name=String(profile.name).slice(0,20);ls.set('cr_name',S.name)}
  if(typeof profile.about==='string'){S.about=profile.about;ls.set('cr_about',S.about)}
  if(typeof profile.photo==='string' && profile.photo.length<500000){S.photo=profile.photo;ls.set('cr_photo',S.photo)}
  if(data.localStorage && typeof data.localStorage==='object') for(const [k,v] of Object.entries(data.localStorage)) if(['cr_name','cr_photo','cr_about'].includes(k)) ls.set(k,v);
  const docs=Array.isArray(data.challenges)?data.challenges:[];
  if(!DEMO && db && S.uid) {
    const owned=docs.filter(c=>c.ownerUid===S.uid || c.ownerUid===data.originalUid || c.ownerUid===data.uid || c.ownerUid===data.user?.uid);
    const remap={};
    for(const c of owned) { let code; for(let i=0;i<6;i++){code=genCode();if(!(await getDoc(doc(db,'challenges',code))).exists())break;} remap[c.code]=code; }
    for(const c of owned) {
      const code=remap[c.code], child=(c.childChallenges||[]).map(ch=>({...ch,code:remap[ch.code]||ch.code}));
      const clean={title:String(c.title||'Restored challenge').slice(0,60),desc:String(c.desc||'').slice(0,140),startDate:c.startDate||today(),endDate:c.endDate||dayOff(13),...stampPlan(Array.isArray(c.targets)?c.targets:[], c.syllabus),childChallenges:child,challengeType:c.challengeType||'standard',discoverable:c.discoverable!==false,live:c.live!==false,ownerUid:S.uid,ownerName:S.name||'Guest',createdAt:serverTimestamp()};
      await setDoc(doc(db,'challenges',code),clean); await ensureMember(code); if(c.myMembership && typeof c.myMembership==='object') { const mm=c.myMembership; try { await updateDoc(doc(db,'challenges',code,'members',S.uid), {done:mm.done||{},notes:mm.notes||{},points:Number(mm.points)||0,name:S.name||mm.name||'Guest',photo:S.photo||'',about:S.about||''}); } catch {} } addMine(code,clean.title);
    }
    for(const c of docs.filter(c=>!owned.includes(c))) { if(c.code) { try { if((await getDoc(doc(db,'challenges',c.code))).exists()) addMine(c.code,c.title||'Challenge'); } catch {} } }
    await loadMeta();
  } else if(docs.length) {
    return toast('Challenge definitions can be restored only after starting a Firebase guest or Google session. Your profile backup was loaded locally.');
  }
  renderAll(); toast(`Backup imported${docs.length?' · challenge restore attempted':''}.`);
}
async function installApp() {
  if (deferredInstallPrompt) {
    try { deferredInstallPrompt.prompt(); const choice=await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; if(choice?.outcome==='accepted') toast('Install started.'); else toast('Install dismissed. You can install later from the browser menu.'); }
    catch { toast('Install prompt unavailable. Use the browser menu → Install app / Add to Home screen.'); }
  } else {
    const standalone=window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if(standalone) return toast('Challenge Room is already installed.');
    const el=$('install-status');
    if(el) el.textContent='If Chrome has no Install option, open the HTTPS site directly in Chrome, refresh once, then use ⋮ → Install app or Add to Home screen.';
    toast('Use Chrome menu ⋮ → Install app / Add to Home screen.');
  }
}

