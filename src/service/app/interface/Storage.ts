import { LocalFile, StorageConfig } from "@/service/app/managers/storage/fileSystem/localFile";
import { StoreProvider } from "@/service/app/managers/storage/storeProvider";
import { AppDataNamespace } from "../constants";

export class Storage {
    public static Dir(dir: string, config: Omit<StorageConfig, "dir"> = {}): StoreProvider {
        return new LocalFile({
            dir,
            ...config,
        });
    }
}
