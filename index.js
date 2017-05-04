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

var eventHub = { };

eventHub.events = array.ofTuples(2);
eventHub.send = (type, event) => {
    eventHub.events.push(type, event);
};

eventHub.yields = array.ofTuples(2);
eventHub.yield = (type, event) => {
    eventHub.yields.push(type, event);
};

eventHub.listeners = array.ofTuples(3);
eventHub.once = (type, callback, ...args) => {
    var index;
    if ((index = eventHub.listeners.indexOf(type)) < 0) index = eventHub.listeners.push(type, [[], []]) - 1;
    var row = eventHub.listeners.get(index);
    var cbs = row[1];
    cbs[0].push(callback);
};

eventHub.on = (type, cb) => {
    eventHub.once(type, function _(e) {
        eventHub.once(type, _);
        cb(e);
    });
};

eventHub.run = () => {
    var pair, listener;
    while((pair = eventHub.events.shift()) !== void 0 || (pair = eventHub.yields.shift()) !== void 0 ) {
        var et = pair[0], e = pair[1];
        
        var index;
        if ((index = eventHub.listeners.indexOf(et)) > -1) {
            var row = eventHub.listeners.get(index);
            var cbs = row[1];
            array.swap(cbs);
            while((listener = cbs[1].shift()) !== void 0)
                listener(e);
        }
    }
};

//setTimeout(function _() { setTimeout(_); q.run(); });

eventHub.yield('_', () => console.log('yield 1'));
eventHub.yield('_', () =>
    eventHub.yield('_', () => console.log('yield 2')));

eventHub.once('_', function _(a) { a(); eventHub.once('_', _); });

requestAnimationFrame(function _(e) {
    requestAnimationFrame(_);    
    eventHub.run();
});

requestAnimationFrame(function _(e) {
    requestAnimationFrame(_);    
    eventHub.send('raf', e);
});

eventHub.once('raf', function _(e) {
    //q.once('raf', _);
    console.log('raf', e);
});

var map = (from, to, map) => (q) => {
    q.on(from, function _(e) {
        var r = map(e);
        q.send(to, r);
    });
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
})(eventHub);

map('time', 'delta', time => time.delta)(eventHub);

var delay = (ms) => (q, et) => {
    var elapsed = 0;
    q.once('delta', function _(delta) {
        elapsed += delta;
        if (elapsed >= ms) {
            q.send(et, null);

            q.yield('delta', elapsed - ms);
        }
        else {
            q.once('delta', _);
        }
    });
};

var fromCb = (sub) => (q, et) => {
    sub(e => { q.send(et, e); });
};

var windowOnload = fromCb(cb => window.onload = cb);

var one = delay(2000);
var two = delay(2000);

var then = (one, two) => (q, et) => {
    one(q, 't');
    q.once('t', _ => two(q, et));
};

then(windowOnload, then(one, two))(eventHub, 'window1+2');

eventHub.once('window1+2', () => console.log('window 1 + 2'));

// hierarchy id
var hid = {
    isParent: (hidParent, hid) => hid.startsWith(hidParent),
    isChild: (hidChild, hid) => hidChild.startsWith(hid)
};


