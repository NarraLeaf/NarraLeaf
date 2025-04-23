import ejs from "ejs";
import {BuildTempStructure as Structure, StructureEntityType} from "@core/build/renderer/prepare";
import RendererEntryTemplateHTML from "@/assets/renderer-entry-template-html.ejs";
import RendererEntryTemplateApp from "@/assets/renderer-entry-template-app.ejs";
import {safeImportPath} from "@/utils/str";
import url from "url";
import {AppHost, AppProtocol, RendererOutputFileName} from "@core/build/constants";

export const RendererHTMLEntryPoint: Structure = {
    type: StructureEntityType.File,
    name: "index.html",
    src: (rendererProject, devMode: boolean) => ejs.render(RendererEntryTemplateHTML, {
        version: rendererProject.project.app.config.version,
        title: rendererProject.project.name,
        base: url.format({
            protocol: AppProtocol,
            slashes: true,
            hostname: AppHost.Public,
        }),
        script: url.format({
            protocol: AppProtocol,
            slashes: true,
            hostname: AppHost.Renderer,
            pathname: RendererOutputFileName,
        }),
        protocol: AppProtocol,
        allowHTTP: rendererProject.project.config.renderer.allowHTTP,
        devMode
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

