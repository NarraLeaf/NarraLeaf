import _ from "lodash";
import {BaseProjectConfig} from "@core/project/projectConfig/baseProject";


export const DefaultProjectConfig: BaseProjectConfig = {
    build: {
        appId: "com.example.app",
        copyright: "",
        dev: false,
        dist: "dist",
        productName: "Example App",
        targets: [],
    },
    main: "main/index.js",
    renderer: {
        baseDir: "renderer",
    },
    temp: ".narraleaf",
};

export function mergeConfig<T, U>(base: T, user: U): T & U {
    return _.merge({}, base, user);
}
