import {test, assertEqual, done} from './harness.js';
import {appForProgram, appIdsFromCgroup, appKey, indicatorSource, programFromCmdline} from '../src/lib/apps.js';

test('indicator roles give a bus name or a PID', () => {
    assertEqual(indicatorSource('appindicator-:1.97@/org/ayatana/NotificationItem/remmina_icon'), {busName: ':1.97'});
    assertEqual(indicatorSource('appindicator-org.kde.StatusNotifierItem-736447-1'), {busName: 'org.kde.StatusNotifierItem-736447-1'});
    assertEqual(indicatorSource('appindicator-legacy:steam:4242'), {pid: 4242});
    assertEqual(indicatorSource('appindicator-legacy:steam:x'), null);
    assertEqual(indicatorSource('lightsbuddy@svashta.com'), null);
});

test('app ids come from the systemd scope', () => {
    const cg = unit => `0::/user.slice/user-1000.slice/user@1000.service/app.slice/${unit}\n`;
    assertEqual(appIdsFromCgroup(cg('app-gnome-com.viber.Viber-736386.scope')), ['com.viber.Viber', 'gnome-com.viber.Viber']);
    assertEqual(appIdsFromCgroup(cg('app-com.anthropic.Claude-744751.scope')), ['com.anthropic.Claude']);
    assertEqual(appIdsFromCgroup(cg('app-gnome-arch\\x2dupdate\\x2dtray-736447.scope'))[0], 'arch-update-tray');
    assertEqual(appIdsFromCgroup(cg('app-flatpak-org.localsend.localsend_app-12.scope'))[0], 'org.localsend.localsend_app');
    assertEqual(appIdsFromCgroup(cg('app-gnome-blueman@a1b2.service'))[0], 'blueman');
    assertEqual(appIdsFromCgroup(cg('app-org.gnome.Terminal.service')), ['org.gnome.Terminal']);
    assertEqual(appIdsFromCgroup(cg('session.slice/org.gnome.Shell@wayland.service')), []);
    assertEqual(appIdsFromCgroup(cg('dbus.service')), []);
    assertEqual(appIdsFromCgroup(''), []);
});

test('program names come from the command line', () => {
    assertEqual(programFromCmdline('/usr/bin/remmina\0--icon\0'), 'remmina');
    assertEqual(programFromCmdline('Viber\0'), 'Viber');
    assertEqual(programFromCmdline('python3\0/opt/thefanclub/overgrive/overgrive\0'), 'overgrive');
    assertEqual(programFromCmdline('/usr/bin/python\0-u\0/usr/bin/blueman-applet\0'), 'blueman-applet');
    assertEqual(programFromCmdline('python3\0'), 'python3');
    assertEqual(programFromCmdline(''), '');
});

test('programs match installed apps by Exec, then by id', () => {
    const apps = [
        {id: 'org.remmina.Remmina.desktop', executable: 'remmina-file-wrapper'},
        {id: 'overgrive.desktop', executable: '/usr/bin/overgrive'},
        {id: 'idle.desktop', executable: 'python3'},
    ];
    assertEqual(appForProgram(apps, 'overgrive').id, 'overgrive.desktop');
    assertEqual(appForProgram(apps, 'Remmina').id, 'org.remmina.Remmina.desktop');
    assertEqual(appForProgram(apps, 'python3'), null);
    assertEqual(appForProgram(apps, 'steam'), null);
    assertEqual(appForProgram(apps, ''), null);
});

test('app keys come from the desktop id', () => {
    assertEqual(appKey('com.viber.Viber.desktop'), 'app:com-viber-viber');
    assertEqual(appKey('steam.desktop'), 'app:steam');
});

done();
