
const BASE_URL = `wss://ws.rtlayer.com`;
class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private retryInterval: number;
    private eventListeners: { [event: string]: ((data: any) => void)[] } = {};
    private token?: string

    constructor(org: string, service: string, token?: string, retryInterval: number = 2000) {
        this.url = `${BASE_URL}/${org}/${service}/?token=${token}`;
        this.retryInterval = retryInterval;
        this.token = token
        this.connect();
    }

    connect() {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            this.ws = new WebSocket(this.url);
            this.ws.onopen = () => {
                this.emit('open', null);
            };
            this.ws.onmessage = (event) => {
                this.emit('message', event.data);
            };
            this.ws.onclose = () => {
                this.emit('close', null);
                setTimeout(() => {
                    this.connect(); // Retry connection
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
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                "action": 'join',
                "id": channel
            }));
        }
    }
    unsubscribe(channel: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                "action": 'leave',
                "id": channel
            }));
        }

    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }

    on(event: string, callback: (data: any) => void) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
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
