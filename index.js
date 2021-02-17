var hub = {
    events: [],
    yields: [],
    listeners: []
};

var exceptEt = ['raf', 'time', 'delta'];
var Hub = {
    send: (type, data, hub) => {
        if (exceptEt.indexOf(type) === -1)
            console.log('Send', type, data);

        hub.events.push({
            type,
            data
        });

        Hub.flush(hub);
    },
    yield: (type, data, hub) => {
        hub.yields.push({
            type,
            data
        });

        Hub.flush(hub);
    },
    once: (type, callback, hub) => {
        hub.listeners.push({ type, callback });
    },
    on: (type, callback, hub) => {
        Hub.once(type, function _(...args) {
            Hub.once(type, _, hub);
            callback(...args);
        }, hub);
    },
    flush: (hub) => {
        var event;
        while((event = hub.events.shift()) !== void 0 || (event = hub.yields.shift()) !== void 0 ) {
            var listener = hub.listeners.find(listener => listener.type == event.type);
            
            var index = hub.listeners.indexOf(listener);
            hub.listeners.splice(index, 1);

            if (listener !== undefined) {
                listener.callback(event);
            }
        }
    }
};

requestAnimationFrame(function callback(e) {
    requestAnimationFrame(callback);
    Hub.send('raf', e, hub);
});

Hub.once('raf', function callback(e) {
    console.log(e);
}, hub);

var map = (fromType, toType, mapData) => (hub) => {
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
var delay = (ms) => (hub) => {
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

var fromCallback = (obj, prop) => (hub) => {
    obj[prop] = e => Hub.send(prop, e, hub);
    return prop;
};

var windowOnload = fromCallback(window, 'onload');

var one = delay(2000);
var two = delay(2000);

var thens = 0;
var then = (one, two) => (hub) => {
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


