// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// Collapses the drawer after a period without use. Pure: the shell passes
// GLib-backed timers, tests pass fake ones.

export class CollapseTimer {
    // timers: {setTimeout(fn, ms) → id, clearTimeout(id)}
    // isBusy: () => boolean, true while the pointer is on the tray or a menu is open
    constructor({timers, isBusy, onExpire}) {
        this._timers = timers;
        this._isBusy = isBusy;
        this._onExpire = onExpire;
        this._delay = null;
        this._id = null;
    }

    get running() {
        return this._delay !== null;
    }

    start(delayMs) {
        this._delay = delayMs;
        this.poke();
    }

    // Activity: count the delay again from now.
    poke() {
        if (this._delay === null)
            return;
        this._clear();
        this._id = this._timers.setTimeout(() => this._fire(), this._delay);
    }

    stop() {
        this._clear();
        this._delay = null;
    }

    _fire() {
        this._id = null;
        // Still in use: wait a full delay again rather than collapsing under
        // the pointer or an open menu.
        if (this._isBusy()) {
            this.poke();
            return;
        }
        this._delay = null;
        this._onExpire();
    }

    _clear() {
        if (this._id !== null)
            this._timers.clearTimeout(this._id);
        this._id = null;
    }
}
