import {DirStructureDefinition, ProjectFileType} from "@core/project/projectConfig/parser";

export const AppProjectRendererStructure: DirStructureDefinition<{
    "public": string;
    "pages": string;
    "app": string;
}> = {
    contains: {
        "public": {
            path: "public",
            type: ProjectFileType.DIR,
            validator: null
        },
        "pages": {
            path: "pages",
            type: ProjectFileType.DIR,
            validator: null
        },
        "app": {
            path: ["app.tsx", "app.jsx"],
            type: ProjectFileType.FILE,
            validator: null
        }
    }
};
