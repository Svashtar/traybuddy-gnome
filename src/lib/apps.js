// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// Working out which installed app owns a tray icon. Tray icons often carry a
// D-Bus id or a random string as their name, but the process behind them runs
// in a systemd scope named after its .desktop file, which gives a real name and
// icon. Pure (no gi imports) so it can be unit tested.

import {APP_PREFIX} from './items.js';

// Launchers that put their own name before the app id in the scope name.
const LAUNCHERS = new Set(['gnome', 'flatpak', 'kde', 'xfce4', 'dbus', 'snap', 'cosmic']);

// Where to ask for the process behind an AppIndicator role, or null.
//   "appindicator-:1.97@/org/ayatana/NotificationItem/x" → {busName: ":1.97"}
//   "appindicator-org.kde.StatusNotifierItem-736447-1"  → {busName: "org.kde.StatusNotifierItem-736447-1"}
//   "appindicator-legacy:steam:4242"                    → {pid: 4242}
export function indicatorSource(role) {
    if (!role.startsWith('appindicator-'))
        return null;
    const id = role.slice('appindicator-'.length);
    if (id.startsWith('legacy:')) {
        const pid = Number(id.split(':').at(-1));
        return Number.isInteger(pid) && pid > 0 ? {pid} : null;
    }
    const busName = id.split('@')[0];
    return busName ? {busName} : null;
}

function unescapeUnit(text) {
    return text.replace(/\\x([0-9a-fA-F]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// App ids to try, most likely first, from the text of /proc/<pid>/cgroup.
// Scopes follow app[-<launcher>]-<app id>-<random>.scope or
// app[-<launcher>]-<app id>[@<random>].service, with "-" inside the app id
// escaped as \x2d.
export function appIdsFromCgroup(text) {
    const unit = (text ?? '').trim().split('\n').at(-1)?.split('/').at(-1) ?? '';
    let base;
    if (unit.endsWith('.scope'))
        base = unit.slice(0, -'.scope'.length).split('-').slice(0, -1);
    else if (unit.endsWith('.service'))
        base = unit.slice(0, -'.service'.length).split('@')[0].split('-');
    else
        return [];
    if (base[0] !== 'app' || base.length < 2)
        return [];
    const parts = base.slice(1);
    const ids = [];
    if (parts.length > 1 && LAUNCHERS.has(parts[0]))
        ids.push(parts.slice(1).join('-'));
    ids.push(parts.join('-'));
    return [...new Set(ids.map(unescapeUnit).filter(Boolean))];
}

// Programs that run something else, so their name says nothing about the app.
const RUNNERS = new Set(['sh', 'bash', 'env', 'python', 'python3', 'perl', 'ruby', 'node', 'electron', 'java', 'gjs', 'mono', 'wine']);

// The program name from the text of /proc/<pid>/cmdline, looking past
// interpreters to the script they run:
//   "/usr/bin/foo\0--x" → "foo", "python3\0/opt/overgrive/overgrive" → "overgrive"
export function programFromCmdline(text) {
    const args = (text ?? '').split('\0').map(arg => arg.trim().split('/').at(-1)).filter(Boolean);
    let i = 0;
    while (i < args.length - 1 && (RUNNERS.has(args[i].toLowerCase()) || args[i].startsWith('-')))
        i++;
    return args[i] ?? '';
}

// The installed app whose Exec runs `program`, else the one whose id ends in
// it ("remmina" → org.remmina.Remmina.desktop, which runs a wrapper), or null.
// apps: [{id, executable}], executable as in the .desktop file's Exec.
export function appForProgram(apps, program) {
    if (!program || RUNNERS.has(program.toLowerCase()))
        return null;
    const name = program.toLowerCase();
    const lastPart = id => id.replace(/\.desktop$/, '').split('.').at(-1).toLowerCase();
    return apps.find(app => (app.executable ?? '').split('/').at(-1).toLowerCase() === name) ??
        apps.find(app => lastPart(app.id) === name) ?? null;
}

// The icon key for an app, from its .desktop id ("com.viber.Viber.desktop" → "app:com-viber-viber").
export function appKey(desktopId) {
    const slug = desktopId.replace(/\.desktop$/, '').toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
    return `${APP_PREFIX}${slug || 'unknown'}`;
}
