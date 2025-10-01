import {WebSocket, WebSocketServer} from "ws";
import {EventEmitter} from "events";
import { AppEventToken } from "@/types/app";
import { WSEventProp, WSData } from "@narraleaf/shared";

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
