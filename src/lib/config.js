// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// GSettings helpers shared by the shell and the preferences window.

export function getKnown(settings) {
    try {
        const known = JSON.parse(settings.get_string('known-items'));
        return Array.isArray(known) ? known.filter(i => typeof i?.key === 'string') : [];
    } catch {
        return [];
    }
}

// Writes only when something changed, so listeners don't wake up for nothing.
export function setKnown(settings, known) {
    const json = JSON.stringify(known);
    if (json !== settings.get_string('known-items'))
        settings.set_string('known-items', json);
}

export function getStates(settings) {
    return settings.get_value('item-states').deepUnpack();
}

export function getConfig(settings) {
    return {
        order: settings.get_strv('item-order'),
        states: getStates(settings),
        defaultState: settings.get_string('default-state'),
    };
}
