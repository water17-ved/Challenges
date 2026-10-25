'use strict';
/* Challenge Room: core (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
const firebaseConfig = {
  apiKey: "AIzaSyB5xdHV3mG140tTTZY264WkAPYpKwoXIQU",
  authDomain: "llenge.firebaseapp.com",
  projectId: "llenge",
  storageBucket: "llenge.firebasestorage.app",
  messagingSenderId: "642859354088",
  appId: "1:642859354088:web:05bbb2c25ec4c8a4d0465d"
};
let DEMO = new URLSearchParams(location.search).has('demo') || location.protocol === 'file:';
let auth, db, onAuthStateChanged, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, linkWithPopup, signInAnonymously, signOut, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, serverTimestamp, getDocs, query, where;
let deferredInstallPrompt = null;
let parsedAIPlan = null;

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
const ymd = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => ymd(new Date());
const dayOff = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const fmt = d => new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const fmtLong = d => d === today() ? 'Today' : d === dayOff(-1) ? 'Yesterday' : new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
const link = code => `${location.origin}${location.pathname}?c=${code}`;
const genCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const ini = n => (String(n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase();
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
async function copy(text, ok) { try { await navigator.clipboard.writeText(text); toast(ok); } catch { prompt('Copy this:', text); } }

/* ---------- state ---------- */
const S = {
  uid: null, name: ls.get('cr_name', ''), mine: ls.get('cr_mine', []), active: ls.get('cr_active', ''),
  chal: null, me: null, members: [], unsubs: [], notifUnsubs: [], done: {}, expanded: ls.get('cr_open', {}), notifs: { incoming: [], outgoing: [], shares: [] }, homeCalMonth: new Date().getMonth(), homeCalYear: new Date().getFullYear(), pinned: ls.get('cr_pinned',''), dismissed: ls.get('cr_dismissed',{}), discSubj: '', discSearch: '', bulkRows: 1, draft: [], editTargets: [], editCode: '', view: 'home', pane: 'quests', meta: {},
  pendingCode: new URLSearchParams(location.search).get('c'),
  photo: ls.get('cr_photo', ''), about: ls.get('cr_about', ''), calendarMonth: new Date().getMonth(), calendarYear: new Date().getFullYear()
};
const status = c => { if (!c.live) return 'paused'; const t = today(); return t < c.startDate ? 'upcoming' : t > c.endDate ? 'ended' : 'live'; };
const ptsOf = (c, k) => c.targets.find(x => x.id === k.split('@')[0])?.points || 0;
const calcPoints = (c, done) => Object.keys(done).reduce((s, k) => s + ptsOf(c, k), 0);
function streak(done) {
  const days = new Set(Object.values(done)); const d = new Date();
  if (!days.has(ymd(d))) d.setDate(d.getDate() - 1);
  let n = 0; while (days.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const sorted = () => [...S.members].sort((a, b) => (b.points || 0) - (a.points || 0) || String(a.name).localeCompare(String(b.name)));

