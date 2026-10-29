# Architecture

This page is for contributors. It describes how the extension is put together, how it finds and places top-bar icons, and how it cleans up. For setup and code style, see [CONTRIBUTING.md](../CONTRIBUTING.md).

The extension targets **GNOME Shell 51 and later**, uses ES modules, and runs as two processes: the **shell** side (`extension.js`, `ui/`) inside `gnome-shell`, and the **preferences** window (`prefs.js`, `prefs/`) in a separate `gjs` process. `lib/` is shared by both, and its pure modules are unit-tested with plain `gjs -m`.

## Module map

```
src/metadata.json          uuid traybuddy@svashta.com, shell-version ["51"], settings-schema
src/extension.js           enable/disable; creates the TrayManager
src/ui/trayManager.js      finds indicators, places them (shown / drawer / vault), tracks changes,
                           expand/collapse, hover-to-open, writes known-items
src/ui/trayButton.js       the arrow: PanelMenu.Button without its own menu, click gesture,
                           Enter/Space, right-click menu (Keep Open, Settings), rotation
src/ui/drawer.js           St.BoxLayout "pill" holding collapsible icons; open/close animation
src/lib/items.js           pure: icon keys, display names, SYSTEM_ROLES, layout plan, known-items merge,
                           reorder and forget helpers
src/lib/collapseTimer.js   pure: inactivity timer that waits while busy (timers injected)
src/lib/config.js          GSettings helpers (known-items JSON, item-states dict)
src/lib/debugInfo.js       pure: "Copy Debug Info" text (counts app icons, never names them)
src/lib/settingsBackup.js  pure: settings export/import format
src/lib/markdown.js        pure: CHANGELOG.md → Pango markup for About → What's New
src/prefs.js               Adw preferences window; CSS for the preview; debug info
src/prefs/iconsPage.js     preview, one row per known icon (state toggles, drag to reorder, forget)
src/prefs/generalPage.js   "Behaviour": auto-collapse, delay, open on hover, pill style
src/prefs/aboutPage.js     version, What's New, help links, debug info, backup/import/reset
src/schemas/               org.gnome.shell.extensions.traybuddy.gschema.xml
```

## Where icons go

Every indicator in GNOME Shell is a `PanelMenu.Button` wrapped in a `container` (`St.Bin`) that sits in one of the panel's boxes; `Main.panel.statusArea[role]` points at the button. TrayBuddy adds its arrow to the right box and puts two boxes of its own next to it:

```
right box:  [vault (always hidden)] [drawer: collapsible…] [arrow] [shown…] [rest of the panel…]
```

- **Shown** icons stay direct children of the right box, right after the arrow, in the user's order. Theme rules such as `#panel .panel-button` keep applying because they are descendant selectors.
- **Collapsible** icons move into the drawer.
- **Hidden** icons move into the vault, a hidden `St.Widget`. Hiding the parent instead of the icon means apps and extensions can keep toggling their own icon's visibility without it reappearing.

Only containers are moved. TrayBuddy never re-creates, restyles or patches another extension's indicator, and never patches `Panel.addToStatusArea`.

The right box comes from our own button (`container.get_parent()`), not from the private `Main.panel._rightBox`. With Dash to Panel the primary panel *is* `Main.panel`, so this is the box Dash to Panel shows; it moves `activities`, `quickSettings` and `dateMenu` out of it, which TrayBuddy never manages anyway (`SYSTEM_ROLES`).

## Finding icons and keeping up

`TrayManager._collect()` walks `Main.panel.statusArea` and keeps the indicators whose container is in the right box, the drawer or the vault. Indicators in the left or centre box are left alone.

Indicators come and go at any time: apps start and quit, AppIndicator re-adds icons when its *Tray position* changes, other extensions are enabled and disabled. `child-added` / `child-removed` on all three boxes queue an idle `_arrange()`, which batches bursts and ignores the changes it makes itself. Settings changes (`item-order`, `item-states`, `default-state`) queue the same.

Per indicator, TrayBuddy also watches:

| Signal | Why |
|---|---|
| `notify::accessible-name` | AppIndicator sets the name after the D-Bus proxy is ready, which changes the icon's key. |
| `notify::visible` | The arrow only shows while a collapsible icon is visible. |
| `menu-set`, menu `open-state-changed` | An open menu keeps the drawer from collapsing; closing it restarts the timer. |

## Icon keys

Settings refer to icons by a key that must survive restarts (`lib/items.js → itemKey()`):

- Extension icons: their role, which is usually the extension's UUID or a fixed name.
- App icons (`appindicator-:1.102@/org/ayatana/NotificationItem/discord1`): the bus name and often a PID change every time, so the key is `app:` plus a slug of the accessible name (the app's tray title or ID), falling back to the last path segment without trailing digits.
- Duplicates get `#2`, `#3`… (`uniqueKeys()`).

## Layout plan

`planLayout(keys, order, states, defaultState)` is pure and unit-tested. Icons missing from `item-order` (new ones) come first in their current panel order, the rest follow the saved order. Each key's state is `item-states[key]`, or `default-state` when unset.

`_arrange()` then places each icon right after the previous one in its target box (`set_child_above_sibling`), so other children and earlier moves can't shift the target index.

## Known icons

After each arrange the shell merges the present icons (key, display name, icon string) into the `known-items` JSON (`mergeKnown()`), marking missing ones `present: false` instead of dropping them. The preferences window reads this list and listens for changes; it is the only way prefs learns what is in the top bar, since it runs in another process. The icon string is the first `St.Icon`'s `gicon.to_string()` or `icon_name`; pixmap icons have none and prefs shows a generic icon.

## Expanding and collapsing

- `Drawer.open()` measures its natural width, eases from its current width to that width (`EASE_OUT_QUINT`, 300 ms) while each icon fades and slides in, nearest the arrow first (35 ms apart). At the end it goes back to natural width so icons that grow later get room.
- `Drawer.close()` eases the width to 0 and hides. Interrupting either direction starts from the current width, so quick clicks never jump.
- The arrow rotates 180° with `EASE_OUT_BACK` and gets the `:checked` pseudo-class while open.
- `ease()` follows GNOME's Animations setting, so there's nothing extra to do for reduced motion.
- `CollapseTimer` starts when the drawer opens (unless Keep Open or auto-collapse is off). Hover changes and menu open/close `poke()` it; on expiry it asks `isBusy()` (pointer on arrow or drawer, arrow menu or a drawer icon's menu open) and waits a full delay again if so.

## The arrow button

`TrayButton` is a `PanelMenu.Button` created with `dontCreateMenu`, because the stock button toggles its menu on every press. A `Clutter.ClickGesture` handles left click and touch (toggle) and right click (our own `PopupMenu`, registered with `Main.panel.menuManager`). A `Clutter.KeyController` handles Enter and Space.

## Lifecycle

`enable()` creates the `TrayManager`; `disable()` destroys it. `TrayManager.destroy()`:

1. removes every GLib source (idle arrange, hover delay, collapse timer) and stops the timer,
2. disconnects settings, box, button and per-indicator signals (`disconnectObject`),
3. moves every icon from the vault and drawer back into the right box, visible, with animation state reset,
4. destroys the vault, drawer and button.
