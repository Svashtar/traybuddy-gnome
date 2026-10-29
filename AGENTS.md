# AGENTS.md

GNOME Shell 51+ extension (`traybuddy@svashta.com`) that tidies the right side of the top bar:
each indicator icon is **Shown**, **Collapsible** (behind an animated arrow) or **Hidden**, in a
user-chosen order. Plain ESM GJS, no build step, no npm dependencies.
Public repo (to be created): `Svashtar/traybuddy-gnome`.

- Design and roadmap: [PLAN.md](PLAN.md)
- Module map, layout model, lifecycle: [docs/architecture.md](docs/architecture.md)
- User docs: [README.md](README.md), [docs/](docs/)
- Sister project with the same conventions: `../lightsbuddy-gnome`

## Layout
```
src/            the extension itself (this folder is what gets installed and packed)
  extension.js  shell entry: creates the TrayManager
  prefs.js      preferences entry: Icons, Behaviour, About pages (src/prefs/)
  lib/          shared by shell and prefs; NO St/Clutter/Gtk/Adw imports
  ui/           shell-only widgets (St/Clutter/PanelMenu)
  prefs/        prefs-only pages (Gtk/Adw)
tests/          `gjs -m` unit tests for the pure lib/ modules (tests/harness.js)
tools/          prefs-preview.js (+ preview-settings.json sample data)
docs/  po/  .github/
```

## Commands
```sh
make test        # unit tests (gjs -m tests/*.test.js)
make lint        # npx eslint@9 . — must stay at 0 errors/warnings
make install     # symlink src/ into ~/.local/share/gnome-shell/extensions/
make pack        # dist/traybuddy@svashta.com.shell-extension.zip (EGO / releases)
make pot         # regenerate po/traybuddy.pot after changing UI strings
make ego-check   # test + lint + pack, then fail while any AI notice remains
PREVIEW_SETTINGS=tools/preview-settings.json GSETTINGS_BACKEND=memory \
  GI_TYPELIB_PATH=/usr/lib/gnome-shell/girepository-1.0 LD_LIBRARY_PATH=/usr/lib/gnome-shell \
  gjs -m tools/prefs-preview.js <page> out.png
                 # render a prefs page (icons|general|about) without the shell
journalctl -b _COMM=gnome-shell -o cat --since -10min   # shell log
```

## Testing realities
- **Wayland: changed JS only loads after the user logs out and in.** `gnome-extensions
  disable/enable` reuses cached modules. `make nested` needs `mutter-devkit` (not installed).
  So: test pure logic with unit tests, prefs with `tools/prefs-preview.js`, and ask the user
  to check the top bar after a re-login.
- Check the shell's own sources before using an API:
  `gresource extract /usr/lib/gnome-shell/libshell-*.so /org/gnome/shell/ui/<file>.js`.
- The user runs **Dash to Panel** (primary panel reuses `Main.panel`; it moves `activities`,
  `quickSettings` and `dateMenu` out of the right box) and **AppIndicator support**
  (roles `appindicator-<bus name>@<path>`, re-added on `tray-pos` changes). Keep both working.
- The user runs a custom shell theme (Catppuccin, via user-theme) that uses `!important`.
  Check both the stock theme and the user's theme CSS before styling; scope rules to
  `traybuddy-*` classes and never restyle other extensions' buttons.
- St CSS is not browser CSS: no `color-mix()`, no `opacity`. Use `st-transparentize()` with
  a real colour (or `-st-accent-color`), or set `actor.opacity` in code.

## How icons are handled
- Indicators are only **moved** between the panel's right box, our drawer and our hidden
  vault. Never re-create, restyle, monkey-patch `addToStatusArea` or change another
  extension's own `visible` state. `disable()` puts every icon back, visible.
- Icon keys must survive restarts: extension roles as-is, AppIndicator roles by accessible
  name (`app:<slug>`), see `lib/items.js`.
- The screen recording/sharing indicators and system menus (`SYSTEM_ROLES`) are never managed.
- Only the shell writes `known-items`; prefs only writes `item-order`, `item-states` and the
  behaviour keys (and `known-items` for Forget).

## extensions.gnome.org rules
Follow both https://gjs.guide/extensions/review-guidelines/review-guidelines.html and
https://gjs.guide/extensions/review-guidelines/best-practices.html. The ones that bite here:
- **AI notice:** every file in `src/` carries the three-line "Generated with AI for personal
  use…" notice from the best-practices page; new files get it too. **Never remove it.** The
  maintainer removes it by hand after reviewing the code, then runs `make ego-check`.
- Create nothing at import time or in constructors that run before `enable()`.
- `disable()`/`destroy()` remove every GLib source, disconnect every signal, destroy every
  object, in that order. Each class cleans up what it created, and timeout removal sits next
  to its creation.
- No `_destroyed`/`_enabled` flags.
- No `?.` or `typeof … === 'function'` checks on things that always exist; no try/catch around
  calls that can't throw. `?.` is fine for other extensions' optional parts (`indicator.menu`).
- Comments explain why, never restate the code; no decorative dividers.
- No private shell internals (anything starting with `_` on shell objects, such as
  `Main.panel._rightBox` or `button._clickGesture`). Get the right box from our own
  button's `container.get_parent()`.
- `metadata.json`: no `version` key (EGO sets it); the description declares clipboard use.
- No code that only tests use in `src/` (test helpers live in `tests/`).
- ESLint enforces the process separation (`src/lib` no UI toolkits, `src/ui` no Gtk/Adw,
  `src/prefs` no St/Clutter/Meta/Shell) and lines ≤ 200 characters.

## Code rules
- `src/lib/` must work in both processes. Pure modules (items, collapseTimer, markdown,
  settingsBackup, debugInfo) import nothing from GNOME, and every change to them gets a unit test.
- Every user-facing string goes through `_()` / `ngettext()`; run `make pot` afterwards.
  UI copy uses British spelling ("colour", "behaviour"). Keep strings short.
- `connectObject()` is shell-only; prefs code uses `connect()` and disconnects on `close-request`.
- Debug info never names the user's apps (app icons are only counted).
- Match the surrounding style: 4-space indent, ESM, SPDX header on new files, short
  comments that explain why.

## Finishing a change
- Run `make test` and `make lint`.
- User-visible change → update the owning `docs/` page and add a line under
  `## [Unreleased]` in `CHANGELOG.md` (it feeds About → What's New).
- Commit locally with a clear message. **Do not push**: push to GitHub only when the
  user asks.
- Say plainly what was verified and what still needs a re-login to check.
