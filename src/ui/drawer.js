// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

const OPEN_MS = 300;
const CLOSE_MS = 220;
const STAGGER_MS = 35;
const SLIDE_PX = 14;

export const PILL_STYLES = ['none', 'subtle', 'accent'];

// The pill that holds the collapsible icons. Opening grows it from the arrow
// outwards while the icons fade and slide in one after another; closing
// shrinks it back. Animations follow the desktop's "Animations" setting,
// because ease() honours it.
export const Drawer = GObject.registerClass(
class TrayBuddyDrawer extends St.BoxLayout {
    _init() {
        super._init({
            style_class: 'traybuddy-drawer',
            reactive: true,
            track_hover: true,
            clip_to_allocation: true,
            visible: false,
            opacity: 0,
        });
        this._expanded = false;
    }

    get expanded() {
        return this._expanded;
    }

    setPillStyle(style) {
        for (const s of PILL_STYLES)
            this.remove_style_class_name(`traybuddy-pill-${s}`);
        this.add_style_class_name(`traybuddy-pill-${PILL_STYLES.includes(style) ? style : 'subtle'}`);
    }

    open() {
        if (this._expanded)
            return;
        this._expanded = true;

        const from = this.visible ? this.width : 0;
        this.remove_all_transitions();
        this.show();
        this.set_width(-1);
        const [, natural] = this.get_preferred_width(-1);
        this.set_width(from);

        this.ease({
            width: natural,
            opacity: 255,
            duration: OPEN_MS,
            mode: Clutter.AnimationMode.EASE_OUT_QUINT,
            // Back to natural size, so icons that change width or appear
            // later get room.
            onComplete: () => this.set_width(-1),
        });

        // The icon nearest the arrow comes in first.
        const children = this.get_children().filter(c => c.visible).reverse();
        children.forEach((child, i) => {
            child.remove_all_transitions();
            child.opacity = 0;
            child.translation_x = SLIDE_PX;
            child.ease({
                opacity: 255,
                translation_x: 0,
                delay: i * STAGGER_MS,
                duration: OPEN_MS,
                mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
            });
        });
    }

    close({animate = true} = {}) {
        if (!this._expanded)
            return;
        this._expanded = false;

        const from = this.width;
        this.remove_all_transitions();
        for (const child of this.get_children())
            resetChild(child);
        if (!animate) {
            this.opacity = 0;
            this.hide();
            return;
        }
        this.set_width(from);
        this.ease({
            width: 0,
            opacity: 0,
            duration: CLOSE_MS,
            mode: Clutter.AnimationMode.EASE_IN_OUT_CUBIC,
            onComplete: () => this.hide(),
        });
    }
});

// Undoes the open animation on an icon, also when it leaves the drawer.
export function resetChild(child) {
    child.remove_all_transitions();
    child.opacity = 255;
    child.translation_x = 0;
}
