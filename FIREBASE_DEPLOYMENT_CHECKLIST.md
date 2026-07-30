# NEXUS One-Line Firebase Deployment Checklist

- Confirm the existing NEXUS Firebase project and web app.
- Reuse the existing Auth session and login page.
- Confirm login.html supports `returnUrl`.
- Assign `oneLineEditor`, `engineer`, or `admin` claims to authorized editors.
- Merge `firestore.rules.template` into the canonical ruleset.
- Rename `firebase-config.template.js` to `firebase-config.js` and fill existing values.
- Rename `one_line_firebase_adapter.template.js` to `one_line_firebase_adapter.js`.
- Enable the adapter script in `one_line_diagram.html`.
- Set `NEXUS_ONE_LINE_USE_FIREBASE = true` only after SDK initialization.
- Verify authenticated read from a phone scanning a QR code.
- Verify signed-out redirect and return to the exact phase diagram.
- Verify a viewer cannot write through the UI or directly through Firestore.
- Verify an editor can save and another device receives the change in real time.
- Verify revoked access stops reads after token refresh/session expiration.
- Keep localStorage available only as a development/fallback backend.
