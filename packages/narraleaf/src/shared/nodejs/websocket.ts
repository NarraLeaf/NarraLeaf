import { AppEventToken } from "@/main/app/types";
import url from "url";
import { WebSocket } from "ws";
import { WSData, WSEventProp } from "@narraleaf/shared";

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
