import {test, assertEqual, done} from './harness.js';
import {displayName, forgetKey, itemKey, mergeKnown, moveKey, planLayout, sortKeys, stateOf, uniqueKeys} from '../src/lib/items.js';

test('extension roles are their own key', () => {
    assertEqual(itemKey('lightsbuddy@svashta.com', 'LightsBuddy'), 'lightsbuddy@svashta.com');
    assertEqual(itemKey('keyboard', ''), 'keyboard');
});

test('app indicators are keyed by name, not by bus name or PID', () => {
    assertEqual(itemKey('appindicator-:1.102@/org/ayatana/NotificationItem/discord1', 'Discord'), 'app:discord');
    assertEqual(itemKey('appindicator-:1.250@/StatusNotifierItem', 'Steam Client'), 'app:steam-client');
    assertEqual(itemKey('appindicator-:1.9@/org/ayatana/NotificationItem/dropbox_client_677911', ''), 'app:dropbox-client');
    assertEqual(itemKey('appindicator-:1.9@/StatusNotifierItem', '  '), 'app:statusnotifieritem');
});

test('display names fall back to a readable role', () => {
    assertEqual(displayName('appindicator-x', 'Discord'), 'Discord');
    assertEqual(displayName('clipboard-indicator@tudmotu.com', ''), 'Clipboard indicator');
    assertEqual(displayName('appindicator-:1.9@/org/ayatana/NotificationItem/dropbox_client_677911', null), 'Dropbox client');
});

test('duplicate keys get a number', () => {
    assertEqual(uniqueKeys(['app:a', 'app:b', 'app:a', 'app:a']), ['app:a', 'app:b', 'app:a#2', 'app:a#3']);
});

test('unknown states use the default', () => {
    assertEqual(stateOf('a', {a: 'never'}, 'shown'), 'never');
    assertEqual(stateOf('a', {a: 'bogus'}, 'collapsible'), 'collapsible');
    assertEqual(stateOf('b', {}, 'shown'), 'shown');
});

test('new icons come first in panel order, then the saved order', () => {
    assertEqual(sortKeys(['x', 'b', 'y', 'a'], ['a', 'b']), ['x', 'y', 'a', 'b']);
});

test('layout splits icons by state and keeps order', () => {
    const plan = planLayout(['n', 'c1', 's1', 'c2', 'h'], ['s1', 'c2', 'c1', 'h'],
                            {c1: 'collapsible', c2: 'collapsible', h: 'never'}, 'shown');
    assertEqual(plan, {shown: ['n', 's1'], collapsible: ['c2', 'c1'], never: ['h']});
    assertEqual(planLayout(['n'], [], {}, 'collapsible').collapsible, ['n']);
});

test('known icons are remembered when they go away', () => {
    const known = [{key: 'a', name: 'A', icon: 'a-icon', present: true}, {key: 'b', name: 'B', icon: null, present: true}];
    assertEqual(mergeKnown(known, [{key: 'b', name: 'B2', icon: 'b-icon'}, {key: 'c', name: 'C'}]), [
        {key: 'a', name: 'A', icon: 'a-icon', present: false},
        {key: 'b', name: 'B2', icon: 'b-icon', present: true},
        {key: 'c', name: 'C', icon: null, present: true},
    ]);
    assertEqual(mergeKnown([{key: 'a', name: 'A', icon: 'x', present: false}], [{key: 'a', name: 'A', icon: null}])[0].icon, 'x');
});

test('forgetting removes the icon everywhere', () => {
    assertEqual(forgetKey('a', {known: [{key: 'a'}, {key: 'b'}], order: ['b', 'a'], states: {a: 'never', b: 'shown'}}),
                {known: [{key: 'b'}], order: ['b'], states: {b: 'shown'}});
});

test('moving a key before or after another', () => {
    assertEqual(moveKey(['a', 'b', 'c', 'd'], 'd', 'b'), ['a', 'd', 'b', 'c']);
    assertEqual(moveKey(['a', 'b', 'c', 'd'], 'a', 'c', true), ['b', 'c', 'a', 'd']);
    assertEqual(moveKey(['a', 'b'], 'a', 'a'), ['a', 'b']);
    assertEqual(moveKey(['a', 'b'], 'a', 'zzz'), ['a', 'b']);
});

done();
