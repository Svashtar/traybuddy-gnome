// SPDX-License-Identifier: GPL-2.0-or-later
// SPDX-FileCopyrightText: 2026 Mitja Cebokli
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import GLib from 'gi://GLib';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {appKey} from '../lib/apps.js';
import {CollapseTimer} from '../lib/collapseTimer.js';
import {getConfig, getKnown, getNames, setKnown} from '../lib/config.js';
import {SYSTEM_ROLES, displayName, itemKey, mergeKnown, planLayout, renameKey, uniqueKeys} from '../lib/items.js';
import {AppResolver} from './appResolver.js';
import {Drawer, resetChild} from './drawer.js';
import {TrayButton} from './trayButton.js';

export const ROLE = 'traybuddy';
const HOVER_OPEN_MS = 300;

// The first themed or file icon inside an indicator, as a string the
// preferences window can load. Pixmap icons have no string form.
function iconString(actor) {
    const queue = [actor];
    while (queue.length) {
        const a = queue.shift();
        if (a instanceof St.Icon) {
            const name = a.gicon?.to_string() ?? a.icon_name;
            if (name)
                return name;
        }
        queue.push(...a.get_children());
    }
    return null;
}

// Extensions put live status in their accessible name ("QuotaBuddy: Session:
// 93% left…"), so their own name from metadata reads better.
function extensionName(role) {
    return Main.extensionManager.lookup(role)?.metadata.name ?? null;
}

// Places every managed indicator in the right part of the top bar:
//
//   arrow on the right: [shown…] [vault (hidden)] [drawer: collapsible…] [arrow] [system…]
//   arrow on the left:  [vault (hidden)] [drawer: collapsible…] [arrow] [shown…] [system…]
//
// The drawer always sits just left of the arrow, and the right box is
// end-aligned, so opening it grows leftwards and the arrow never moves.
//
// Indicators are never re-created or restyled, only moved between these
// boxes, and disable() puts them all back in the panel.
export class TrayManager {
    constructor(settings, {gicon, openPreferences}) {
        this._settings = settings;
        this._sources = new Set();
        this._tracked = new Map();
        this._keepOpen = false;
        this._apps = new AppResolver(() => this._queueArrange());

        this._button = new TrayButton({gicon, openPreferences});
        Main.panel.addToStatusArea(ROLE, this._button, 0, 'right');
        this._box = this._button.container.get_parent();

        this._drawer = new Drawer();
        this._drawer.setPillStyle(settings.get_string('pill-style'));
        this._vault = new St.Widget({visible: false});
        this._box.insert_child_below(this._drawer, this._button.container);
        this._box.insert_child_below(this._vault, this._drawer);

        this._timer = new CollapseTimer({
            timers: {
                setTimeout: (fn, ms) => this._addTimeout(ms, fn),
                clearTimeout: id => this._removeSource(id),
            },
            isBusy: () => this._isBusy(),
            onExpire: () => this.collapse(),
        });

        // Other extensions add, re-add and remove their icons at any time.
        for (const box of [this._box, this._drawer, this._vault]) {
            box.connectObject(
                'child-added', () => this._queueArrange(),
                'child-removed', () => this._queueArrange(),
                this);
        }

        this._button.connectObject(
            'toggle', () => this.toggle(),
            'keep-open', (_b, keepOpen) => this._setKeepOpen(keepOpen),
            'notify::hover', () => this._onButtonHover(),
            this);
        this._drawer.connectObject('notify::hover', () => this._timer.poke(), this);

        settings.connectObject(
            'changed::item-order', () => this._queueArrange(),
            'changed::item-states', () => this._queueArrange(),
            'changed::default-state', () => this._queueArrange(),
            'changed::arrow-position', () => this._queueArrange(),
            'changed::pill-style', () => this._drawer.setPillStyle(settings.get_string('pill-style')),
            'changed::auto-collapse', () => this._restartTimer(),
            'changed::collapse-delay', () => this._restartTimer(),
            this);

        this._arrange();
    }

