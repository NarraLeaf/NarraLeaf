
export type AppMeta = {
    publicDir: string;
    rootDir: string;
    httpMode?: {
        enabled: boolean;
        port: number;
    };
};

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

export type DevServerToken = {
    close(): Promise<void>;
};

export type ClosableToken = {
    close(): Promise<void>;
};

export enum DevServerEvent {
    RequestPageRefresh = "narraleaf_dev:request_page_refresh",
    RequestMainQuit = "narraleaf_dev:request_main_quit",
    FetchMetadata = "narraleaf_dev:fetch_metadata",
}

export type DevServerEvents = {
    [DevServerEvent.RequestPageRefresh]: {
        type: WSEventType.Message;
        data: {};
    };
    [DevServerEvent.RequestMainQuit]: {
        type: WSEventType.Message;
        data: {};
    };
    [DevServerEvent.FetchMetadata]: {
        type: WSEventType.Message;
        data: {};
        response: AppMeta;
    };
};