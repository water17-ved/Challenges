# Challenge Room

Create a challenge (a set of targets), make it live, and let friends join with a code or link. Home, challenge detail with a points chart, activity feed, profile, streaks, live board, and a journal. Static site: no build step.

Files: `index.html` (the whole app, scripts and styles inside), `sw.js`, `manifest.json`, `icon.svg`.

## Preview the layout (no login)
Open `index.html` straight from your files, or add `?demo` to the hosted URL. Demo mode loads three sample challenges with quests, a points chart, an activity feed and journal entries. Nothing is saved and Firebase is not used.

## 1. Firebase setup (project `llenge`)
1. Build > Authentication > Sign-in method: enable **Google** only. This version does not create new anonymous accounts or support email/password login. Existing anonymous sessions are detected; the login screen attempts to link the guest UID to the selected Google account so challenge ownership can be preserved. If that Google account is already linked to another Firebase UID, automatic linking is not possible and guest-owned challenges remain under their original UID.
2. Build > Firestore Database: create a database (production mode).
3. Firestore > Rules: paste the rules below and Publish.
4. Authentication > Settings > Authorized domains: add `water17-ved.github.io` (or your own GitHub Pages domain).

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /challenges/{code} {
      allow get: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.ownerUid == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.ownerUid == request.auth.uid;
      match /members/{uid} {
        allow read: if request.auth != null;
        allow create, update, delete: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```
The web API key in `index.html` is meant to be public. The rules above are what protect your data. Challenges cannot be listed, so the 6-character code acts as the invite.

## 2. Host on GitHub Pages
1. Create a new public repo and upload these files to the root.
2. Settings > Pages > Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Open `https://YOUR-USERNAME.github.io/REPO-NAME/` and create a challenge.

## How it works
- Quests are either **daily** (tick once per day) or **side quests** (one time). Each tick is +10 points.
- Streak = consecutive days with at least one quest cleared.
- Only the host can pause, resume, or delete a challenge. Anyone can leave.
- Data: `challenges/{code}` and `challenges/{code}/members/{uid}`.
- Authentication: Google sign-in only. Existing guest sessions are linked to Google when possible, preserving the Firebase UID and ownership. If the Google account is already connected to another Firebase UID, the app cannot automatically merge or transfer challenge ownership.
- Existing anonymous accounts cannot be recovered after browser storage is erased unless they were linked to Google first.
- Login screen includes a JEE Tracker shortcut: https://water17-ved.github.io/jee-battle-2027-new/.