    destroy() {
        for (const id of this._sources)
            GLib.source_remove(id);
        this._sources.clear();
        this._timer.stop();
        this._apps.destroy();
        this._apps = null;

        this._settings.disconnectObject(this);
        for (const box of [this._box, this._drawer, this._vault])
            box.disconnectObject(this);
        this._button.disconnectObject(this);
        this._drawer.disconnectObject(this);
        for (const indicator of this._tracked.keys())
            this._untrack(indicator);

        // Everything goes back into the panel, visible, where the arrow was.
        const all = [...this._vault.get_children(), ...this._drawer.get_children()];
        for (const container of all) {
            resetChild(container);
            container.get_parent().remove_child(container);
            this._box.insert_child_below(container, this._button.container);
        }

        this._vault.destroy();
        this._drawer.destroy();
        this._button.destroy();
        this._vault = this._drawer = this._button = this._box = null;
        this._timer = null;
        this._settings = null;
    }

    toggle() {
        if (this._drawer.expanded)
            this.collapse();
        else
            this.expand();
    }

    expand() {
        if (this._drawer.expanded || !this._button.visible)
            return;
        this._drawer.open();
        this._button.setExpanded(true);
        this._restartTimer();
    }

    collapse({animate = true} = {}) {
        this._timer.stop();
        this._setKeepOpen(false);
        if (!this._drawer.expanded)
            return;
        this._drawer.close({animate});
        this._button.setExpanded(false);
    }

    _setKeepOpen(keepOpen) {
        if (this._keepOpen === keepOpen)
            return;
        this._keepOpen = keepOpen;
        this._button.setKeepOpen(keepOpen);
        if (keepOpen)
            this.expand();
        this._restartTimer();
    }

    _restartTimer() {
        this._timer.stop();
        if (this._drawer.expanded && !this._keepOpen && this._settings.get_boolean('auto-collapse'))
            this._timer.start(this._settings.get_uint('collapse-delay') * 1000);
    }

    _isBusy() {
        if (this._button.hover || this._drawer.hover || this._button.menuOpen)
            return true;
        return this._drawer.get_children().some(c => c.child?.menu?.isOpen);
    }

    _onButtonHover() {
        this._timer.poke();
        if (this._hoverId) {
            this._removeSource(this._hoverId);
            this._hoverId = null;
        }
        if (this._button.hover && !this._drawer.expanded && this._settings.get_boolean('open-on-hover')) {
            this._hoverId = this._addTimeout(HOVER_OPEN_MS, () => {
                this._hoverId = null;
                this.expand();
            });
        }
    }

