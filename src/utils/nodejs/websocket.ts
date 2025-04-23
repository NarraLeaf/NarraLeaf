import {WebSocket, WebSocketServer} from "ws";
import {EventEmitter} from "events";
import {AppEventToken} from "@/main/electron/app/app";
import url from "url";

export type WSEventProp = {
    type: WSEventType;
    data: Record<string, any>;
    response?: Record<string, any>;
};

export type WSData<T extends Record<string, any>> = T & {
    replyId?: string;
};

export enum WSEventType {
    Message = "message",
    Request = "request",
}

export interface WebsocketServerConfig {
    port: number;
    host?: string;
}

export class Server<T extends Record<any, WSEventProp>> {
    events: EventEmitter = new EventEmitter();
    wss: WebSocketServer | null = null;

    constructor(private config: WebsocketServerConfig) {
    }

    start(): this {
        this.wss = new WebSocketServer({
            port: this.config.port,
            host: this.config.host,
        });
        return this;
    }

    onConnection(callback: (ws: WebSocket) => void): AppEventToken {
        if (!this.wss) {
            throw new Error("Websocket server is not started");
        }
        this.wss?.on("connection", callback);

        return {
            cancel: () => {
                this.wss?.off("connection", callback);
            }
        };
    }

    onMessage<U extends keyof T>(
        type: U,
        callback: (data: WSData<T[U]>["data"]) => WSData<T[U]>["response"] extends Record<any, any> ? WSData<T[U]>["response"] : void,
        ws: WebSocket
    ): AppEventToken {
        ws.on("message", (data) => {
            const parsedData: WSData<T[U]> = JSON.parse(data.toString());
            if (parsedData.type === type) {
                if (parsedData.replyId !== undefined) {
                    const response = callback(parsedData.data);
                    ws.send(JSON.stringify({
                        type,
                        data: response,
                        replyId: parsedData.replyId,
                    }));
                } else {
                    callback(parsedData.data);
                }
            }
        });

        return {
            cancel: () => {
                ws.off("message", callback);
            }
        };
    }

    onDisconnect(callback: (ws: WebSocket) => void): AppEventToken {
        if (!this.wss) {
            throw new Error("Websocket server is not started");
        }
        this.wss?.on("close", callback);

        return {
            cancel: () => {
                this.wss?.off("close", callback);
            }
        };
    }

    send<U extends keyof T>(type: U, data: T[U]["data"], ws: WebSocket): void {
        ws.send(JSON.stringify({
            type,
            data,
        }));
    }

    announce<U extends keyof T>(type: U, data: T[U]["data"]): void {
        if (!this.wss) {
            throw new Error("Websocket server is not started");
        }
        this.wss?.clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type,
                    data,
                }));
            }
        });
    }

    close(): void {
        this.wss?.close();
    }
}

export class Client<T extends Record<any, WSEventProp>> {
    ws: WebSocket | null = null;
    private _id: number = 0;

    constructor(private url: string) {
    }

    public static construct<T extends Record<any, WSEventProp>>(host: string, port: number): Client<T> {
        return new Client<T>(url.format({
            protocol: "ws",
            hostname: host,
            port,
        }));
    }

    connect(): this {
        this.ws = new WebSocket(this.url);
        return this;
    }

    onMessage<U extends keyof T>(type: U, callback: (data: T[U]["data"]) => void): AppEventToken {
        if (!this.ws) {
            throw new Error("Websocket client is not connected");
        }
        this.ws.on("message", (data) => {
            const parsedData = JSON.parse(data.toString());
            if (parsedData.type === type) {
                callback(parsedData.data);
            }
        });

        return {
            cancel: () => {
                this.ws?.off("message", callback);
            }
        };
    }

    onReply<U extends keyof T>(type: U, replyId: string, callback: (data: T[U]["response"]) => void): AppEventToken {
        if (!this.ws) {
            throw new Error("Websocket client is not connected");
        }
        const listener = (raw: any) => {
            const data: WSData<T[U]> = JSON.parse(raw.toString());
            if (data.type === type && data.replyId === replyId) {
                callback(data.data);
                this.ws?.off("message", listener);
            }
        };
        this.ws.on("message", listener);

        return {
            cancel: () => {
                this.ws?.off("message", callback);
            }
        };
    }

    send<U extends keyof T>(type: U, data: T[U]["data"]): void {
        if (!this.ws) {
            throw new Error("Websocket client is not connected");
        }
        this.ws.send(JSON.stringify({
            type,
            data,
        }));
    }

    close(): void {
        this.ws?.close();
    }

    fetch<U extends keyof T>(type: U, data: T[U]["data"]): Promise<T[U]["response"]> {
        return new Promise((resolve) => {
            if (!this.ws) {
                throw new Error("Websocket client is not connected");
            }
            const replyId = String(this._id++);
            this.ws.send(JSON.stringify({
                type,
                data,
                replyId,
            }));
            this.onReply(type, replyId, (response) => {
                resolve(response);
            });
        });
    }

    async forSocketToOpen(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.ws) {
                throw new Error("Websocket client is not connected");
            }
            if (this.ws.readyState === WebSocket.OPEN) {
                resolve();
            }
            this.ws.on("open", () => {
                resolve();
            });
        });
    }
}
