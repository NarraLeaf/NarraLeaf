import { merge } from "lodash";
import {BaseProjectConfig} from "@/project/projectConfig/baseProject";
import {DefaultDevHTTPServerPort, DefaultDevServerPort} from "@narraleaf/shared";


export const DefaultProjectConfig: BaseProjectConfig = {
    build: {
        appId: "com.example.App",
        copyright: "",
        dev: false,
        dist: "dist",
        productName: "Example App",
        targets: [],
    },
    main: "main/index.js",
    renderer: {
        baseDir: "renderer",
        allowHTTP: false,
        httpDevServer: false,
        httpDevServerPort: DefaultDevHTTPServerPort,
    },
    temp: ".narraleaf",
    dev: {
        port: DefaultDevServerPort,
    },
    resources: "assets",
};

export function mergeConfig<T, U>(base: T, user: U): T & U {
    return merge({}, base, user);
}
