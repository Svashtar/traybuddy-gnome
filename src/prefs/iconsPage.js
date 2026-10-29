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

import {gettext as _, ngettext} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {getConfig, getKnown, getNames, setKnown} from '../lib/config.js';
import {forgetKey, moveKey, sortKeys, stateOf} from '../lib/items.js';

const FALLBACK_ICON = 'application-x-addon-symbolic';

// Themed icons can name an icon this theme lacks (often an app's own tray
// icon), which GTK draws as a broken image.
function gicon(item) {
    if (item.icon) {
        try {
            const icon = Gio.icon_new_for_string(item.icon);
            if (!(icon instanceof Gio.ThemedIcon) || Gtk.IconTheme.get_for_display(Gdk.Display.get_default()).has_gicon(icon))
                return icon;
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

const SETTINGS_KEYS = ['known-items', 'item-order', 'item-states', 'item-names', 'arrow-position'];

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

        // One group per state, so where each icon goes shows at a glance.
        const labels = stateLabels();
        this._groups = {};
        for (const state of ['shown', 'collapsible', 'never']) {
            const group = new Adw.PreferencesGroup({title: labels[state][0], description: `${labels[state][1]}.`});
            this._groups[state] = group;
            this.add(group);
        }
        this._groups.shown.description = _('Always in the top bar. Drag the handle to reorder or to move an icon to another group.');
        this._rows = new Map();

        // Icons whose app isn't running, out of the way until needed.
        this._absentGroup = new Adw.PreferencesGroup();
        this._absent = new Adw.ExpanderRow({title: _('Not Running')});
        this._absentGroup.add(this._absent);
        this.add(this._absentGroup);

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

        const ids = SETTINGS_KEYS.map(key => settings.connect(`changed::${key}`, () => this.refresh()));
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

    // Known icons in display order, with their current state and the name to show.
    _items() {
        const known = getKnown(this._settings);
        const {order, states, defaultState} = getConfig(this._settings);
        const names = getNames(this._settings);
        const byKey = new Map(known.map(i => [i.key, i]));
        return sortKeys(known.map(i => i.key), order).map(key => {
            const item = byKey.get(key);
            const appName = item.name ?? key;
            return {
                ...item,
                appName,
                name: names[key] || appName,
                renamed: Boolean(names[key]),
                state: stateOf(key, states, defaultState),
            };
        });
    }

    refresh() {
        // Rebuilding while a row is being dragged would drop the drag.
        if (this._dragging) {
            this._pending = true;
            return;
        }
        const items = this._items();
        for (const [state, group] of Object.entries(this._groups)) {
            const rows = items.filter(i => i.present && i.state === state).map(item => this._row(item, items));
            if (!rows.length)
                rows.push(this._placeholder(state, items));
            this._replaceRows(group, rows, row => group.add(row), row => group.remove(row));
        }

        const absent = items.filter(i => !i.present);
        this._replaceRows(this._absent, absent.map(item => this._row(item, items)),
                          row => this._absent.add_row(row), row => this._absent.remove(row));
        this._absent.subtitle = ngettext('%d icon, kept for when its app starts',
                                         '%d icons, kept for when their apps start', absent.length).format(absent.length);
        this._absentGroup.visible = absent.length > 0;

        if (!items.length) {
            const [empty] = this._rows.get(this._groups.shown);
            empty.title = _('No icons yet');
            empty.subtitle = _('Icons appear here once TrayBuddy is enabled and an app or extension adds one to the top bar.');
        }
        this._updatePreview(items);
    }

    _replaceRows(parent, rows, add, remove) {
        (this._rows.get(parent) ?? []).forEach(remove);
        rows.forEach(add);
        this._rows.set(parent, rows);
    }
    _updatePreview(items) {
        let child;
        while ((child = this._preview.get_first_child()))
            this._preview.remove(child);

        const image = item => new Gtk.Image({gicon: gicon(item), pixel_size: 16, tooltip_text: item.name});
        const collapsible = items.filter(i => i.present && i.state === 'collapsible');
        const shown = items.filter(i => i.present && i.state === 'shown');

        const group = new Gtk.Box({spacing: 4, margin_start: 6, margin_end: 6});
        if (collapsible.length) {
            const pill = new Gtk.Box({spacing: 10, css_classes: ['traybuddy-preview-pill']});
            collapsible.forEach(i => pill.append(image(i)));
            group.append(pill);
            group.append(new Gtk.Image({
                icon_name: 'traybuddy-chevron-symbolic',
                pixel_size: 16,
                css_classes: ['traybuddy-preview-chevron'],
            }));
        }
        const rest = new Gtk.Box({spacing: 10});
        shown.forEach(i => rest.append(image(i)));
        const system = new Gtk.Image({icon_name: 'system-shutdown-symbolic', pixel_size: 16, margin_start: 6,
                                      css_classes: ['dim-label'], tooltip_text: _('System menu')});

        const right = this._settings.get_string('arrow-position') !== 'left';
        for (const box of right ? [rest, group, system] : [group, rest, system])
            this._preview.append(box);
    }

    _row(item, items) {
        const labels = stateLabels();
        // One line each, so a long name can't squeeze the state buttons.
        const row = new Adw.ActionRow({
            title: GLib.markup_escape_text(item.name, -1),
            title_lines: 1,
            subtitle_lines: 1,
            tooltip_text: item.name,
        });
        if (item.renamed)
            row.subtitle = GLib.markup_escape_text(item.appName, -1);
        row.add_prefix(new Gtk.Image({gicon: gicon(item), pixel_size: 24}));
        if (item.present) {
            // add_prefix() puts each new prefix first, so the handle goes in last.
            row.add_prefix(new Gtk.Image({icon_name: 'list-drag-handle-symbolic', css_classes: ['dim-label']}));
        }

        const toggles = new Adw.ToggleGroup({valign: Gtk.Align.CENTER, css_classes: ['round']});
        for (const state of ['shown', 'collapsible', 'never'])
            toggles.add(new Adw.Toggle({name: state, label: labels[state][0], tooltip: labels[state][1]}));
        toggles.active_name = item.state;
        toggles.connect('notify::active-name', () => this._setState(item.key, toggles.active_name));
        row.add_suffix(toggles);
        row.add_suffix(this._menuButton(row, item));

        if (item.present)
            this._addDragAndDrop(row, item, items);
        return row;
    }

    _menuButton(row, item) {
        const actions = new Gio.SimpleActionGroup();
        const rename = new Gio.SimpleAction({name: 'rename'});
        rename.connect('activate', () => this._rename(item));
        actions.add_action(rename);
        const forget = new Gio.SimpleAction({name: 'forget'});
        forget.connect('activate', () => this._forget(item.key));
        actions.add_action(forget);
        row.insert_action_group('icon', actions);

        const menu = new Gio.Menu();
        menu.append(_('Rename…'), 'icon.rename');
        // A running icon would come straight back.
        if (!item.present)
            menu.append(_('Forget'), 'icon.forget');
        return new Gtk.MenuButton({
            icon_name: 'view-more-symbolic',
            tooltip_text: _('More'),
            menu_model: menu,
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });
    }

    // Drop target for a group with no icons in it.
    _placeholder(state, items) {
        const row = new Adw.ActionRow({title: _('Drag icons here'), css_classes: ['dim-label']});
        const target = Gtk.DropTarget.new(GObject.TYPE_STRING, Gdk.DragAction.MOVE);
        target.connect('enter', () => row.add_css_class('traybuddy-drop-into'));
        target.connect('leave', () => row.remove_css_class('traybuddy-drop-into'));
        target.connect('drop', (_t, dragged) => {
            row.remove_css_class('traybuddy-drop-into');
            if (!items.some(i => i.key === dragged))
                return false;
            this._setState(dragged, state);
            return true;
        });
        row.add_controller(target);
        return row;
    }

    _setState(key, state) {
        const states = getConfig(this._settings).states;
        if (states[key] === state)
            return;
        states[key] = state;
        this._settings.set_value('item-states', new GLib.Variant('a{ss}', states));
    }

    _setName(key, name) {
        const names = getNames(this._settings);
        if (name)
            names[key] = name;
        else
            delete names[key];
        this._settings.set_value('item-names', new GLib.Variant('a{ss}', names));
    }

    _rename(item) {
        const entry = new Gtk.Entry({
            text: item.renamed ? item.name : '',
            placeholder_text: item.appName,
            activates_default: true,
        });
        const dialog = new Adw.AlertDialog({
            heading: _('Rename Icon'),
            body: _('The name used in these settings. Leave it empty to use the app’s own name.'),
            extra_child: entry,
            default_response: 'rename',
            close_response: 'cancel',
        });
        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('rename', _('Rename'));
        dialog.set_response_appearance('rename', Adw.ResponseAppearance.SUGGESTED);
        dialog.connect('response', (_d, response) => {
            if (response === 'rename')
                this._setName(item.key, entry.text.trim());
        });
        dialog.present(this._window);
        entry.grab_focus();
    }

    _forget(key) {
        const {order, states} = getConfig(this._settings);
        const next = forgetKey(key, {known: getKnown(this._settings), order, states, names: getNames(this._settings)});
        this._settings.set_strv('item-order', next.order);
        this._settings.set_value('item-states', new GLib.Variant('a{ss}', next.states));
        this._settings.set_value('item-names', new GLib.Variant('a{ss}', next.names));
        setKnown(this._settings, next.known);
    }

    _addDragAndDrop(row, item, items) {
        const source = new Gtk.DragSource({actions: Gdk.DragAction.MOVE});
        source.connect('prepare', () => Gdk.ContentProvider.new_for_value(item.key));
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
            const order = moveKey(items.map(i => i.key), dragged, item.key, y > row.get_height() / 2);
            this._settings.set_strv('item-order', order);
            // Dropping next to an icon in another group moves it into that group.
            this._setState(dragged, item.state);
            return true;
        });
        row.add_controller(target);
    }
});
