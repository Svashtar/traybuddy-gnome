// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// Plain-text report for bug reports. App icons are only counted, never
// named, so the report doesn't list which apps someone runs. Extension icons
// are listed by role (usually the extension's UUID), which is public anyway.

import {APP_PREFIX} from './items.js';

// info: {extensionVersion, commit?, shellVersion, gjsVersion, os, sessionType,
//        settings: {autoCollapse, collapseDelay, openOnHover, pillStyle, arrowPosition, defaultState},
//        extensions: {appIndicator, dashToPanel},
//        items: [{key, state, present}]}
export function formatDebugInfo(info) {
    const s = info.settings;
    const lines = [
        `TrayBuddy: ${info.extensionVersion}${info.commit ? ` (${info.commit})` : ''}`,
        `GNOME Shell: ${info.shellVersion}`,
        `GJS: ${info.gjsVersion}`,
        `OS: ${info.os}`,
        `Session: ${info.sessionType}`,
        `Auto-collapse: ${s.autoCollapse ? `after ${s.collapseDelay} s` : 'off'}`,
        `Open on hover: ${s.openOnHover ? 'on' : 'off'}`,
        `Background: ${s.pillStyle}`,
        `Arrow: ${s.arrowPosition}`,
        `New icons: ${s.defaultState}`,
        `AppIndicator extension: ${info.extensions.appIndicator ? 'enabled' : 'not enabled'}`,
        `Dash to Panel: ${info.extensions.dashToPanel ? 'enabled' : 'not enabled'}`,
    ];

    const apps = info.items.filter(i => i.key.startsWith(APP_PREFIX));
    const others = info.items.filter(i => !i.key.startsWith(APP_PREFIX));
    const count = (list, state) => list.filter(i => i.state === state).length;
    lines.push(`App icons: ${apps.length} (${count(apps, 'shown')} shown, ${count(apps, 'collapsible')} collapsible, ` +
               `${count(apps, 'never')} hidden, ${apps.filter(i => !i.present).length} not running)`);
    lines.push(`Other icons: ${others.length}`);
    for (const item of others)
        lines.push(`  - ${item.key}: ${item.state}${item.present ? '' : ', not running'}`);
    return lines.join('\n');
}

// "18801" → "1.88.1"
export function formatGjsVersion(version) {
    const v = Number(version);
    return `${Math.floor(v / 10000)}.${Math.floor(v / 100) % 100}.${v % 100}`;
}
