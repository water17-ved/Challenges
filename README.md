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
