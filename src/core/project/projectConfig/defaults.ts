import {BaseProjectConfig} from "@core/project/projectConfig/baseProject";


export const DefaultProjectConfig: BaseProjectConfig = {
    renderer: {
        baseDir: "renderer",
    },
    story: {
        entry: "story/entry.js",
    },
    main: "main/index.js",
};
