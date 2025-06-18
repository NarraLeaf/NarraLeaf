import ejs from "ejs";
import {BuildTempStructure as Structure, StructureEntityType} from "@core/build/renderer/prepare";
import RendererEntryTemplateHTML from "@/assets/renderer-entry-template-html.ejs";
import RendererEntryTemplateApp from "@/assets/renderer-entry-template-app.ejs";
import {safeImportPath} from "@/utils/str";
import url from "url";
import path from "path";
import {AppHost, AppProtocol, RendererOutputFileName} from "@core/build/constants";
import { createAppRouter, AppRouterData, LayoutDir, PageData } from "@core/build/renderer/router/scan";
import { RendererProject } from "@core/project/renderer/rendererProject";
import { Project } from "@core/project/project";

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

function createRelativeImportPath(fromPath: string, toPath: string): string {
    const relative = path.relative(path.dirname(fromPath), toPath);
    const normalized = relative.startsWith('.') ? relative : `./${relative}`;
    return safeImportPath(normalized);
}

export async function createRendererAppStructure(
    rendererProject: RendererProject,
    isProduction: boolean = false
): Promise<Structure> {
    const appRouterData = await createAppRouter(rendererProject);
    
    // Collect all file paths for imports
    const allPaths: { path: string, id: string }[] = [];
    let pathCounter = 0;
    
    function collectPaths(item: LayoutDir | PageData, prefix: string = ""): void {
        if ('children' in item) {
            // LayoutDir
            if (item.layout) {
                allPaths.push({ path: item.layout.path, id: `${prefix}_layout_${pathCounter++}` });
            }
            if (item.indexHandler) {
                allPaths.push({ path: item.indexHandler.path, id: `${prefix}_index_${pathCounter++}` });
            }
            item.children.forEach((child, index) => {
                collectPaths(child, `${prefix}_child_${index}`);
            });
        } else {
            // PageData
            allPaths.push({ path: item.path, id: `${prefix}_page_${pathCounter++}` });
        }
    }
    
    collectPaths(appRouterData.root);
    
    // Create module map for easier lookup
    const moduleMap: Record<string, string> = {};
    allPaths.forEach(({ path, id }) => {
        moduleMap[path] = id;
    });
    
    return {
        type: StructureEntityType.File,
        name: "App.tsx",
        src: (project) => {
            // Generate the build temp directory path where App.tsx will be placed
            const buildTempDir = isProduction 
                ? rendererProject.project.getTempDir(Project.TempNamespace.RendererBuildTemp) 
                : rendererProject.project.getDevTempDir(Project.DevTempNamespace.RendererBuildTemp);
            const appTsxPath = path.join(buildTempDir, "App.tsx");
            
            const processedPaths = allPaths.map(({ path: modulePath, id }) => {
                const finalPath = isProduction 
                    ? createRelativeImportPath(appTsxPath, modulePath)
                    : safeImportPath(modulePath);
                return { path: finalPath, id };
            });
            
            return ejs.render(RendererEntryTemplateApp, {
                version: project.project.app.config.version,
                appPath: isProduction 
                    ? createRelativeImportPath(appTsxPath, rendererProject.getAppEntry())
                    : safeImportPath(rendererProject.getAppEntry()),
                allPaths: processedPaths,
                appRouterData,
                moduleMap,
                isProduction,
            });
        }
    };
}

