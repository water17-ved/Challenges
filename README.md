# Challengeus MVP

A dark, responsive small-group challenge dashboard.

## Included in this first preview
- Overview dashboard and navigation
- Create challenges (up to 8 members)
- Personal targets per challenge
- Progress logging and percentages
- Journal reflections and activity
- Display-name profile
- AI Blueprint starter template (local preview only)

## Run
Use GitHub Pages or a local static server such as VS Code Live Server. Do not open `index.html` directly as a `file://` URL.

## Important limitations
This is a local-first prototype. Data is stored in browser localStorage; it is not synced between group members. AI Blueprint is a local starter template, not yet connected to Gemini. Firebase Authentication, Firestore, secure invitation joining, member-only privacy rules, and Gemini integration remain to be built and tested.

The repository is public. Do not commit API keys, passwords, private configuration, or personal data.

## Next implementation steps
1. Configure Firebase Authentication and Firestore.
2. Add server-validated invitation redemption and enforce the 8-member limit.
3. Add restrictive Firestore Security Rules for member-only progress and journal access.
4. Connect Gemini using Firebase AI Logic; retain preview/edit/confirm before saving.
5. Test with separate accounts and deploy.
