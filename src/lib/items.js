// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// Which top-bar icons exist, what they are called and where each one goes.
// Pure (no gi imports) so it can be unit tested.

export const STATES = ['shown', 'collapsible', 'never'];

// System menus, and the screen recording and sharing indicators, which must
// never be hidden.
export const SYSTEM_ROLES = new Set(['activities', 'quickSettings', 'dateMenu', 'screenRecording', 'screenSharing']);

export const APP_PREFIX = 'app:';

function slug(text) {
    return (text ?? '').trim().toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
}

// "appindicator-:1.102@/org/ayatana/NotificationItem/dropbox_client_677911" → "dropbox_client"
function nameFromAppRole(role) {
    const last = role.replace(/^appindicator-/, '').split('/').at(-1);
    return last.replace(/[_-]?\d+$/, '').replace(/^:.*$/, '');
}

// A key that stays the same across sessions. AppIndicator roles embed the
// D-Bus name and often a PID, both new every time the app starts, so app
// icons are keyed by their name instead. Extension roles are already stable.
export function itemKey(role, accessibleName) {
    if (!role.startsWith('appindicator-'))
        return role;
    const name = slug(accessibleName) || slug(nameFromAppRole(role)) || 'unknown';
    return `${APP_PREFIX}${name}`;
}

// The name shown in preferences.
export function displayName(role, accessibleName) {
    const name = (accessibleName ?? '').trim();
    if (name)
        return name;
    const base = role.startsWith('appindicator-') ? nameFromAppRole(role) : role.split('@')[0];
    const words = base.replace(/[-_.]+/g, ' ').trim();
    return words ? words[0].toUpperCase() + words.slice(1) : role;
}

// Two apps can share a name; the second becomes "app:x#2" and so on.
export function uniqueKeys(keys) {
    const seen = new Map();
    return keys.map(key => {
        const n = (seen.get(key) ?? 0) + 1;
        seen.set(key, n);
        return n === 1 ? key : `${key}#${n}`;
    });
}

export function stateOf(key, states, defaultState) {
    const state = states[key];
    return STATES.includes(state) ? state : defaultState;
}

// Keys in display order: icons missing from `order` (new ones) first, in the
// order the panel has them, then the rest in the user's order.
export function sortKeys(keys, order) {
    const rank = new Map(order.map((key, i) => [key, i]));
    const panel = new Map(keys.map((key, i) => [key, i]));
    return [...keys].sort((a, b) => {
        const ra = rank.get(a), rb = rank.get(b);
        if (ra === undefined && rb === undefined)
            return panel.get(a) - panel.get(b);
        if (ra === undefined)
            return -1;
        if (rb === undefined)
            return 1;
        return ra - rb;
    });
}

// keys: icons in the panel now, left to right.
// Returns {shown, collapsible, never}, each in display order.
export function planLayout(keys, order, states, defaultState = 'shown') {
    const plan = {shown: [], collapsible: [], never: []};
    for (const key of sortKeys(keys, order))
        plan[stateOf(key, states, defaultState)].push(key);
    return plan;
}

// known: [{key, name, icon, present}] remembered so far; present: [{key, name, icon}]
// in the panel now. Icons that went away are kept (marked not present), so
// they can be set up while their app isn't running.
export function mergeKnown(known, present) {
    const now = new Map(present.map(item => [item.key, item]));
    const merged = known.map(item => {
        const current = now.get(item.key);
        now.delete(item.key);
        return current
            ? {key: item.key, name: current.name, icon: current.icon ?? item.icon ?? null, present: true}
            : {...item, present: false};
    });
    for (const item of now.values())
        merged.push({key: item.key, name: item.name, icon: item.icon ?? null, present: true});
    return merged;
}

// Drops an icon from every setting, for "Forget" in preferences.
export function forgetKey(key, {known, order, states, names = {}}) {
    const rest = {...states};
    delete rest[key];
    const restNames = {...names};
    delete restNames[key];
    return {
        known: known.filter(item => item.key !== key),
        order: order.filter(k => k !== key),
        states: rest,
        names: restNames,
    };
}

// Moves everything saved under `from` to `to`, for icons that used to be keyed
// by their name and are now keyed by their app. Does nothing once `to` is set
// up, so it is safe to run on every arrange; returns `saved` itself when
// nothing changes.
export function renameKey(from, to, saved) {
    const {known, order, states, names = {}} = saved;
    if (from === to || known.some(item => item.key === to) || !known.some(item => item.key === from))
        return saved;
    const move = map => {
        if (!(from in map))
            return map;
        const {[from]: value, ...rest} = map;
        return {...rest, [to]: value};
    };
    return {
        ...saved,
        known: known.map(item => (item.key === from ? {...item, key: to} : item)),
        order: order.map(k => (k === from ? to : k)),
        states: move(states),
        names: move(names),
    };
}

// Moves `key` to just before (or after) `target`.
export function moveKey(order, key, target, after = false) {
    if (key === target)
        return order;
    const list = order.filter(k => k !== key);
    const i = list.indexOf(target);
    if (i < 0)
        return order;
    list.splice(after ? i + 1 : i, 0, key);
    return list;
}
