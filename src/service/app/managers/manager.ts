import { SidecarInternalError } from "@/service/utils/error";

export abstract class Manager<Dependencies extends Manager<any>[] | null = null> {
    private _initialized = false;
    private _dependencies: Dependencies | undefined;

    protected abstract init(): Promise<any>;

    public async initializeManager(
        ...[dependencies]: Dependencies extends null
            ? []
            : [dependencies: Dependencies]
    ): Promise<this> {
        if (this._initialized) {
            return this;
        }
        this._dependencies = dependencies as Dependencies;

        if (dependencies) {
            for (const dependency of dependencies) {
                if (!dependency._initialized) {
                    throw new SidecarInternalError("Dependency not initialized");
                }
            }
        }
        await this.init();

        this._initialized = true;

        return this;
    }

    protected getDependencies(): Dependencies extends null ? [] : Dependencies {
        return (this._dependencies || []) as Dependencies extends null ? [] : Dependencies;
    }
}
