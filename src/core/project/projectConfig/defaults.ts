import {BaseProjectUserConfig} from "@core/project/projectConfig/baseProject";
import _ from "lodash";


export const DefaultProjectConfig: BaseProjectUserConfig = {
    renderer: {
        baseDir: "renderer",
    },
    story: {
        entry: "story/entry.js",
    },
    main: "main/index.js",
    temp: ".narraleaf",
};

export function mergeConfig<T, U>(base: T, user: U): T & U {
    return _.merge({}, base, user);
}
