# Multi-profile accounts

CopyAI used to have exactly one hardcoded account: username `Jesse`,
password `copyai`, checked as a literal string comparison, with all
Firestore data written to a single fixed document (`users/jesse`). There
was no real authentication — anyone who knew (or guessed) the string could
log in, and there was only ever one library of prompts.

This has been replaced with real accounts via **Firebase Authentication**
(email/password), so multiple people can each have their own login, their
own CopyAI prompts, and their own Unline saved text, with no crossover.

## How login still looks like "username + password"

Firebase Auth requires an email address, not a bare username. Rather than
changing the login form's shape (and breaking the existing `wolfkrow.onrender.com`
embed integration, which sends `{ username, password }` via `postMessage`),
each username is deterministically mapped to a synthetic address:

```
usernameToEmail("Jesse") -> "jesse@copyai.local"
```

(`lib/firebase.ts` → `usernameToEmail`.) Nobody sends mail to `copyai.local`
— it only exists to satisfy Firebase Auth's schema. Because Firebase Auth
itself enforces one account per email, this also enforces one account per
username with no extra lookup table.

## What changed

- `lib/firebase.ts` — exports `auth` (Firebase Auth) and `usernameToEmail`.
- `app/page.tsx`:
  - The login form now has a Sign Up / Log In toggle. Sign up takes
    username, password, and a confirm-password field.
  - Session state comes from `onAuthStateChanged`, not a plain boolean —
    so a signed-in session survives a page refresh (Firebase persists it),
    where the old hardcoded flag did not.
  - Firestore reads/writes moved from the hardcoded `users/jesse` document
    to `users/{uid}`, scoped to `auth.currentUser`.
  - The hamburger menu gained a "Sign Out" item (needed to switch between
    profiles) and shows who's currently signed in.
  - The `WRKFLOW_LOGIN` postMessage handler (the wolfkrow.onrender.com
    embed integration) now calls real `signInWithEmailAndPassword` instead
    of comparing against the hardcoded string pair. It keeps working
    exactly as before, *provided* the legacy `Jesse`/`copyai` pair is
    recreated as a real account once — see Migration below.
- Unline (`features/unline/`) reads the same Firebase Auth session (via
  `useAuthUid`, the one deliberate coupling point back to `lib/firebase.ts`)
  and namespaces its own `localStorage` keys by uid, so each profile also
  gets its own separate Unline library. Visiting `/unline` while signed out
  redirects to `/`.

## Required setup (cannot be done from code)

1. **Enable the Email/Password sign-in provider** for the `copyai-c2e3b`
   Firebase project in the Firebase console (Authentication → Sign-in
   method). Sign up/log in will fail with an `auth/operation-not-allowed`
   error until this is turned on.
2. **Recreate the legacy account.** The very first time someone signs up
   with username `Jesse` and password `copyai`, a one-time migration
   (`app/page.tsx`, the Firestore load effect) automatically copies
   whatever is at the old `users/jesse` document into that new account's
   `users/{uid}` document. Do this once, after enabling the provider above,
   to carry over existing prompts and keep the wolfkrow.onrender.com embed
   login working unchanged.
3. Nothing else needs to change on the wolfkrow.onrender.com side — it
   keeps sending the same `{ username: "Jesse", password: "copyai" }` pair,
   which now authenticates against the real account instead of a hardcoded
   check.

## Known limitations

- Firestore security rules were not (and could not be, from this session)
  inspected or changed. For real per-account isolation to hold against a
  malicious client — not just the app's own UI — rules restricting
  `users/{uid}` reads/writes to `request.auth.uid == uid` must exist. This
  is a Firebase console change, not a code change.
- There is no "forgot password" flow, no email verification, and no way to
  change your password or delete an account from the UI yet.
- This was not tested against the live Firebase project (this development
  environment has no network access to Firebase). It's been verified with
  `tsc`, lint, and by exercising the sign up/log in UI locally with
  Playwright, but the actual `createUserWithEmailAndPassword` /
  `signInWithEmailAndPassword` calls have not been run against production.
