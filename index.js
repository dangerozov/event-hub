var array = {
    ofTuples: (tn) => {
        var returnValue = new Array(tn).fill(null);

        var array = {};

        for(let i = 0; i < tn; i++) array[i] = [];
        
        array.length = 0;

        array.push = (...args) => {
            for(let i = 0; i < tn; i++) array[i].push(args[i]);
            array.length += 1;
            return array.length;
        };

        array.shift = () => {
            for(let i = 0; i < tn; i++) returnValue[i] = array[i].shift();
            
            let allUndef = true;
            for(let i = 0; i < tn; i++) allUndef = allUndef && returnValue[i] === void 0;

            array.length -= 1;
            return allUndef ? void 0 : returnValue;
        };

        array.indexOf = (...args) => {
            var indices = new Array(args.length);
            for(let i = 0; i < args.length; i++) indices[i] = array[i].indexOf(args[i]);

            var found = true;
            for(let i = 1; i < args.length; i++) found = found && indices[0] === indices[i];

            return found
                ? indices[0]
                : -1;
        };

        array.get = (index) => {
            for(let i = 0; i < tn; i++) returnValue[i] = array[i][index];
            return returnValue;
        };

        return array;
    },
    swap: (array) => {
        let previous = array[array.length - 1];
        for(let i = 0; i < array.length; i++) {
            let current = array[i];
            array[i] = previous;
            previous = current;
        }
        return array;
    }
};

var hub = {
    events: array.ofTuples(3),
    yields: array.ofTuples(2),
    listeners: array.ofTuples(3)
};

var exceptEt = ['raf', 'time', 'delta'];
var Hub = {
    send: (type, event, hid, hub) => {
        if (exceptEt.indexOf(type) === -1) console.log(hid, type, event);
        hub.events.push(type, event, hid);
    },
    yield: (type, event, hid, hub) => hub.yields.push(type, event, hid),
    once: (type, cb, hub) => {
        var index;
        if ((index = hub.listeners.indexOf(type)) < 0) index = hub.listeners.push(type, []) - 1;
        var row = hub.listeners.get(index);
        var cbs = row[1];
        cbs.push(cb);
    },
    on: (type, cb, hub) => {
        Hub.once(type, function _(...args) {
            Hub.once(type, _, hub);
            cb(...args);
        }, hub);
    },
    flush: (hub) => {
        var pair;
        while((pair = hub.events.shift()) !== void 0 || (pair = hub.yields.shift()) !== void 0 ) {
            var [et, e, hid] = pair;

            var index;
            if ((index = hub.listeners.indexOf(et)) > -1) {
                var [_, cbs] = hub.listeners.get(index);

                var count = cbs.length;

                var listener;
                while(count-- > 0 && (listener = cbs.shift()) !== void 0)
                    listener(e, et, hid);
            }
        }
    }
};

requestAnimationFrame(function _(e) {
    requestAnimationFrame(_);
    Hub.send('raf', e, '/0', hub);
    Hub.flush(hub);
});

Hub.once('raf', function _(e, et, hid) {
    console.log(hid, et, e);
}, hub);

var map = (from, to, map) => (hub) => {
    Hub.on(from, function _(e, et, hid) {
        var r = map(e);
        Hub.send(to, r, Hid.child(0, hid), hub);
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

var delay = (ms) => (hub, et_end) => {
    var elapsed = 0;
    Hub.once('delta', function _(delta, et, hid) {
        elapsed += delta;
        if (elapsed >= ms) {
            Hub.send(et_end, null, Hid.child(0, hid), hub);

            Hub.yield('delta', elapsed - ms, hid, hub);
        }
        else {
            Hub.once('delta', _, hub);
        }
    }, hub);
};

var fromCb = (sub) => (hub, et) => {
    sub(e => { Hub.send(et, e, '/0', hub); });
};

var windowOnload = fromCb(cb => window.onload = cb);

var one = delay(2000);
var two = delay(2000);

var then = (one, two) => (hub, et) => {
    one(hub, 't');
    Hub.once('t', _ => two(hub, et), hub);
};

then(windowOnload, then(one, two))(hub, 'window1+2');

Hub.once('window1+2', () => console.log('window 1 + 2'), hub);

// hierarchy id
var Hid = {
    isParent: (hidParent, hid) => hid.startsWith(hidParent),
    isChild: (hidChild, hid) => hidChild.startsWith(hid),
    child: (index, hid) => hid + '/' + index,
};


