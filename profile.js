'use strict';
/* Challenge Room: profile (classic script; shares one global scope with the other js/ files, loaded in order by index.html) */
/* ---------- name ---------- */
function openName() { $('name-input').value = S.name; if (!$('name-modal').classList.contains('on')) { history.pushState({ ...(history.state || {}), crApp: true, view: S.view, pane: S.pane, modal: 'name' }, '', location.href); } $('name-modal').classList.add('on'); setTimeout(() => $('name-input').focus(), 50); }
function applyName(v) {
  S.name = v; ls.set('cr_name', v);
  if (DEMO) { demoSync(); return; }
  S.mine.forEach(m => updateDoc(doc(db, 'challenges', m.code, 'members', S.uid), { name: v, photo: S.photo || '', about: S.about || '' }).catch(() => {}));
  renderAll();
}
async function saveProfileFields(fields) {
  Object.assign(S, fields);
  if ('photo' in fields) ls.set('cr_photo', fields.photo);
  if ('about' in fields) ls.set('cr_about', fields.about);
  if (DEMO) { demoSync(); renderAll(); return; }
  await Promise.all(S.mine.map(async m => {
    try {
      const ref = doc(db, 'challenges', m.code, 'members', S.uid);
      if ((await getDoc(ref)).exists()) await updateDoc(ref, fields);
    } catch {}
  }));
  renderAll();
}
function photoMarkup(photo, name, cls='') {
  const fallback = esc(ini(name));
  return photo ? `<div class="avatar ${cls}" style="padding:0"><img src="${esc(photo)}" alt="${esc(name || 'Profile picture')}" onerror="this.remove();this.parentElement.textContent='${fallback}'"></div>` : `<div class="avatar ${cls}">${fallback}</div>`;
}
async function choosePhoto(file) {
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) return toast('Choose an image under 15 MB.');
  // Android pickers sometimes provide a blank MIME type, so validate by decoding instead.
  try {
    let bitmap;
    if ('createImageBitmap' in window) {
      try { bitmap = await createImageBitmap(file); } catch { bitmap = null; }
    }
    let width, height, draw;
    if (bitmap) {
      width = bitmap.width; height = bitmap.height;
      draw = (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h);
    } else {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((resolve, reject) => {
          const image = new Image(); image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('This browser cannot decode this image format. Try saving it as JPG, PNG, or WebP.'));
          image.src = url;
        });
        width = img.naturalWidth; height = img.naturalHeight;
        draw = (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h);
      } finally { URL.revokeObjectURL(url); }
    }
    if (!width || !height) throw new Error('Image has no dimensions');
    const max = 256, scale = Math.min(1, max / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
    draw(ctx, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', .82);
    if (!data || data === 'data:,') throw new Error('Image conversion failed');
    if (bitmap?.close) bitmap.close();
    await saveProfileFields({ photo: data }); toast('Profile picture saved.');
  } catch (err) {
    console.warn('Profile picture processing failed:', err);
    toast(err?.message?.includes('cannot decode') ? 'This format is not supported by your browser. Try JPG, PNG, or WebP.' : 'Could not process that picture. Try another image file.');
  }
}
async function logout() {
  if (DEMO) { toast('Demo mode has no account to log out of.'); return; }
  try {
    await signOut(auth);
    S.uid = null; S.chal = null; S.me = null; S.members = []; S.unsubs.forEach(fn => fn()); S.unsubs = []; stopNotifListeners();
    document.body.classList.add('auth-required'); setView('login');
    toast('Logged out.');
  } catch (err) { toast('Could not log out. Check your connection and try again.'); }
}

async function saveAbout() {
  const about = $('p-about').value.trim().slice(0,160);
  await saveProfileFields({ about }); toast('About saved.');
}
function downloadData() { exportMemoryBackup(); }
function authErrorMessage(err) {
  const code = err?.code || '';
  const messages = {
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/popup-blocked': 'Chrome blocked the sign-in popup. Allow popups for this site and try again.',
    'auth/unauthorized-domain': 'Add water17-ved.github.io to Firebase Authentication > Settings > Authorized domains.',
    'auth/operation-not-allowed': 'Enable Google in Firebase Console > Authentication > Sign-in method.',
    'auth/account-exists-with-different-credential': 'This Google email is already registered with another sign-in method.',
    'auth/credential-already-in-use': 'This Google account already has a Challenge Room account. Sign in with it; guest-owned challenges cannot be automatically transferred.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.'
  };
  return messages[code] || err?.message || 'Google sign-in failed. Check Firebase settings and try again.';
}
async function guestLogin() {
  if (DEMO) { loadDemo(); setView('home'); return; }
  $('login-status').textContent = 'Starting a guest session…';
  try {
    if (auth.currentUser?.isAnonymous) { document.body.classList.remove('auth-required'); afterName(); return; }
    await signInAnonymously(auth);
    $('login-status').textContent = 'Guest session ready.';
  } catch (err) {
    const msg = err?.code === 'auth/operation-not-allowed'
      ? 'Guest access is not enabled yet. In Firebase Console, open Authentication → Sign-in method and enable Anonymous.'
      : authErrorMessage(err);
    $('login-status').textContent = msg; toast(msg);
  }
}

async function googleLogin() {
  if (DEMO) return demoMsg();
  $('login-status').textContent = 'Connecting to Google…';
  $('google-existing-login').hidden = true;
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      try {
        await linkWithPopup(current, provider);
        $('login-status').textContent = 'Google connected. Your existing account ID and challenge ownership are preserved.';
        toast('Google linked. Existing challenges are preserved.');
      } catch (err) {
        if (err?.code === 'auth/credential-already-in-use' || err?.code === 'auth/account-exists-with-different-credential') {
          $('login-status').textContent = 'That Google account already belongs to a different Challenge Room account. You can sign in to it, but challenges owned by this guest account will not automatically transfer.';
          $('google-existing-login').hidden = false;
          toast('Google account already in use. Choose whether to sign in to it.');
          return;
        }
        throw err;
      }
    } else {
      await signInWithPopup(auth, provider);
      $('login-status').textContent = 'Signed in with Google.';
      toast('Signed in with Google.');
    }
  } catch (err) { const message = authErrorMessage(err); $('login-status').textContent = message; toast(message); }
}

async function googleExistingLogin() {
  if (DEMO) return demoMsg();
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
    toast('Signed in with Google.');
  } catch (err) { const message = authErrorMessage(err); $('login-status').textContent = message; toast(message); }
}

function saveName() {
  const v = $('name-input').value.trim(); if (!v) return toast('Enter a name.');
  const first = !S.name; $('name-modal').classList.remove('on'); if (history.state?.modal === 'name') history.replaceState({ ...history.state, modal: null }, '', location.href); applyName(v); if (first) afterName();
}
function saveProfile() { const v = $('p-name').value.trim(); if (!v) return toast('Enter a name.'); applyName(v); toast('Name saved'); }

