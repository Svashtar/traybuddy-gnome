// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Gio from 'gi://Gio';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {TrayManager} from './ui/trayManager.js';

export default class TrayBuddyExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._manager = new TrayManager(this._settings, {
            gicon: Gio.icon_new_for_string(`${this.path}/icons/traybuddy-chevron-symbolic.svg`),
            openPreferences: () => this.openPreferences(),
        });
    }

    disable() {
        this._manager?.destroy();
        this._manager = null;
        this._settings = null;
    }
}
