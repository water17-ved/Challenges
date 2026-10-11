# Challenge Room — Google-only build

## Included fixes
- Added a **Log out** button under Profile → Settings.
- Waits for Firebase's authentication state on page load before showing either the app or the login screen, preventing the login page from flashing on reload for a signed-in user.
- Keeps Google as the only sign-in method and uses Firebase local persistence.
- Improved profile-picture rendering so photos are consistently circular and cropped, and broken images fall back gracefully to initials. The picker explicitly accepts common image extensions (JPG/JPEG, PNG, WebP, GIF, BMP, AVIF, SVG, TIFF, HEIC/HEIF); browser-decodable formats are resized and converted to JPEG before saving. HEIC/HEIF support depends on the browser decoder, so convert those to JPG/PNG/WebP if they cannot be decoded.
- Updated the service-worker cache version so deployed browsers fetch the new files.

## Deploy
1. Extract this ZIP.
2. Upload/replace `index.html`, `sw.js`, `manifest.json`, and `icon.svg` in the root of the `water17-ved/Challenges` GitHub repository.
3. Wait for GitHub Pages to redeploy, then refresh the site. If an old version persists, close the site and reopen it.

Firebase Authentication must have Google enabled and `water17-ved.github.io` listed under Authentication → Settings → Authorized domains.

## Profile picture note
JPG/JPEG, PNG, and WebP are the safest formats. GIF, BMP, AVIF, SVG, and TIFF may also work if the browser can decode them; uploaded photos are normalized to JPEG. HEIC/HEIF acceptance is enabled in the picker, but decoding depends on the browser and may require conversion to JPG, PNG, or WebP.

## Validation
The JavaScript module passed `node --check`. Firebase sign-in, Firestore writes, and the live GitHub Pages deployment were not tested from this environment.

## Challenge tab upgrades
- The Challenge tab now opens with two primary choices: **Challenge Market** and **My Challenges**.
- **Challenge Market** lists live, discoverable challenges that the signed-in user has not joined and provides a Join action.
- The challenge builder supports a nested study tree: **Subject → Chapter → Topic → Task**. Tasks keep their subject/chapter/topic metadata and render grouped into that tree. Each task can be daily or one-time.
- **My Challenges** has separate actions for **Create challenge** and **Create mega challenge**.
- Standard challenge creation only builds its own Subject → Chapter → Topic → Task tree.
- The separate **Create mega challenge** screen lets the creator choose existing standard challenges, set a title/description/date range, and combine them into one parent mission. Component challenges remain independent and appear as branches in the mega challenge. Mega challenges are excluded from the component picker to avoid accidental recursive nesting.
- Newly created challenges are marked `discoverable: true` for market listing.

## Firestore market permission
The market uses a Firestore query for documents where `discoverable == true`. If the Market says it is unavailable, merge an appropriate list permission into your existing `/challenges/{challengeId}` Firestore rules (do not replace your whole rules file blindly):

```text
allow list: if request.auth != null && resource.data.discoverable == true;
```

Keep your existing ownership, membership, and write permissions intact. Firestore rules are not included in this ZIP.


## Editing challenges and task frequency

Challenge owners can open a challenge and choose **Edit challenge** to update its title, description, start/end dates, and (for standard challenges) task text, subject/field, chapter, topic, and frequency. Tasks can be added or removed before saving. Each task can be marked **Daily** or **One-time**. Mega challenge owners can edit the mega challenge details and add/remove linked standard-challenge branches. Changes are saved to Firestore and are visible to other members.

## AI Plan and Memory backups
- The new **AI** tab includes a starting prompt for planning in a separate AI conversation and a final prompt that requests strict JSON.
- Paste the AI's final JSON into **AI response**, preview the parsed task tree, then create the challenge. The AI itself is not connected to the site; the user copies prompts and pastes the response back.
- **Memory & local backups** exports a `.json` file containing local profile settings, joined challenge references, accessible challenge definitions, and the current member's progress where Firestore rules permit reading it. Import restores profile settings and recreates challenges owned by the original account as new copies with new codes.
- A backup file is local to the user. Keep a copy somewhere safe; it is not automatically synced to cloud storage.

## Guest access
- **Continue as guest** uses Firebase Anonymous Authentication. Enable it in Firebase Console → Authentication → Sign-in method → Anonymous. Google sign-in can later be linked to the guest account to preserve ownership where Firebase permits linking.
- Guest sessions are tied to the browser's Firebase persistence. Clearing browser data or losing the guest session can make cloud challenges difficult to recover; export a memory backup and link Google for safer long-term access.

## Installability / PWA
- The manifest now includes 192×192 and 512×512 PNG icons in addition to the SVG icon, and the service worker caches the app shell and icons.
- The Profile → Settings → **Install** action invokes Chrome's install prompt when the browser offers it. If no prompt appears, open the HTTPS GitHub Pages URL directly in Chrome, refresh after deployment, and use Chrome ⋮ → **Install app** or **Add to Home screen**. Some browsers only offer Add to Home Screen and do not expose the install prompt event.
- The app must be served over HTTPS (GitHub Pages is HTTPS). A local `file://` copy is not installable as a PWA. If Chrome still does not offer installation, inspect the page's manifest/service-worker status in Chrome DevTools → Application; check for failed manifest/icon requests and ensure the service worker has activated.
