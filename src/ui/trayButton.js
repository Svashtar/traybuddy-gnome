// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Atk from 'gi://Atk';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const ROTATE_MS = 260;

// The arrow next to the tucked-away icons. Left click (or tap, Enter, Space)
// toggles the drawer; right click opens a small menu.
//
// Created without a menu of its own: PanelMenu.Button would then toggle that
// menu on every click. The right-click menu is ours and is registered with
// the panel's menu manager like any other.
export const TrayButton = GObject.registerClass({
    Signals: {
        'toggle': {},
        'keep-open': {param_types: [GObject.TYPE_BOOLEAN]},
    },
}, class TrayBuddyButton extends PanelMenu.Button {
    _init({gicon, openPreferences}) {
        super._init(0.5, _('TrayBuddy'), true);
        this.add_style_class_name('traybuddy-button');
        this.accessible_role = Atk.Role.TOGGLE_BUTTON;

        this._icon = new St.Icon({
            gicon,
            style_class: 'system-status-icon traybuddy-chevron',
            pivot_point: new Graphene.Point({x: 0.5, y: 0.5}),
        });
        this.add_child(this._icon);

        const click = new Clutter.ClickGesture({recognize_on_press: true});
        click.connect('recognize', () => {
            if (click.get_button() === Clutter.BUTTON_SECONDARY)
                this._menu.toggle();
            else
                this.emit('toggle');
        });
        this.add_action(click);

        const keys = new Clutter.KeyController();
        keys.connect('key-press', () => {
            const [, symbol] = keys.get_key();
            if (![Clutter.KEY_Return, Clutter.KEY_KP_Enter, Clutter.KEY_space].includes(symbol))
                return Clutter.EVENT_PROPAGATE;
            this.emit('toggle');
            return Clutter.EVENT_STOP;
        });
        this.add_action(keys);

        this._menu = new PopupMenu.PopupMenu(this, 0.5, St.Side.TOP);
        this._menu.actor.add_style_class_name('panel-menu');
        this._menu.connect('open-state-changed', (_m, open) => {
            if (open)
                this.add_style_pseudo_class('active');
            else
                this.remove_style_pseudo_class('active');
        });
        Main.uiGroup.add_child(this._menu.actor);
        this._menu.actor.hide();
        Main.panel.menuManager.addMenu(this._menu);

        this._keepOpen = new PopupMenu.PopupSwitchMenuItem(_('Keep Open'), false);
        this._keepOpen.connect('toggled', (_item, state) => this.emit('keep-open', state));
        this._menu.addMenuItem(this._keepOpen);
        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._menu.addAction(_('Settings'), openPreferences);

        this.connect('destroy', () => {
            this._menu.destroy();
            this._menu = null;
        });
    }

    get menuOpen() {
        return this._menu.isOpen;
    }

    setExpanded(expanded) {
        if (expanded)
            this.add_style_pseudo_class('checked');
        else
            this.remove_style_pseudo_class('checked');
        this.accessible_name = expanded ? _('Hide tucked-away icons') : _('Show tucked-away icons');
        this._icon.ease({
            rotation_angle_z: expanded ? 180 : 0,
            duration: ROTATE_MS,
            mode: Clutter.AnimationMode.EASE_OUT_BACK,
        });
    }

    setKeepOpen(keepOpen) {
        this._keepOpen.setToggleState(keepOpen);
    }
});
