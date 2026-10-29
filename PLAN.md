# TrayBuddy — GNOME Shell extension

## Context
GNOME has no system tray of its own. Application tray icons reach the top bar through the AppIndicator extension, and other extensions add their own icons. On a busy desktop the right side of the top bar fills up with icons that are needed only now and then.

[Lilypad](https://github.com/shendrew/Lilypad) (GNOME 46–50) groups such icons behind a toggle button. It serves as **inspiration, not a template**: TrayBuddy targets current GNOME only, so it doesn't have to wait for third-party extensions to be updated, and it improves on Lilypad where it can.

The goal:
- For each top-bar icon, the user chooses **Shown**, **Collapsible** (behind an arrow) or **Hidden**.
- The user chooses the order.
- Clicking the arrow reveals the collapsible icons with an animation; they collapse again after a set time without use.
- The arrow shows its state (rotates).
- Nice touches: a pill behind revealed icons, live preview in settings.

**Target:** GNOME Shell 51 and later (installed here: 51.1). ESM, `"shell-version": ["51"]`.

**Location:** `/home/svashtar/projects/development/GNOME/traybuddy-gnome`

**Conventions:** same as `../lightsbuddy-gnome`: layout, Makefile targets, ESLint config, test harness, About page, docs set, AI notice, commit-locally-don't-push.

## Key design decisions, and where they differ from Lilypad

| Topic | Lilypad | TrayBuddy, and why |
|---|---|---|
| Finding new icons | Monkey-patches `Panel.prototype.addToStatusArea` | Listens to `child-added`/`child-removed` on the boxes. No patching of shell methods (EGO rule), and it also catches icons re-added by AppIndicator. |
| Right box | `Main.panel._rightBox` (private) | Our own button's `container.get_parent()`. |
| Hiding | `container.hide()`, which the owner can undo | Move into a hidden vault widget; owners can toggle their own visibility freely. |
| States | Shown / grouped | Shown / Collapsible / **Hidden** (never shown) |
| Icon identity | Regex on role name | `app:<name>` for AppIndicator icons (roles contain bus name and PID), role for extensions; duplicates numbered |
| Offline icons | Not listed | Remembered (`known-items`), configurable while the app isn't running, can be forgotten |
| Collapse timer | Polls in fifths of the delay, reads `menuManager._menus` | One timer, poked by hover and menu open/close; waits while busy |
| Click handling | Version checks, `_clickGesture` (private) | Button without its own menu + our own `Clutter.ClickGesture` (left/touch toggles, right opens menu) |
| Animation | Show/hide | Width ease of a pill, staggered slide-in, rotating arrow |
| Settings | Order list (GTK builder files) | Adw: preview, three-way toggle per icon, drag to reorder, behaviour page, About page with debug info and backups |

## Settings (`org.gnome.shell.extensions.traybuddy`)
| Key | Type | Default | Written by |
|---|---|---|---|
| `item-order` | `as` | `[]` | prefs |
| `item-states` | `a{ss}` | `{}` | prefs |
| `known-items` | `s` (JSON) | `[]` | shell (prefs for Forget) |
| `default-state` | enum shown/collapsible | shown | prefs |
| `auto-collapse` | `b` | true | prefs |
| `collapse-delay` | `u` 1–120 s | 5 | prefs |
| `open-on-hover` | `b` | false | prefs |
| `pill-style` | enum none/subtle/accent | subtle | prefs |
| `arrow-position` | enum left/right | right | prefs |

## Steps
1. ✅ Scaffold repo with LightsBuddy conventions (Makefile, lint, CI, harness, docs, templates)
2. ✅ Pure modules + tests: `items.js`, `collapseTimer.js`, `settingsBackup.js`, `debugInfo.js`
3. ✅ Shell: `TrayButton`, `Drawer`, `TrayManager`
4. ✅ Prefs: Icons (preview, toggles, drag and drop, forget), Behaviour, About
5. ⏳ Test on the real desktop after a re-login: AppIndicator icons, LightsBuddy, Dash to Panel, Catppuccin theme, disable/enable cycles leave no traces
6. ⏳ Screenshots of the top bar (collapsed, open) for README
7. ⏳ Create GitHub repo `Svashtar/traybuddy-gnome`, first release, EGO submission (after the maintainer's review and AI-notice removal)

## Later
- Keyboard shortcut to toggle the drawer (`Main.wm.addKeybinding`), with a shortcut editor in prefs.
- Keyboard reordering in prefs (Alt+Up/Down) as an alternative to dragging.
- Badge with the number of tucked-away icons on the arrow.
- Optional: manage icons in the left/centre boxes.
- Per-icon "reveal when it needs attention" (would need a public AppIndicator signal).
