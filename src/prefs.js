// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import System from 'system';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';

import {getConfig, getKnown} from './lib/config.js';
import {formatDebugInfo, formatGjsVersion} from './lib/debugInfo.js';
import {stateOf} from './lib/items.js';
import {AboutPage} from './prefs/aboutPage.js';
import {GeneralPage} from './prefs/generalPage.js';
import {IconsPage} from './prefs/iconsPage.js';

// The preview on the Icons page and the drop markers while dragging rows.
const CSS = `
.traybuddy-preview-bar { background-color: alpha(black, 0.85); border-radius: 12px; padding: 6px 10px; color: white; }
.traybuddy-preview-pill { background-color: alpha(white, 0.1); border-radius: 999px; padding: 4px 10px; }
.traybuddy-preview-chevron { transform: rotate(180deg); margin: 0 4px; }
row.traybuddy-drop-above { box-shadow: inset 0 2px 0 0 var(--accent-bg-color); }
row.traybuddy-drop-below { box-shadow: inset 0 -2px 0 0 var(--accent-bg-color); }
row.traybuddy-dragging { opacity: 0.5; }
row.traybuddy-drop-into { box-shadow: inset 0 0 0 2px var(--accent-bg-color); }
`;

export default class TrayBuddyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const display = Gdk.Display.get_default();
        Gtk.IconTheme.get_for_display(display).add_search_path(`${this.path}/icons`);
        const provider = new Gtk.CssProvider();
        provider.load_from_string(CSS);
        Gtk.StyleContext.add_provider_for_display(display, provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        const settings = this.getSettings();
        window.set_default_size(720, 760);
        window.search_enabled = true;

        window.add(new IconsPage({window, settings}));
        window.add(new GeneralPage({window, settings}));
        window.add(new AboutPage({
            window,
            settings,
            metadata: this.metadata,
            path: this.path,
            getDebugInfo: () => this._debugInfo(settings),
        }));

        window.connect('close-request', () => {
            Gtk.StyleContext.remove_provider_for_display(display, provider);
            return false;
        });
    }

    _debugInfo(settings) {
        const {states, defaultState} = getConfig(settings);
        const enabled = new Gio.Settings({schema_id: 'org.gnome.shell'}).get_strv('enabled-extensions');
        return Promise.resolve(formatDebugInfo({
            extensionVersion: this.metadata['version-name'],
            commit: this.metadata.commit,
            shellVersion: Config.PACKAGE_VERSION,
            gjsVersion: formatGjsVersion(System.version),
            os: GLib.get_os_info('PRETTY_NAME') ?? 'unknown',
            sessionType: GLib.getenv('XDG_SESSION_TYPE') ?? 'unknown',
            settings: {
                autoCollapse: settings.get_boolean('auto-collapse'),
                collapseDelay: settings.get_uint('collapse-delay'),
                openOnHover: settings.get_boolean('open-on-hover'),
                pillStyle: settings.get_string('pill-style'),
                arrowPosition: settings.get_string('arrow-position'),
                defaultState,
            },
            extensions: {
                appIndicator: enabled.includes('appindicatorsupport@rgcjonas.gmail.com'),
                dashToPanel: enabled.includes('dash-to-panel@jderose9.github.com'),
            },
            items: getKnown(settings).map(i => ({key: i.key, state: stateOf(i.key, states, defaultState), present: i.present})),
        }));
    }
}
