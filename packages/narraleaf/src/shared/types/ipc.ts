export enum IPCType {
    Host = "host",
    Client = "client",
}

export enum IPCMessageType {
    message = "message",
    request = "request",
}

export enum SubNamespace {
    Reply = "reply",
}

export type IPCConfiguration = {
    type: IPCMessageType.message;
    consumer: IPCType;
    data: Record<any, any>;
    response: never;
} | {
    type: IPCMessageType.request;
    consumer: IPCType;
    data: Record<any, any>;
    response: Record<any, any> | null | void;
};

type Opposite<T extends IPCType> = T extends IPCType.Host ? IPCType.Client : IPCType.Host;
export type OnlyMessage<T extends Record<any, IPCConfiguration>, U extends IPCType> = {
    [K in keyof T]: T[K] extends { consumer: Opposite<U> } ?
        T[K] extends { type: IPCMessageType.message } ? K : never : never;
};
export type OnlyRequest<T extends Record<any, IPCConfiguration>, U extends IPCType> = {
    [K in keyof T]: T[K] extends { consumer: Opposite<U> } ?
        T[K] extends { type: IPCMessageType.request } ? K : never : never;
}

export class IPC<T extends Record<any, IPCConfiguration>, U extends IPCType> {
    protected constructor(public type: U, public namespace: string) {
    }

    protected getEventName(key: keyof T, sub?: SubNamespace): string {
        return sub ? `${this.namespace}.${sub}:${String(key)}` : `${this.namespace}:${String(key)}`;
    }
}
