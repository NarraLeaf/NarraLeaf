import { Tasks } from "@/service/utils/data";
import type { StoreProvider } from "../managers/storage/storeProvider";
import { Service } from "../service";
import { ServiceEventCallback, ServiceEvents, ServiceEventToken } from "../types";
import { API } from "./API";

export interface AppConfig {
    store: StoreProvider | undefined;

    deleteCorruptedSaves: boolean;
}

export class App extends API {
    private service: Service;
    private tasks: Tasks;

    constructor(config: AppConfig) {
        super(config);

        const serviceConfig = {
            store: config.store,
            deleteCorruptedSaves: config.deleteCorruptedSaves,
        };
        this.service = new Service(serviceConfig);
        this.tasks = new Tasks();

        this.init();
    }

    public onReady(callback: ServiceEventCallback<"ready">): ServiceEventToken {
        return this.registerEvent("ready", callback);
    }

    private async init() {
        await this.tasks.push(this.service.prepare());
    }

    private registerEvent<T extends keyof ServiceEvents>(
        event: T,
        callback: ServiceEventCallback<T>
    ): ServiceEventToken {
        this.service.events.on(event, callback as any);

        return {
            cancel: () => {
                this.service.events.off(event, callback as any);
            },
        };
    }
}

