// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

// Settings export/import. Pure so it can be unit tested.

import {STATES} from './items.js';

export class BackupError extends Error {
    // reason: 'not-json' | 'not-backup' | 'newer' | 'invalid'; field: for 'invalid'
    constructor(reason, field = null) {
        super(field ? `${reason}: ${field}` : reason);
        this.name = 'BackupError';
        this.reason = reason;
        this.field = field;
    }
}

const BACKUP_FORMAT = 'traybuddy-settings';
const BACKUP_VERSION = 1;

const isStringArray = v => Array.isArray(v) && v.every(s => typeof s === 'string');
const isStateMap = v => v !== null && typeof v === 'object' && !Array.isArray(v) &&
    Object.values(v).every(s => STATES.includes(s));

// [GSettings key, backup field, type check]
const FIELDS = [
    ['item-order', 'order', isStringArray],
    ['item-states', 'states', isStateMap],
    ['default-state', 'defaultState', v => v === 'shown' || v === 'collapsible'],
    ['auto-collapse', 'autoCollapse', v => typeof v === 'boolean'],
    ['collapse-delay', 'collapseDelay', v => Number.isInteger(v) && v >= 1 && v <= 120],
    ['open-on-hover', 'openOnHover', v => typeof v === 'boolean'],
    ['pill-style', 'pillStyle', v => ['none', 'subtle', 'accent'].includes(v)],
];

// values: {gsettingsKey: value}
export function buildBackup(values, extensionVersion) {
    const backup = {format: BACKUP_FORMAT, version: BACKUP_VERSION, extensionVersion};
    for (const [key, field] of FIELDS)
        backup[field] = values[key];
    return JSON.stringify(backup, null, 2);
}

// Returns {gsettingsKey: value} for the fields present in the file.
// Throws BackupError when the file is not a valid backup; prefs shows a
// translated message for its `reason`.
export function parseBackup(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new BackupError('not-json');
    }
    if (data?.format !== BACKUP_FORMAT)
        throw new BackupError('not-backup');
    if (data.version > BACKUP_VERSION)
        throw new BackupError('newer');

    const result = {};
    for (const [key, field, valid] of FIELDS) {
        if (!(field in data))
            continue;
        if (!valid(data[field]))
            throw new BackupError('invalid', field);
        result[key] = data[field];
    }
    return result;
}

export const BACKUP_KEYS = FIELDS.map(([key]) => key);
