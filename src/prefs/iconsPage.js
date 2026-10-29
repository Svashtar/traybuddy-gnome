// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {getConfig, getKnown, setKnown} from '../lib/config.js';
import {forgetKey, moveKey, sortKeys, stateOf} from '../lib/items.js';

const FALLBACK_ICON = 'application-x-addon-symbolic';

function gicon(item) {
    if (item.icon) {
        try {
            return Gio.icon_new_for_string(item.icon);
        } catch {}
    }
    return Gio.ThemedIcon.new(FALLBACK_ICON);
}

function stateLabels() {
    return {
        shown: [_('Shown'), _('Always in the top bar')],
        collapsible: [_('Collapsible'), _('Behind the arrow until you open it')],
        never: [_('Hidden'), _('Never shown')],
    };
}

export const IconsPage = GObject.registerClass(
class TrayBuddyIconsPage extends Adw.PreferencesPage {
    _init({window, settings}) {
        super._init({title: _('Icons'), icon_name: 'view-app-grid-symbolic', name: 'icons'});
        this._window = window;
        this._settings = settings;

        const previewGroup = new Adw.PreferencesGroup({
            title: _('Preview'),
            description: _('How the right side of the top bar looks with the arrow open.'),
        });
        this._preview = new Gtk.Box({
            spacing: 4,
            halign: Gtk.Align.END,
            css_classes: ['traybuddy-preview'],
        });
        const frame = new Gtk.Box({css_classes: ['traybuddy-preview-bar']});
        frame.append(new Gtk.Box({hexpand: true}));
        frame.append(this._preview);
        previewGroup.add(frame);
        this.add(previewGroup);

        this._group = new Adw.PreferencesGroup({
            title: _('Top Bar Icons'),
            description: _('Choose where each icon goes. Drag the handle to reorder: icons appear left to right in this order.'),
        });
        this.add(this._group);
        this._rows = [];

        const newGroup = new Adw.PreferencesGroup({title: _('New Icons')});
        const defaultRow = new Adw.ComboRow({
            title: _('New Icons Are'),
            subtitle: _('For icons TrayBuddy hasn’t seen before'),
            model: Gtk.StringList.new([_('Shown'), _('Collapsible')]),
        });
        const syncDefault = () => {
            defaultRow.selected = settings.get_string('default-state') === 'collapsible' ? 1 : 0;
        };
        syncDefault();
        defaultRow.connect('notify::selected', () => {
            settings.set_string('default-state', defaultRow.selected === 1 ? 'collapsible' : 'shown');
        });
        newGroup.add(defaultRow);
        this.add(newGroup);

        const ids = ['known-items', 'item-order', 'item-states'].map(key =>
            settings.connect(`changed::${key}`, () => this.refresh()));
        ids.push(settings.connect('changed::default-state', () => {
            syncDefault();
            this.refresh();
        }));
        window.connect('close-request', () => {
            ids.forEach(id => settings.disconnect(id));
            return false;
        });

        this.refresh();
    }

    // Known icons in display order, with their current state.
    _items() {
        const known = getKnown(this._settings);
        const {order, states, defaultState} = getConfig(this._settings);
        const byKey = new Map(known.map(i => [i.key, i]));
        return sortKeys(known.map(i => i.key), order).map(key => ({
            ...byKey.get(key),
            state: stateOf(key, states, defaultState),
        }));
    }

    refresh() {
        // Rebuilding while a row is being dragged would drop the drag.
        if (this._dragging) {
            this._pending = true;
            return;
        }
        const items = this._items();
        for (const row of this._rows)
            this._group.remove(row);
        this._rows = items.map(item => this._row(item, items));
        for (const row of this._rows)
            this._group.add(row);
        if (!items.length) {
            const empty = new Adw.ActionRow({
                title: _('No icons yet'),
                subtitle: _('Icons appear here once TrayBuddy is enabled and an app or extension adds one to the top bar.'),
            });
            this._rows.push(empty);
            this._group.add(empty);
        }
        this._updatePreview(items);
    }

    _updatePreview(items) {
        let child;
        while ((child = this._preview.get_first_child()))
            this._preview.remove(child);

        const image = item => new Gtk.Image({gicon: gicon(item), pixel_size: 16, tooltip_text: item.name});
        const collapsible = items.filter(i => i.present && i.state === 'collapsible');
        const shown = items.filter(i => i.present && i.state === 'shown');

        if (collapsible.length) {
            const pill = new Gtk.Box({spacing: 10, css_classes: ['traybuddy-preview-pill']});
            collapsible.forEach(i => pill.append(image(i)));
            this._preview.append(pill);
            this._preview.append(new Gtk.Image({
                icon_name: 'traybuddy-chevron-symbolic',
                pixel_size: 14,
                css_classes: ['traybuddy-preview-chevron'],
            }));
        }
        const rest = new Gtk.Box({spacing: 10, margin_start: 6});
        shown.forEach(i => rest.append(image(i)));
        rest.append(new Gtk.Image({icon_name: 'system-shutdown-symbolic', pixel_size: 16, css_classes: ['dim-label'],
                                   tooltip_text: _('System menu')}));
        this._preview.append(rest);
    }

    _row(item, items) {
        const labels = stateLabels();
        const row = new Adw.ActionRow({
            title: GLib.markup_escape_text(item.name ?? item.key, -1),
            subtitle: item.present ? labels[item.state][1] : _('Not running'),
        });
        // add_prefix() puts each new prefix first, so the handle goes in last.
        row.add_prefix(new Gtk.Image({gicon: gicon(item), pixel_size: 24}));
        row.add_prefix(new Gtk.Image({icon_name: 'list-drag-handle-symbolic', css_classes: ['dim-label']}));

        const toggles = new Adw.ToggleGroup({valign: Gtk.Align.CENTER, css_classes: ['round']});
        for (const state of ['shown', 'collapsible', 'never'])
            toggles.add(new Adw.Toggle({name: state, label: labels[state][0], tooltip: labels[state][1]}));
        toggles.active_name = item.state;
        toggles.connect('notify::active-name', () => this._setState(item.key, toggles.active_name));
        row.add_suffix(toggles);

        if (!item.present) {
            const forget = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                tooltip_text: _('Forget this icon'),
                valign: Gtk.Align.CENTER,
                css_classes: ['flat'],
            });
            forget.connect('clicked', () => this._forget(item.key));
            row.add_suffix(forget);
        }

        this._addDragAndDrop(row, item.key, items);
        return row;
    }

    _setState(key, state) {
        const states = getConfig(this._settings).states;
        if (states[key] === state)
            return;
        states[key] = state;
        this._settings.set_value('item-states', new GLib.Variant('a{ss}', states));
    }

    _forget(key) {
        const {order, states} = getConfig(this._settings);
        const next = forgetKey(key, {known: getKnown(this._settings), order, states});
        this._settings.set_strv('item-order', next.order);
        this._settings.set_value('item-states', new GLib.Variant('a{ss}', next.states));
        setKnown(this._settings, next.known);
    }

    _addDragAndDrop(row, key, items) {
        const source = new Gtk.DragSource({actions: Gdk.DragAction.MOVE});
        source.connect('prepare', () => Gdk.ContentProvider.new_for_value(key));
        source.connect('drag-begin', () => {
            this._dragging = true;
            const paintable = new Gtk.WidgetPaintable({widget: row});
            source.set_icon(paintable, row.get_width() / 2, row.get_height() / 2);
            row.add_css_class('traybuddy-dragging');
        });
        source.connect('drag-end', () => {
            row.remove_css_class('traybuddy-dragging');
            this._dragging = false;
            if (this._pending) {
                this._pending = false;
                GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    this.refresh();
                    return GLib.SOURCE_REMOVE;
                });
            }
        });
        row.add_controller(source);

        const target = Gtk.DropTarget.new(GObject.TYPE_STRING, Gdk.DragAction.MOVE);
        target.connect('motion', (_t, _x, y) => {
            const after = y > row.get_height() / 2;
            row.remove_css_class(after ? 'traybuddy-drop-above' : 'traybuddy-drop-below');
            row.add_css_class(after ? 'traybuddy-drop-below' : 'traybuddy-drop-above');
            return Gdk.DragAction.MOVE;
        });
        target.connect('leave', () => {
            row.remove_css_class('traybuddy-drop-above');
            row.remove_css_class('traybuddy-drop-below');
        });
        target.connect('drop', (_t, dragged, _x, y) => {
            row.remove_css_class('traybuddy-drop-above');
            row.remove_css_class('traybuddy-drop-below');
            // Save the full order, so icons that aren't running keep their place too.
            const order = moveKey(items.map(i => i.key), dragged, key, y > row.get_height() / 2);
            this._settings.set_strv('item-order', order);
            return true;
        });
        row.add_controller(target);
    }
});