    _addTimeout(ms, fn) {
        const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            this._sources.delete(id);
            fn();
            return GLib.SOURCE_REMOVE;
        });
        this._sources.add(id);
        return id;
    }

    _removeSource(id) {
        if (this._sources.delete(id))
            GLib.source_remove(id);
    }

    // Batches the bursts of child-added/removed that moving icons causes.
    _queueArrange() {
        if (this._arranging || this._arrangeId)
            return;
        this._arrangeId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._sources.delete(this._arrangeId);
            this._arrangeId = null;
            this._arrange();
            return GLib.SOURCE_REMOVE;
        });
        this._sources.add(this._arrangeId);
    }

    // Indicators we may move, left to right as they are now.
    _collect() {
        const position = new Map(
            [...this._vault.get_children(), ...this._drawer.get_children(), ...this._box.get_children()]
                .map((c, i) => [c, i]));
        const items = [];
        for (const [role, indicator] of Object.entries(Main.panel.statusArea)) {
            if (!indicator || role === ROLE || SYSTEM_ROLES.has(role))
                continue;
            if (!position.has(indicator.container))
                continue;
            items.push({role, indicator, container: indicator.container});
        }
        items.sort((a, b) => position.get(a.container) - position.get(b.container));
        this._apps.prune(new Set(items.map(i => i.role)));
        for (const item of items) {
            item.app = this._apps.lookup(item.role);
            item.nameKey = itemKey(item.role, item.indicator.accessible_name);
        }
        // Icons still being looked up have no key yet, so they can't take a "#2" from one that has.
        const ready = items.filter(i => i.app !== undefined);
        const keys = uniqueKeys(ready.map(i => (i.app ? appKey(i.app.id) : i.nameKey)));
        ready.forEach((item, i) => (item.key = keys[i]));
        return items;
    }

    // App icons used to be keyed by their name; carry their settings over to
    // the app key the first time each one is found.
    _migrate(items) {
        const before = {
            known: getKnown(this._settings),
            ...getConfig(this._settings),
            names: getNames(this._settings),
        };
        let after = before;
        for (const item of items.filter(i => i.app))
            after = renameKey(item.nameKey, item.key, after);
        if (after === before)
            return;
        this._settings.set_strv('item-order', after.order);
        this._settings.set_value('item-states', new GLib.Variant('a{ss}', after.states));
        this._settings.set_value('item-names', new GLib.Variant('a{ss}', after.names));
        setKnown(this._settings, after.known);
    }

    _arrange() {
        this._arranging = true;
        const all = this._collect();
        this._migrate(all);
        // Until we know which app an icon belongs to we don't know its key, so it
        // waits out of sight rather than flashing up in the wrong place.
        const pending = all.filter(i => i.app === undefined);
        const items = all.filter(i => i.app !== undefined);
        const byKey = new Map(items.map(i => [i.key, i]));
        const {order, states, defaultState} = getConfig(this._settings);
        const plan = planLayout(items.map(i => i.key), order, states, defaultState);

        // Each icon goes right after the previous one (or first in its box),
        // so foreign children and moves within a box can't shift the target.
        const place = (keys, box, first, before = null) => {
            let anchor = first;
            for (const key of keys) {
                const {container} = byKey.get(key);
                const parent = container.get_parent();
                if (box !== this._drawer)
                    resetChild(container);
                if (parent !== box) {
                    parent.remove_child(container);
                    box.add_child(container);
                }
                if (anchor)
                    box.set_child_above_sibling(container, anchor);
                else
                    box.set_child_below_sibling(container, before);
                anchor = container;
            }
        };
        for (const {container} of pending) {
            if (container.get_parent() !== this._vault) {
                container.get_parent().remove_child(container);
                this._vault.add_child(container);
            }
        }
        place(plan.never, this._vault, null);
        place(plan.collapsible, this._drawer, null);
        if (this._settings.get_string('arrow-position') === 'left')
            place(plan.shown, this._box, this._button.container);
        else
            place(plan.shown, this._box, null, this._vault);
        this._arranging = false;

        const present = new Set(all.map(i => i.indicator));
        for (const indicator of [...this._tracked.keys()]) {
            if (!present.has(indicator))
                this._untrack(indicator);
        }
        for (const item of all)
            this._track(item.indicator);

        this._updateButton();
        setKnown(this._settings, mergeKnown(getKnown(this._settings), items.map(i => ({
            key: i.key,
            name: i.app?.name ?? extensionName(i.role) ?? displayName(i.role, i.indicator.accessible_name),
            icon: iconString(i.indicator) ?? i.app?.icon ?? null,
        }))));
    }

    // Names change after an app starts (rekey), icons come and go (arrow
    // visibility), and menus opening keep the drawer from collapsing.
    _track(indicator) {
        if (this._tracked.has(indicator))
            return;
        indicator.connectObject(
            'notify::accessible-name', () => this._queueArrange(),
            'notify::visible', () => this._updateButton(),
            'menu-set', () => this._trackMenu(indicator),
            this);
        this._tracked.set(indicator, null);
        this._trackMenu(indicator);
    }

    _trackMenu(indicator) {
        this._tracked.get(indicator)?.disconnectObject(this);
        const menu = indicator.menu ?? null;
        menu?.connectObject('open-state-changed', () => this._timer.poke(), this);
        this._tracked.set(indicator, menu);
    }

    _untrack(indicator) {
        this._tracked.get(indicator)?.disconnectObject(this);
        indicator.disconnectObject(this);
        this._tracked.delete(indicator);
    }

    // The arrow only shows while there is something to reveal.
    _updateButton() {
        const any = this._drawer.get_children().some(c => c.child?.visible);
        this._button.visible = any;
        if (!any)
            this.collapse({animate: false});
    }
}
