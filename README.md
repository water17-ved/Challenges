# Challenge Room — Google-only build

## Included fixes
- Added a **Log out** button under Profile → Settings.
- Waits for Firebase's authentication state on page load before showing either the app or the login screen, preventing the login page from flashing on reload for a signed-in user.
- Keeps Google as the only sign-in method and uses Firebase local persistence.
- Improved profile-picture conversion for mobile image pickers, accepts files whose MIME type is blank, compresses supported images to a small JPEG, and gives a clearer JPG/PNG fallback message for unsupported formats.
- Updated the service-worker cache version so deployed browsers fetch the new files.

## Deploy
1. Extract this ZIP.
2. Upload/replace `index.html`, `sw.js`, `manifest.json`, and `icon.svg` in the root of the `water17-ved/Challenges` GitHub repository.
3. Wait for GitHub Pages to redeploy, then refresh the site. If an old version persists, close the site and reopen it.

Firebase Authentication must have Google enabled and `water17-ved.github.io` listed under Authentication → Settings → Authorized domains.

## Profile picture note
JPG/JPEG and PNG are the safest formats. Very large photos are resized in the browser before being saved. HEIC/HEIF and other formats that Chrome cannot decode may still need to be converted to JPG/PNG first.

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
