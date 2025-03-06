import ejs from "ejs";
import {BuildTempStructure as Structure, StructureEntityType} from "@core/build/renderer/prepare";
import RendererEntryTemplateHTML from "@/assets/renderer-entry-template-html.ejs";
import RendererEntryTemplateApp from "@/assets/renderer-entry-template-app.ejs";
import {safeImportPath} from "@/utils/str";

export const RendererHTMLEntryPoint: Structure = {
    type: StructureEntityType.File,
    name: "index.html",
    src: (rendererProject) => ejs.render(RendererEntryTemplateHTML, {
        version: rendererProject.project.app.config.version,
        title: rendererProject.project.name,
    })
};

export function createRendererAppStructure(
    pages: string[],
): Structure {
    return {
        type: StructureEntityType.File,
        name: "App.tsx",
        src: (rendererProject) => ejs.render(RendererEntryTemplateApp, {
            version: rendererProject.project.app.config.version,
            appPath: safeImportPath(rendererProject.getAppEntry()),
            pages: pages.map((page) => safeImportPath(page)),
        })
    };
}

