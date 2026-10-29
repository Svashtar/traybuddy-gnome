# Troubleshooting

Start here when something doesn't work. If none of this helps, please [open a bug report](https://github.com/Svashtar/traybuddy-gnome/issues/new/choose) and include the output of **Settings → About → Copy Debug Info** and any relevant [logs](#collecting-logs).

## The extension doesn't appear

- Check that it's enabled: `gnome-extensions info traybuddy@svashta.com` should show `State: ACTIVE`.
- After installing from a zip or from source, **log out and back in**. On Wayland, GNOME Shell only loads new extensions at login.
- Check your GNOME version with `gnome-shell --version`. GNOME Shell 51 or later is needed.
- If the state is `ERROR`, look at the [shell log](#collecting-logs) for the reason.

## There is no arrow in the top bar

The arrow only appears while at least one icon is **Collapsible** and that icon is currently visible. Set an icon to *Collapsible* on the **Icons** page.

Some icons hide themselves at times: app icons with nothing to report (for example a sync client that's idle), or extensions with nothing to show. When all collapsible icons are hidden like this, the arrow hides too.

## An app's icon isn't listed

- GNOME has no tray of its own. Apps such as Discord, Steam or Nextcloud need the **AppIndicator and KStatusNotifierItem Support** extension to show their icon.
- TrayBuddy only manages icons on the **right side** of the top bar. If AppIndicator's *Tray position* is set to the left or centre, those icons aren't managed.
- The icon must have appeared at least once while TrayBuddy was enabled.

## An icon shows up twice in the list

App icons are recognised by the app they belong to, found through its `.desktop` file. When TrayBuddy can't find the app (for example a script started from a terminal), it falls back to the name the icon gives itself, and that name can change between runs. Each new name is listed as a new icon; forget the old entry with **⋯ → Forget** under **Not Running**. When an app creates two tray icons, the second one gets `#2` added to its key.

After updating from a version that recognised every app icon by name, each app's settings move to its new entry the first time its icon appears. Entries left over from apps that renamed their icon stay under **Not Running** until you forget them.

## Icons jump around or flicker

Another extension is probably reordering the top bar too. Disable other top-bar organisers (Lilypad, Top Bar Organizer, Just Perfection's icon order settings) and log out and back in.

## The drawer closes while I'm using it

The timer waits while the pointer is over the arrow or the icons, and while one of their menus is open. Some apps open their own windows rather than a menu; those don't count. Increase **Collapse After**, or right-click the arrow → **Keep Open**.

## Icons are gone after disabling TrayBuddy

Disabling TrayBuddy puts every icon back in the top bar. If one is missing, the app or extension that owns it may have hidden it itself. Log out and back in; if it's still missing, please file a bug with the [shell log](#collecting-logs).

## Collecting logs

Shell side (the arrow, the drawer, moving icons):

```sh
journalctl -f -o cat /usr/bin/gnome-shell
```

Preferences window:

```sh
journalctl -f -o cat /usr/bin/gjs
```

Errors from the settings window are prefixed with `traybuddy:`. Reproduce the problem while the command runs, then paste the lines around it into the bug report.
