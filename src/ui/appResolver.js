// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GioUnix from 'gi://GioUnix';
import Shell from 'gi://Shell';

import {appForProgram, appIdsFromCgroup, indicatorSource, programFromCmdline} from '../lib/apps.js';

// A stuck tray app shouldn't keep its icon out of the top bar for long.
const DBUS_TIMEOUT_MS = 1000;

function describe(id, name, icon) {
    return {id, name, icon: icon?.to_string() ?? null};
}

// Finds the installed app behind each AppIndicator icon: asks D-Bus which
// process owns the icon, then reads that process's systemd scope, which is
// named after the app's .desktop file. Results are cached per role, and a
// role's bus name is new each time the app starts.
export class AppResolver {
    constructor(onResolved) {
        this._onResolved = onResolved;
        this._cache = new Map();
        this._cancellable = new Gio.Cancellable();
    }

    destroy() {
        this._cancellable.cancel();
        this._cache.clear();
        this._onResolved = null;
    }

    // {id, name, icon} for the role's app; null when there is none or the role
    // isn't an app icon; undefined while still looking (onResolved fires once known).
    lookup(role) {
        if (this._cache.has(role))
            return this._cache.get(role);
        const source = indicatorSource(role);
        if (!source) {
            this._cache.set(role, null);
            return null;
        }
        this._cache.set(role, undefined);
        this._resolve(source).then(app => this._settle(role, app), e => {
            // Cancelled means destroy() ran; any other failure just means no app.
            if (!e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                this._settle(role, null);
        });
        return undefined;
    }

    _settle(role, app) {
        this._cache.set(role, app);
        this._onResolved();
    }

    // Forgets roles that left the panel; their bus names won't come back.
    prune(roles) {
        for (const [role, app] of this._cache) {
            if (app !== undefined && !roles.has(role))
                this._cache.delete(role);
        }
    }

    async _resolve(source) {
        const pid = source.pid ?? await this._pidOf(source.busName);
        const ids = appIdsFromCgroup(await this._read(`/proc/${pid}/cgroup`));
        const appSystem = Shell.AppSystem.get_default();
        for (const id of ids) {
            const app = appSystem.lookup_app(`${id}.desktop`) ?? appSystem.lookup_desktop_wmclass(id);
            if (app)
                return describe(app.get_id(), app.get_name(), app.get_icon());
        }

        // Autostarted apps run in a scope named after their autostart file, so
        // look for the installed app that runs the same program.
        const program = programFromCmdline(await this._read(`/proc/${pid}/cmdline`));
        const installed = appSystem.get_installed()
            .filter(info => info.should_show())
            .map(info => ({id: info.get_id(), executable: info.get_executable()}));
        const match = appForProgram(installed, program);
        const app = match ? appSystem.lookup_app(match.id) : null;
        if (app)
            return describe(app.get_id(), app.get_name(), app.get_icon());

        for (const id of ids) {
            for (const dir of [GLib.get_user_config_dir(), ...GLib.get_system_config_dirs()]) {
                const info = GioUnix.DesktopAppInfo.new_from_filename(`${dir}/autostart/${id}.desktop`);
                if (info)
                    return describe(`${id}.desktop`, info.get_name(), info.get_icon());
            }
        }
        return null;
    }

    _pidOf(busName) {
        return new Promise((resolve, reject) => {
            Gio.DBus.session.call(
                'org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus',
                'GetConnectionUnixProcessID', new GLib.Variant('(s)', [busName]), new GLib.VariantType('(u)'),
                Gio.DBusCallFlags.NONE, DBUS_TIMEOUT_MS, this._cancellable,
                (connection, result) => {
                    try {
                        resolve(connection.call_finish(result).deepUnpack()[0]);
                    } catch (e) {
                        reject(e);
                    }
                });
        });
    }

    _read(path) {
        return new Promise((resolve, reject) => {
            Gio.File.new_for_path(path).load_contents_async(this._cancellable, (file, result) => {
                try {
                    resolve(new TextDecoder().decode(file.load_contents_finish(result)[1]));
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}
