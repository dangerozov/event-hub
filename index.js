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
    yields: array.ofTuples(3),
    listeners: array.ofTuples(2)
};

var exceptEt = ['raf', 'time', 'delta'];
var Hub = {
    send: (hid, type, event, hub) => {
        if (exceptEt.indexOf(type) === -1) console.log(hid, type, event);
        hub.events.push(hid, type, event);
    },
    yield: (hid, type, event, hub) => hub.yields.push(hid, type, event),
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
        var event;
        while((event = hub.events.shift()) !== void 0 || (event = hub.yields.shift()) !== void 0 ) {
            var [_, et, _] = event;

            var index;
            if ((index = hub.listeners.indexOf(et)) > -1) {
                var [_, cbs] = hub.listeners.get(index);

                var count = cbs.length;

                var cb;
                while(count-- > 0 && (cb = cbs.shift()) !== void 0) {
                    cb(event);
                }
            }
        }
    }
};

requestAnimationFrame(function _(e) {
    requestAnimationFrame(_);
    Hub.send(Hid.root, 'raf', e, hub);
    Hub.flush(hub);
});

Hub.once('raf', function _(e) {
    console.log(...e);
}, hub);

var map = (fromEt, toEt, mapE) => (hub) => {
    Hub.on(fromEt, function _([hid, et, e1]) {
        var e2 = mapE(e1);
        Hub.send(Hid.child(hid), toEt, e2, hub);
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
    Hub.once('delta', function _([hid, et, delta]) {
        elapsed += delta;
        if (elapsed >= ms) {
            Hub.send(Hid.child(hid), et_end, null, hub);

            Hub.yield(hid, 'delta', elapsed - ms, hub);
        }
        else {
            Hub.once('delta', _, hub);
        }
    }, hub);
};

var fromCb = (obj, prop) => (hub, et_end) => {
    obj[prop] = e => Hub.send(Hid.root, et_end, e, hub);
};

var windowOnload = fromCb(window, 'onload');

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
    root: '/',
    isChild: (childHid, hid) => childHid.startsWith(hid),
    child: (hid) => hid + '0/',
    sibling: (hid) => {
        var [parent, index] = Hid.split(hid);
        return parent + (index + 1) + '/';
    },
    split: (() => { var r = []; return (hid) => {
        for (var i = hid.length - 2; i >= 0 && hid[i] !== '/'; i--);
        var parent = hid.substring(0, i + 1);
        var index = hid.substring(i + 1, hid.length - 1);

        r[0] = parent;
        r[1] = Number(index);
        return r;
    }})(),
    depth: (hid) => {
        var depth = -1;
        for (var i = 0; i < hid.length; i++) depth += hid[i] == '/' ? 1 : 0;
        return depth;
    }
};


