import {test, assertEqual, done} from './harness.js';
import {FakeTimers} from './fakeTimers.js';
import {CollapseTimer} from '../src/lib/collapseTimer.js';

function setup() {
    const timers = new FakeTimers();
    const state = {busy: false, collapsed: 0};
    const timer = new CollapseTimer({
        timers,
        isBusy: () => state.busy,
        onExpire: () => state.collapsed++,
    });
    return {timers, state, timer};
}

test('collapses after the delay', () => {
    const {timers, state, timer} = setup();
    timer.start(5000);
    timers.advance(4999);
    assertEqual(state.collapsed, 0);
    timers.advance(1);
    assertEqual(state.collapsed, 1);
    assertEqual(timer.running, false);
});

test('activity counts the delay again', () => {
    const {timers, state, timer} = setup();
    timer.start(5000);
    timers.advance(4000);
    timer.poke();
    timers.advance(4000);
    assertEqual(state.collapsed, 0);
    timers.advance(1000);
    assertEqual(state.collapsed, 1);
});

test('waits while busy, then a full delay after', () => {
    const {timers, state, timer} = setup();
    state.busy = true;
    timer.start(1000);
    timers.advance(10000);
    assertEqual(state.collapsed, 0);
    state.busy = false;
    timers.advance(999);
    assertEqual(state.collapsed, 0);
    timers.advance(1);
    assertEqual(state.collapsed, 1);
});

test('stop cancels and poke does nothing afterwards', () => {
    const {timers, state, timer} = setup();
    timer.start(1000);
    timer.stop();
    timer.poke();
    timers.advance(5000);
    assertEqual(state.collapsed, 0);
    assertEqual(timers._timers.size, 0);
});

done();
