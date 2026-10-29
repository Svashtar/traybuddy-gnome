# Privacy

TrayBuddy runs entirely on your computer.

## Network

TrayBuddy makes **no network connections**. It has no telemetry and no servers. The links on the About page open in your browser only when you click them.

## What is stored

Everything lives in your GNOME settings (dconf) under `/org/gnome/shell/extensions/traybuddy/`:

| Key | Contents |
|---|---|
| `known-items` | The name and icon of every top-bar icon TrayBuddy has seen, and whether it is in the top bar now. This lets the settings window list icons whose app isn't running. |
| `item-order`, `item-states`, `item-names` | Your order, the state of each icon and any names you gave icons. |
| Behaviour keys | Auto-collapse, delay, open on hover, background style, state of new icons. |

Icon names come from the app's `.desktop` file or the extension's metadata, falling back to the name the icon gives itself. To find an app icon's `.desktop` file, the shell asks D-Bus which process owns the icon and reads that process's `/proc/<pid>/cgroup` and `/proc/<pid>/cmdline`; nothing is stored apart from the resulting name and icon. Forget an icon with **⋯ → Forget** on the **Icons** page, or reset everything with **About → Reset All Settings…**.

To remove everything TrayBuddy stored:

```sh
dconf reset -f /org/gnome/shell/extensions/traybuddy/
```

## Debug info

**About → Copy Debug Info** copies a report to the clipboard, only when you click it. It contains:

- TrayBuddy, GNOME Shell and GJS versions, your OS name and session type (Wayland or X11)
- your behaviour settings
- whether the AppIndicator and Dash to Panel extensions are enabled
- **how many** app icons are shown, collapsible or hidden. App names are never included.
- the IDs of icons added by other extensions (usually the extension's UUID, such as `lightsbuddy@svashta.com`) and their state

Nothing is sent anywhere; you decide what to paste into a bug report.

## Settings backups

**About → Export Settings…** writes icon states, order and behaviour settings to a JSON file you choose. The list of known icons is not included.
