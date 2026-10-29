// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const PILL_STYLES = ['none', 'subtle', 'accent'];
const ARROW_POSITIONS = ['right', 'left'];

export const GeneralPage = GObject.registerClass(
class TrayBuddyGeneralPage extends Adw.PreferencesPage {
    _init({window, settings}) {
        super._init({title: _('Behaviour'), icon_name: 'preferences-system-symbolic', name: 'general'});

        const collapse = new Adw.PreferencesGroup({
            title: _('Collapsing'),
            description: _('Collapsible icons tuck away again once you stop using them. The timer pauses while the pointer is on them or one of their menus is open.'),
        });
        const auto = new Adw.SwitchRow({title: _('Collapse Automatically')});
        settings.bind('auto-collapse', auto, 'active', Gio.SettingsBindFlags.DEFAULT);
        const delay = new Adw.SpinRow({
            title: _('Collapse After'),
            subtitle: _('Seconds without use'),
            adjustment: new Gtk.Adjustment({lower: 1, upper: 120, step_increment: 1, page_increment: 5}),
        });
        settings.bind('collapse-delay', delay, 'value', Gio.SettingsBindFlags.DEFAULT);
        auto.bind_property('active', delay, 'sensitive', GObject.BindingFlags.SYNC_CREATE);
        collapse.add(auto);
        collapse.add(delay);
        this.add(collapse);

        const opening = new Adw.PreferencesGroup({
            title: _('Opening'),
            description: _('Click the arrow to open or close. Right-click it for Keep Open and Settings.'),
        });
        const hover = new Adw.SwitchRow({
            title: _('Open on Hover'),
            subtitle: _('Open when the pointer rests on the arrow'),
        });
        settings.bind('open-on-hover', hover, 'active', Gio.SettingsBindFlags.DEFAULT);
        opening.add(hover);
        this.add(opening);

        const look = new Adw.PreferencesGroup({title: _('Appearance')});
        const pill = new Adw.ComboRow({
            title: _('Background'),
            subtitle: _('Behind the revealed icons'),
            model: Gtk.StringList.new([_('None'), _('Subtle'), _('Accent Colour')]),
        });
        const syncPill = () => {
            pill.selected = Math.max(0, PILL_STYLES.indexOf(settings.get_string('pill-style')));
        };
        syncPill();
        pill.connect('notify::selected', () => settings.set_string('pill-style', PILL_STYLES[pill.selected]));
        const arrow = new Adw.ComboRow({
            title: _('Arrow Position'),
            subtitle: _('Next to the system menu, or before the shown icons'),
            model: Gtk.StringList.new([_('Right of Shown Icons'), _('Left of Shown Icons')]),
        });
        const syncArrow = () => {
            arrow.selected = Math.max(0, ARROW_POSITIONS.indexOf(settings.get_string('arrow-position')));
        };
        syncArrow();
        arrow.connect('notify::selected', () => settings.set_string('arrow-position', ARROW_POSITIONS[arrow.selected]));

        const ids = [
            settings.connect('changed::pill-style', syncPill),
            settings.connect('changed::arrow-position', syncArrow),
        ];
        window.connect('close-request', () => {
            ids.forEach(id => settings.disconnect(id));
            return false;
        });
        look.add(arrow);
        look.add(pill);
        this.add(look);
    }
});
