import _ from "lodash";
import {BaseProjectConfig} from "@core/project/projectConfig/baseProject";
import {DefaultDevServerPort} from "@core/build/constants";


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
    },
    temp: ".narraleaf",
    dev: {
        port: DefaultDevServerPort,
    },
};

export function mergeConfig<T, U>(base: T, user: U): T & U {
    return _.merge({}, base, user);
}
