# Challenge Room

Study challenges with friends, built for JEE aspirants. Make a challenge from subjects, topics and tasks, share a 6-character code, tick off daily quests, and watch the streaks, weekly league and board.

**Live site:** https://water17-ved.github.io/Challenges/

A static site with no build step. Firebase (Authentication and Firestore) is the only backend.

## Files
| File | What it is |
|---|---|
| `index.html` | The whole app: pages, styles and scripts. |
| `sw.js` | Service worker: offline support and automatic updates. |
| `manifest.json` | Install-to-home-screen settings. |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | App icons (`icon-maskable.svg` is the source for the PNGs). |
| `firestore.rules` | The security rules to paste into Firebase. |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. |

## 1. Firebase setup (project `llenge`)
1. **Build > Authentication > Sign-in method:** enable **Anonymous** (guests) and **Google** (choose a support email and save).
2. **Authentication > Settings > Authorized domains:** add `water17-ved.github.io` (the domain only, no path). Without this, sign-in fails on the live site.
3. **Build > Firestore Database:** create a database in production mode.
4. **Firestore > Rules:** paste the whole of [`firestore.rules`](firestore.rules) and **Publish**. The market, nudges, progress requests and Google account sync all need these rules.
5. Optional safety net: **Firestore > TTL**, add a policy for collection group `progressRequests` on the field `expireAt`. The app already deletes requests as soon as they are answered; this only cleans up requests nobody ever answered.
6. If you ever restrict the API key in Google Cloud, allow the referrer `https://water17-ved.github.io/*`. The key in `index.html` is meant to be public. The rules are what protect the data.

## 2. Host on GitHub Pages
1. In the repo `Challenges` (account `water17-ved`), upload **all** the files above to the root of the `main` branch.
2. **Settings > Pages > Source:** *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Open https://water17-ved.github.io/Challenges/ after a minute or two.
4. When you update a file, the site picks it up on the next visit (the service worker checks the network first).

## Seeing the welcome screen
The welcome (login) screen shows on a first visit and after signing out. To look at it any time, add `?login` to the address: https://water17-ved.github.io/Challenges/?login

The app needs the hosted site to work, because Firebase sign-in does not run from a file on your computer. There is no sample or demo data: a new account starts empty.

## How it works
- **Sign in:** continue with Google, or as a guest. A guest can tap *Save with Google* in Profile; this links Google to the same account, so nothing is lost. Sign out and "Clear data" both sign out and wipe the device.
- **Home:** greeting, exam countdown (default JEE Main 2027 Session 1, changeable), today's quests, and your challenges.
- **Challenge tab:** two buttons.
  - **Challenge market:** ready-made JEE plans, public challenges anyone can join, and buttons to create a challenge or join with a code.
  - **My challenges:** just the names. Tap one for its full page with **Today** (quests by subject and topic), **Board** (standings and chart) and **Me** (stats, subject breakdown, journal, private mistakes log), plus host, dates, players and plan size.
- **Plan builder:** pick a subject, select **several topics at once** (or type your own, separated by commas), then add tasks. Each task goes into every selected topic. Ready-made packs, importing your existing challenges (mega challenge) and a "Show in the Challenge market" switch are on the same screen. Tasks are stored as one list with `subj`, `topic` and `qs` fields.
- **Crown button (top bar):** the Hall of fame. For every challenge of yours that ended, it shows the winner, the podium, and who finished the plan (80% or more).
- **Activity:** who has finished today (with a Nudge button), the weekly league (Monday to Sunday), a feed grouped by subject and topic, and **progress requests**: tap a player to ask for their progress. They get a request and choose Allow or Decline. If they allow, their points, streak and today's quests are placed on the server only until your phone receives them, then deleted. The copy you see is saved on your device only.
- **AI tab:** *Make a challenge with AI* gives two prompts (one to plan with any AI chat, one to get JSON back). Bring the answer back by **uploading it as a .json or .txt file or by pasting it**, then preview it and load it into the builder. *Backup and restore* saves everything to a `.json` file on the device; restore takes the file or pasted text and is device-only and never writes to the server.
- **Performance report:** when a challenge has ended, its page shows **Download performance report** (a standalone HTML file; Print > Save as PDF if you want a PDF).
- **Points:** every tick is +10. Streak = consecutive days with at least one quest cleared. Only the host can pause, resume, delete or list a challenge in the market. Anyone can leave.

## Data
- `users/{uid}`: name and the list of challenge codes.
- `challenges/{code}` and `challenges/{code}/members/{uid}`: the challenge and each player's progress.
- `challenges/{code}/nudges/{id}`: nudges.
- `progressRequests/{id}`: temporary progress requests, deleted once answered.
- Never stored on the server: backups, the mistakes log, saved copies of other people's progress.
