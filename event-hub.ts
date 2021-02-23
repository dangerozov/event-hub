var hub : {
    events: { type: string, data: any }[],
    yields: { type: string, data: any }[],
    listeners: any[]
} = {
    events: [],
    yields: [],
    listeners: []
};
type HubState = typeof hub;

var exceptEt = ['raf', 'time', 'delta'];

type Hub = {
    send: (type: string, data: any, hub: HubState) => void,
    yield: (type: string, data: any, hub: HubState) => void,

    once(type: string, callback: (e: any) => void, hub: HubState): void,
    once(type: string, callback: (e: any, state: any) => void, state: any, hub: HubState): void,
    on(type: string, callback: (e: any) => void, hub: HubState): void,

    run: (hub: HubState) => void
};

var Hub : Hub = {
    send: (type: string, data: any, hub: HubState) => {
        if (exceptEt.indexOf(type) === -1)
            console.log('Send', type, data);

        hub.events.push({
            type,
            data
        });
    },
    yield: (type: string, data: any, hub: HubState) => {
        hub.yields.push({
            type,
            data
        });
    },
    once: (type: string, callback: (e: any, state: any) => void, state: any, hub?: HubState) => {
        if (hub === undefined) {
            hub = state;
            state = undefined;
        }
        hub.listeners.push({ type, callback, state });
    },
    on: (type: string, callback: (e: any) => void, hub: HubState) => {
        Hub.once(type, function _(e) {
            Hub.once(type, _, hub);
            callback(e);
        }, hub);
    },
    run: (hub: HubState) => {
        var event : { type: string, data: any };
        while((event = hub.events.shift()) !== void 0 || (event = hub.yields.shift()) !== void 0 ) {
            var listener = hub.listeners.find(listener => listener.type == event.type);
            
            var index = hub.listeners.indexOf(listener);
            hub.listeners.splice(index, 1);

            if (listener !== undefined) {
                listener.callback(event, listener.state);
            }
        }
    }
};
