import { EventEmitter, Transform, Writable } from "stream-browserify";

const BASE_URL = `wss://ws.rtlayer.com`;
class SendMessage extends Transform {
    private ws: WebSocket;
    constructor(ws: WebSocket) {
        super({ objectMode: true });
        this.ws = ws;
    }
    async _transform(chunk: string, encoding: string, callback: Function) {
        try {
            this.ws?.send(chunk);
            await delay(100);
            this.push(chunk);
        } catch (error) {
            console.error(error);
        }
        callback();
    }
}

class MessageStream extends Transform {

    constructor() {
        super({ objectMode: true });
    }

    _transform(chunk: Object, encoding: string, callback: Function) {
        this.push(JSON.stringify(chunk));
        callback();
    }
}



class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private retryInterval: number;
    private eventListeners: { [event: string]: ((data: any) => void)[] } = {};
    private token?: string
    private isGloballySubscribed = false; // True if listening for "*" events
    private activeChannels: Set<string> = new Set();
    private messageStream;

    constructor(org: string, service: string, token?: string, retryInterval: number = 5000) {
        this.url = `${BASE_URL}/${org}/${service}/?token=${token}`;
        this.retryInterval = retryInterval;
        this.token = token
        this.messageStream = new MessageStream();
        this.connect();
    }

    private connect() {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            this.ws = new WebSocket(this.url);
            this.ws.onopen = async () => {
                this.emit('open', null);
                // Rejoin active channels on reconnect
                this.activeChannels.forEach(channel => this.subscribe(channel));
                // Send messages through the stream
                this.messageStream.unpipe();
                if (this.ws) this.messageStream.pipe(new SendMessage(this.ws)).on('data', (chunk) => chunk).on('error', (error) => {
                    console.error(error);
                });
            };
            this.ws.onmessage = (event) => {
                let data = event.data;
                try {
                    // If valid JSON, emit the message on the channel
                    data = JSON.parse(data);
                    if (data?.channel) {
                        this.emit(data.channel, data.message);
                        data = data.message;
                    } else {
                        data = event.data;
                    }
                } catch (error) {
                    data = data;
                }
                this.emit('*', data);
                this.emit('message', data);

            };
            this.ws.onclose = () => {
                this.messageStream.unpipe();
                this.emit('close', null);
                setTimeout(() => {
                    // Retry connection
                    this.connect();
                }, this.retryInterval);
            };
        }
    }

    send(message: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        }
    }

    subscribe(channel: string) {
        this.activeChannels.add(channel);
        const message = { action: 'join', channel: channel };
        this.messageStream.write(message);
    }
    unsubscribe(channel: string) {
        this.activeChannels.delete(channel);
        const message = { action: 'leave', channel: channel };
        this.messageStream.write(message);
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }

    on(channel: string, callback: (data: any) => void) {
        if (channel === '*') this.isGloballySubscribed = true;
        if (!this.eventListeners[channel]) {
            this.eventListeners[channel] = [];
        }
        if (channel !== '*' && this.eventListeners[channel].length === 0) this.subscribe(channel);
        this.eventListeners[channel].push(callback);
        return {
            remove: () => {
                this.removeListener(channel, callback);
            }
        }
    }
    removeListener(channel: string, listener: any) {
        if (channel === '*') {
            this.isGloballySubscribed = false;
            // Unsubscribe all channels which have no listeners
            for (const channel in this.eventListeners) {
                if (this.eventListeners[channel].length === 0) {
                    this.unsubscribe(channel);
                }
            }
        }
        const listeners = this.eventListeners[channel] || [];
        const index = listeners.indexOf(listener);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
        this.eventListeners[channel] = listeners;
        // Unsubscribe if no listeners
        if (listeners.length === 0 && !this.isGloballySubscribed) this.unsubscribe(channel);
    }

    private emit(event: string, data: any) {
        const listeners = this.eventListeners[event];
        if (listeners) {
            for (const listener of listeners) {
                listener(data);
            }
        }
    }
}
const cache = new Map<string, WebSocketClient>();
export default function RTLayerClient(org: string, service: string, token?: string, retryInterval: number = 5000): WebSocketClient {
    const key = `${org}/${service}`;
    if (cache.has(key)) {
        return cache.get(key)!;
    }
    const client = new WebSocketClient(org, service, token, retryInterval);
    cache.set(key, client);
    return client;
}


function delay(ms: number = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
