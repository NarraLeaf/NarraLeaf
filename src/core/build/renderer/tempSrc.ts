import ejs from "ejs";
import {BuildTempStructure as Structure, StructureEntityType} from "@core/build/renderer/prepare";
import RendererEntryTemplateHTML from "@/assets/renderer-entry-template-html.ejs";
import RendererEntryTemplateApp from "@/assets/renderer-entry-template-app.ejs";
import {safeImportPath} from "@/utils/str";

export const BuildTempStructure: Structure[] = [
    {
        type: StructureEntityType.File,
        name: "index.html",
        src: (rendererProject) => ejs.render(RendererEntryTemplateHTML, {
            title: rendererProject.project.name,
        })
    },
    {
        type: StructureEntityType.File,
        name: "app.tsx",
        src: (rendererProject) => ejs.render(RendererEntryTemplateApp, {
            appPath: safeImportPath(rendererProject.getAppEntry()),
        })
    },
];
