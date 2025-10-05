import { PlatformBuildTarget } from "../targets";

export type ProjectConfig = {
    build?: {
        appId?: string;
        copyright?: string;
        dev?: boolean;
        dist?: string;
        productName?: string;
        targets?: PlatformBuildTarget | PlatformBuildTarget[];
    };
    main?: string;
    renderer?: {
        baseDir?: string;
        allowHTTP?: boolean;
        httpDevServer?: boolean;
        httpDevServerPort?: number;
    };
    temp?: string;
    dev?: {
        port?: number;
    };
    resources?: string;
};