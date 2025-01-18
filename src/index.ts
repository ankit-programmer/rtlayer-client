
const BASE_URL = `wss://ws.rtlayer.com`;
const connectionCache = new Map<string, WebSocket>();

class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private retryInterval: number;
    private eventListeners: { [event: string]: ((data: any) => void)[] } = {};
    private token?: string
    private isGloballySubscribed = false; // True if listening for "*" events
    private queue: { action: 'join' | 'leave', channel: string }[] = [];
    private activeChannels: Set<string> = new Set();

    constructor(org: string, service: string, token?: string, retryInterval: number = 5000) {
        this.url = `${BASE_URL}/${org}/${service}/?token=${token}`;
        this.retryInterval = retryInterval;
        this.token = token
        this.connect();
    }

    private connect() {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            if (connectionCache.has(this.url)) {
                this.ws = connectionCache.get(this.url)!;
            } else {
                this.ws = new WebSocket(this.url);
                connectionCache.set(this.url, this.ws);
            }
            this.ws.onopen = async () => {
                this.emit('open', null);
                // Rejoin active channels
                this.activeChannels.forEach(channel => this.subscribe(channel));
                // Send all queued messages
                while (this.queue.length > 0) {
                    const { action, channel } = this.queue.shift()!;
                    this.ws?.send(JSON.stringify({
                        "action": action,
                        "id": channel
                    }));
                }
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
                this.emit('close', null);
                setTimeout(() => {
                    // Retry connection
                    connectionCache.delete(this.url);
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
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                "action": 'join',
                "id": channel
            }));
        } else {
            this.queue.push({ action: 'join', channel: channel });
        }
    }
    unsubscribe(channel: string) {
        this.activeChannels.delete(channel);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                "action": 'leave',
                "id": channel
            }));
        } else {
            this.queue.push({ action: 'leave', channel: channel });
        }
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

export default WebSocketClient;

function delay(ms: number = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
