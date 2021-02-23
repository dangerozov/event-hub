
requestAnimationFrame(function callback(e) {
    requestAnimationFrame(callback);
    Hub.send('raf', e, hub);
    Hub.run(hub);
});

var map = (fromType: string, toType: string, mapData: (e: any) => any) => (hub: HubState) => {
    Hub.on(fromType, function callback(e) {
        var toData = mapData(e.data);
        Hub.send(toType, toData, hub);
    }, hub);
};

var time = {
    previous: 0,
    current: 0,
    delta: 0
};

map('raf', 'time', elapsed => {
    time.previous = time.current;
    time.current = elapsed;
    time.delta = time.current - time.previous;
    return time;
})(hub);

map('time', 'delta', time => time.delta)(hub);

var delays = 0;
var delay = (ms: number) => (hub: HubState) => {
    var id = 'delay:' + delays++;

    var elapsed = 0;
    Hub.once('delta', function callback(e) {
        elapsed += e.data;
        if (elapsed >= ms) {
            Hub.send(id, elapsed, hub);

            Hub.yield('delta', elapsed - ms, hub);
        }
        else {
            Hub.once('delta', callback, hub);
        }
    }, hub);

    return id;
};

var delayImmutable = (() => {
    var callback = (e: any, state: any) => {
        state.elapsed += e.data;
        if (state.elapsed < state.delay) {
            //console.log('Delaying', state);
            Hub.once('delta', callback, state, hub);
        }
        else {
            //console.log('Delaying finished', state);
        }
    };

    return (delay: number, hub: HubState) => {
        Hub.once('delta', callback, { delay, elapsed: 0 }, hub);
    };
})();

delayImmutable(2000, hub);

var fromCallback = (obj: any, prop: string) => (hub: HubState) => {
    obj[prop] = (e: any) => Hub.send(prop, e, hub);
    return prop;
};

var windowOnload = fromCallback(window, 'onload');

var one = delay(2000);
var two = delay(2000);

var thens = 0;
var then = (one: any, two: any) => (hub: HubState) => {
    var id = 'then:' + thens++;
    var typeOne = one(hub); console.log('Waiting for', typeOne);
    Hub.once(typeOne, _ => { 
        var typeTwo = two(hub); console.log('Waiting for', typeTwo);
        Hub.once(typeTwo, _ => {
            Hub.send(id, null, hub);
        }, hub);
    }, hub);
    return id;
};

var t0 = then(windowOnload, then(one, two))(hub); console.log('Waiting for', t0);

Hub.once(t0, () => console.log('window 1 + 2'), hub);

type Delay = {
    delay: number,
    elapsed: number
};

var delayOnTimeout = (state: Delay) => {
    if (state.elapsed < state.delay) {
        state.elapsed += 100;
        setTimeout(delayOnTimeout, 100, state);
        console.log('Delaying', state);
    }
    else {
        console.log('Delaying finished', state);
    }
};

delayOnTimeout({
    delay: 2000, elapsed: 1800
});
