# Unline

A place to paste text, have line breaks stripped automatically, and save it
as a reusable, one-click-copy tile for later retrieval. Workflow: **drop or
paste text → line breaks removed automatically → edit → save as a tile →
copy with one click.**

Open it from CopyAI's hamburger menu (**☰ → 🧹 Unline**) or go directly to
`/unline`. Each CopyAI profile has its own separate Unline library — see
[Accounts and isolation](#accounts-and-isolation).

## Why this exists, and why it's scoped the way it is

The original spec for this feature called for a full independent SaaS product
(Postgres, Neon, Drizzle, Auth.js, CI, Playwright) with a dense multi-pane
productivity UI and per-item transform controls. That was more than this
tool needs to be: it's a place to store pasted text for easy retrieval, not
a configurable text-processing workbench. The design has since been pared
back twice, both times toward the same goal — do less, but do it cleanly:

1. **No backend.** `features/unline/storage.ts` plays the role a database
   would (validation, size limits, versioning), backed by the browser's own
   `localStorage` instead of Postgres/Neon/Drizzle.
2. **No transform settings UI.** Line breaks are always stripped
   automatically on paste — there's nothing to configure. The cleaned text
   is just an editable text field.
3. **Centered, single-column layout**, matching CopyAI's own page
   structure (centered header with a hamburger-left/logo-center pattern,
   a single centered content column) rather than a 3-pane sidebar+library+
   editor SaaS shell.

## Isolation guarantee

Nearly everything lives under two trees and touches nothing else at runtime:

- `app/unline/` — the route (`layout.tsx`, `page.tsx`) and its own stylesheet
  (`unline.css`), scoped entirely under a single `.unline-root` class with
  its own CSS custom properties. It cannot be affected by, or leak into,
  `app/globals.css` or any of CopyAI's inline styles.
- `features/unline/` — all domain logic, storage, hooks, and components.
  Nothing outside this tree imports from it except `app/unline/page.tsx`.

The one deliberate exception is `features/unline/hooks/useAuthUid.ts`, which
reads the shared Firebase Auth session from `lib/firebase.ts` — this is what
gives each CopyAI profile its own Unline library (see below). It imports no
CopyAI app/business logic, only that shared config.

Touches to existing CopyAI files:

1. **`app/page.tsx`** — one additive menu entry (`🧹 Unline`, a link to
   `/unline`) in the hamburger dropdown, styled like the existing entries.
2. **`lib/firebase.ts`** — exports `auth` and `usernameToEmail` (added for
   the multi-profile system — see `docs/auth.md` — and reused by Unline's
   `useAuthUid` to know which profile is signed in).
3. **`package.json`** — added `vitest` as a dev-only dependency and a `test`
   script for the transform/search test suite.

## Architecture

```
app/unline/
  layout.tsx      # route metadata + unline.css import
  page.tsx        # server component, renders <UnlineGate/>
  unline.css      # scoped dark-navy design system, centered layout

features/unline/
  types.ts          # domain types (TextItem, Collection, TextVersion, ...)
  transform.ts       # pure line-break/whitespace transform engine (tested)
  search.ts           # pure search/sort/tag helpers (tested)
  storage.ts           # the "server": validated, per-profile-namespaced
                        # localStorage repository + pub-sub
  useUnlineStore.ts     # React binding over storage.ts
  utils.ts               # id/date/clipboard/debounce helpers
  hooks/
    useAuthUid.ts         # reads the shared Firebase Auth session
    useKeyboardShortcuts.ts
    useDraftRecovery.ts
    useCopyFeedback.ts
  components/
    UnlineGate.tsx         # auth gate: redirects signed-out visitors to "/",
                            # points storage at the right profile namespace
    UnlineApp.tsx           # the app shell once a profile is confirmed
    Header.tsx, FilterBar.tsx, DropZone.tsx, Library.tsx, TextTile.tsx,
    Editor.tsx, VersionHistory.tsx, ConfirmDialog.tsx, ...
```

## Accounts and isolation

`/unline` has no login of its own — it rides on the CopyAI session
(`useAuthUid`, via `onAuthStateChanged`). Visiting it while signed out
redirects to `/`. Once a profile is confirmed, `storage.setNamespace(uid)`
points every `localStorage` key at that profile:

```
unline:v1:<uid>:items
unline:v1:<uid>:collections
unline:v1:<uid>:versions
unline:v1:<uid>:draft
```

Switching profiles (sign out, sign in as someone else) switches the entire
keyspace, not just what's displayed — there is no code path that reads one
profile's data while another is signed in. See `docs/auth.md` for how
profiles themselves work.

## Data model and persistence

`features/unline/storage.ts` is the single source of truth for validation,
size limits, versioning, and cascading behavior — none of that logic lives
in components.

### Size limits (enforced in `storage.ts`, see `types.ts` → `LIMITS`)

- Source/cleaned text: 200,000 characters per item
- Title: 200 characters
- Tags: 40 characters each, 20 tags per item
- Version history: last 50 versions kept per item (oldest pruned)

### Collections

Deleting a collection never deletes its items — they move to Uncategorized.
The delete confirmation states this explicitly before it happens.

### Versions

A new version is recorded whenever a save changes the title or text (not
for favorite/pin/collection-only changes). Restoring a version creates a
**new** version from the current state — history is never overwritten or
deleted by a restore.

## Transform engine

`transformText(input, options)` in `features/unline/transform.ts` is a pure
function with no UI dependency, covered by `transform.test.ts` (19 cases:
CRLF/LF/CR, blank-line runs, tabs, leading/trailing spaces, empty input,
single line, Unicode, scientific notation, symbols, chemical formulas, and
5,000-line input). It only ever touches whitespace — punctuation,
capitalization, formulas, and units pass through unchanged.

It always runs with one fixed set of options (flatten lines, trim, and
normalize spaces; don't preserve paragraph breaks) — there is no per-item
configuration. It runs client-side, synchronously, the moment text is
pasted or dropped; there is no network round trip for cleanup. After that,
the saved text is just a plain editable field.

## Drafts and autosave

Local draft persistence (every ~500ms while typing, into the current
profile's `...:draft` key) is distinct from a server save (only on explicit
Save). On load, a recovered draft is only offered if it represents real
unsaved work — non-empty, and, for a draft tied to an existing item, newer
than that item's last save — so a stale draft can never silently clobber
newer saved content.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + K` | Focus search |
| `Cmd/Ctrl + N` | New text |
| `Cmd/Ctrl + S` | Save the open editor |
| `Cmd/Ctrl + Enter` | Copy the open editor's text |
| `Escape` | Close editor / dialog / menu |

## Testing

```bash
npm test         # vitest run — transform engine + search/sort/tag helpers
npm run lint      # eslint (Unline's own files are clean; pre-existing
                    # errors in app/page.tsx and extension/sidebar.js
                    # predate this work and were left untouched)
npx tsc --noEmit  # strict TypeScript, no `any` in Unline code
npm run build     # next build — /unline is a static route alongside `/`
```

The core workflow (paste → auto-clean → edit → save → tile appears → copy
from tile without opening the editor → favorite → search → reopen → version
history → restore; collection create/delete-with-reassignment; Ctrl+K/N/
Escape; draft recovery across a reload; the sign-out redirect from
`/unline`) was exercised end-to-end with Playwright against the dev server.
Real Firebase Auth/Firestore calls could not be exercised in the
development sandbox (no network access to Firebase) — see `docs/auth.md`.

## Security model

- All rendered text uses React's default text nodes — no
  `dangerouslySetInnerHTML` anywhere, so saved text can never execute as
  HTML/script even if it contains markup-like content.
- All external input (pasted/dropped text, titles, tags) is size-clamped and
  sanitized at the `storage.ts` boundary before being persisted.
- `localStorage` reads are guarded against corrupted/foreign JSON and never
  crash the app; a full quota is surfaced as a "Save failed" state, never
  silently swallowed or falsely reported as saved.
- Data is scoped per authenticated profile (see Accounts and isolation), but
  this is enforced by the app's own code, not by a server. It does not
  protect against someone directly manipulating `localStorage` in their own
  browser — there's no "backend" to bypass, so that isn't a meaningful
  attack surface here.

## Known limitations (v1)

- **No sync across devices or browsers.** Data lives in one browser's
  `localStorage`, per profile. `storage.ts` is written as the sole
  persistence boundary specifically so it could be swapped for a real API
  later without touching any component.
- **`.txt` files only** for file drop — no PDF/DOCX extraction.
- **No CI workflow was added.** `npm test`/`lint`/`build` all pass locally;
  wiring them into `.github/workflows` is a small follow-up if desired.
- Pre-existing lint errors in `app/page.tsx` (a `set-state-in-effect`
  warning and some `any` usages) and warnings in `extension/sidebar.js`
  predate this work and were intentionally left as-is.
