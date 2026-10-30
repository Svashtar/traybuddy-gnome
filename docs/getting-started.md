<img src="../src/icons/traybuddy.svg" alt="" width="48" align="right">

# Getting started

This guide walks you through setting up TrayBuddy after installing it. For installation, see the [README](../README.md#installation).

## 1. Enable the extension

After installing, log out and back in, then enable TrayBuddy in the Extensions app or with:

```sh
gnome-extensions enable traybuddy@svashta.com
```

Nothing changes in the top bar yet: every icon starts as **Shown**. The arrow appears once at least one icon is **Collapsible**.

> If you use Lilypad or another extension that reorders or hides top-bar icons, disable it first.

## 2. Open the settings

Open the Extensions app → TrayBuddy → **Settings**. Once the arrow is in the top bar, you can also right-click it → **Settings**.

The **Icons** page lists every icon TrayBuddy has seen, with a preview of the right side of the top bar at the top.

## 3. Choose a state for each icon

The **Icons** page lists running icons in three groups, one per state, and each row has three buttons to move it to another one:

| State | What it does |
|---|---|
| **Shown** | Always in the top bar, to the right of the arrow. |
| **Collapsible** | Tucked away behind the arrow. Click the arrow to slide these icons out. |
| **Hidden** | Never shown. The icon's app or extension keeps running; only the icon is out of sight. |

Changes apply at once, with no need to log out.

App icons are listed under the app's own name and icon, taken from its `.desktop` file, so you see *LocalSend* rather than `org.localsend.localsend_app`. To call an icon something else, open its **⋯** menu and choose **Rename…**; leave the name empty to go back to the app's name.

Icons that aren't in the top bar right now (for example because their app is closed) are folded away under **Not Running** at the bottom. You can still set them up, so they land in the right place next time the app starts. **⋯ → Forget** removes such an icon.

Under **New Icons**, choose whether icons TrayBuddy hasn't seen before start as *Shown* (the default) or *Collapsible*.

## 4. Change the order

Drag an icon by its handle (⋮⋮) and drop it above or below another one. Each group is in top-bar order, left to right: collapsible icons appear in the pill in this order, shown icons next to the arrow in this order. Dropping an icon into another group also changes its state; an empty group shows a *Drag icons here* row to drop onto.

## 5. Using the arrow

- **Click** the arrow (or tap it, or focus it with the keyboard and press Enter or Space) to open or close the drawer. The arrow turns to show which way it will go.
- **Right-click** it for **Keep Open**, which keeps the drawer open until you close it, and **Settings**.
- The drawer **collapses by itself** after a few seconds without use. The timer waits while the pointer is over the icons or one of their menus is open.

## 6. Behaviour settings

On the **Behaviour** page:

| Setting | Default | What it does |
|---|---|---|
| Collapse Automatically | On | Turn off to keep the drawer open until you click the arrow again. |
| Collapse After | 5 seconds | How long without use before the drawer closes (1–120 seconds). |
| Open on Hover | Off | Open the drawer when the pointer rests on the arrow for a moment. |
| Arrow Position | Right of Shown Icons | *Right of Shown Icons* puts the arrow and its drawer next to the system menu, after your shown icons. *Left of Shown Icons* puts them before. Either way the arrow stays put and the drawer opens to its left. |
| Background | Subtle | The pill behind revealed icons: *None*, *Subtle* or *Accent Colour* (follows your GNOME accent colour). |

Animations follow GNOME's own **Animations** setting (Settings → Accessibility). With animations off, the drawer opens and closes instantly.

## Backing up your settings

**About → Export Settings…** saves icon states, order and behaviour settings to a JSON file. **Import Settings…** restores them, for example on another computer.
