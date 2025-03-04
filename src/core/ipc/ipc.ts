
export enum IPCType {
    Host = "host",
    Client = "client",
}

export enum IPCMessageType {
    message = "message",
    request = "request",
}

export type IPCConfiguration = {
    type: IPCMessageType.message;
    consumer: IPCType;
    data: Record<any, any>;
} | {
    type: IPCMessageType.request;
    consumer: IPCType;
    data: Record<any, any>;
    response: Record<any, any>;
} | {
    type: IPCMessageType;
    consumer: IPCType;
    data: Record<any, any>;
    response?: Record<any, any>;
};

export type IPCMessageRegistration<T extends IPCConfiguration> = {

};

export class IPC<T extends Record<any, IPCConfiguration>> {
    private listeners: Record<keyof T, ((data: T[keyof T]["data"]) => void)[]> = {} as any;

    constructor(public type: IPCType) {
    }
}
