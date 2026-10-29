import {test, assertEqual, assertThrows, done} from './harness.js';
import {parseChangelog, escapeMarkup} from '../src/lib/markdown.js';
import {buildBackup, parseBackup} from '../src/lib/settingsBackup.js';
import {formatDebugInfo, formatGjsVersion} from '../src/lib/debugInfo.js';

test('escapes Pango markup', () => {
    assertEqual(escapeMarkup('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
});

test('changelog: skips intro, parses releases, sections and items', () => {
    const md = '# Changelog\n\nIntro.\n\n## [1.0] - 2026-10-29\n\n### Added\n- New `thing`\n  continued\n  - nested\n\n[1.0]: https://x';
    assertEqual(parseChangelog(md), [
        {version: '1.0', date: '2026-10-29', sections: [{title: 'Added', items: [
            {markup: 'New <tt>thing</tt> continued', level: 0},
            {markup: 'nested', level: 1},
        ]}]},
    ]);
});

const VALUES = {
    'item-order': ['app:discord', 'lightsbuddy@svashta.com'],
    'item-states': {'app:discord': 'collapsible'},
    'default-state': 'shown',
    'auto-collapse': true,
    'collapse-delay': 5,
    'open-on-hover': false,
    'pill-style': 'subtle',
};

test('backup round-trip keeps every value', () => {
    assertEqual(parseBackup(buildBackup(VALUES, '0.1.0')), VALUES);
});

test('backup rejects foreign and invalid files', () => {
    assertThrows(() => parseBackup('nope'), /not-json/);
    assertThrows(() => parseBackup('{"format":"lightsbuddy-settings"}'), /not-backup/);
    assertThrows(() => parseBackup('{"format":"traybuddy-settings","version":99}'), /newer/);
    assertThrows(() => parseBackup('{"format":"traybuddy-settings","version":1,"states":{"a":"gone"}}'), /states/);
    assertThrows(() => parseBackup('{"format":"traybuddy-settings","version":1,"collapseDelay":0}'), /collapseDelay/);
});

test('debug info counts app icons without naming them', () => {
    const text = formatDebugInfo({
        extensionVersion: '0.1.0', shellVersion: '51.1', gjsVersion: '1.88.1', os: 'CachyOS', sessionType: 'wayland',
        settings: {autoCollapse: true, collapseDelay: 5, openOnHover: false, pillStyle: 'subtle', defaultState: 'shown'},
        extensions: {appIndicator: true, dashToPanel: false},
        items: [
            {key: 'app:discord', state: 'collapsible', present: true},
            {key: 'app:steam', state: 'never', present: false},
            {key: 'lightsbuddy@svashta.com', state: 'shown', present: true},
        ],
    });
    assertEqual(text.includes('discord'), false);
    assertEqual(text.includes('App icons: 2 (0 shown, 1 collapsible, 1 hidden, 1 not running)'), true);
    assertEqual(text.split('\n').at(-1), '  - lightsbuddy@svashta.com: shown');
});

test('gjs version formatting', () => {
    assertEqual(formatGjsVersion(18801), '1.88.1');
});

done();
