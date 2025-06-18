/**
 * scan.ts用于扫描目录并且返回目录结构
 * 从根目录出发，包含以下约定：
 * 目录名可以以[开头，包含一个字母/数字/下划线/拉丁文/亚洲文字，并且以]结尾时，视为slug
 * 目录下的layout.(ts|js|tsx|jsx)视作layout文件，接受children并且嵌入
 * 目录下的index.(ts|js|tsx|jsx)视作默认处理器页面，当没有其他页面匹配时渲染
 * 在根目录下的index.(ts|js|tsx|jsx)视为主页
 * 任何其他文件名视作page文件，不接受children，并且名字不能包含"[]"
 */

import { RendererProject } from "@/core/project/renderer/rendererProject";
import { Fs } from "@/utils/nodejs/fs";
import path from "path";
import fs from "fs/promises";

export type AppRouterData = {
    root: LayoutDir;
};

export type LayoutDir = {
    name: string;
    path: string;
    isSlug: boolean;
    layout?: PageData;
    indexHandler?: PageData;
    children: (LayoutDir | PageData)[];
};

export type PageData = {
    name: string;
    path: string;
};

export async function createAppRouter(rendererProject: RendererProject): Promise<AppRouterData> {
    const logr = rendererProject.project.app.createLogger();
    const pagesDir = rendererProject.getPagesDir();

    const scan = async function (dir: string, indent: string = "", isLast: boolean = true, shouldLog: boolean = true): Promise<LayoutDir | null> {
        const files = await Fs.getFiles(dir, [".js", ".jsx", ".ts", ".tsx"]);
        if (!files.ok) {
            throw new Error(files.error);
        }

        const dirName = path.basename(dir);
        const isSlug = /^\[[a-zA-Z0-9_\u4e00-\u9fa5-]+\]$/.test(dirName);
        const name = isSlug ? dirName.slice(1, -1) : dirName;
        
        // layout file
        const layoutFile = files.data.find(file => {
            const fileName = path.basename(file, path.extname(file));
            return fileName === "layout";
        });
        const layout: PageData | undefined = layoutFile ? {
            name: "layout",
            path: layoutFile
        } : undefined;
        
        // index handler - check both local index file and parent directory's directory-name file
        let indexHandler: PageData | undefined;
        
        // First check for local index file
        const indexHandlerFile = files.data.find(file => {
            const fileName = path.basename(file, path.extname(file));
            return fileName === "index";
        });
        
        if (indexHandlerFile) {
            indexHandler = {
                name: "index",
                path: indexHandlerFile
            };
        } else if (!isSlug) {
            // If no local index file, check if parent directory has a file with the same name as current directory
            const parentDir = path.dirname(dir);
            const parentFilesResult = await Fs.getFiles(parentDir, [".js", ".jsx", ".ts", ".tsx"]);
            
            if (parentFilesResult.ok) {
                const parentDirNameFile = parentFilesResult.data.find(file => {
                    const fileName = path.basename(file, path.extname(file));
                    return fileName === dirName;
                });
                
                if (parentDirNameFile) {
                    indexHandler = {
                        name: "index",
                        path: parentDirNameFile
                    };
                }
            }
        }
        
        // Check for routing conflicts and handle parent directory's directory-name file
        if (!isSlug) {
            // Check if current directory has an index file
            const localIndexFile = files.data.find(file => {
                const fileName = path.basename(file, path.extname(file));
                return fileName === "index";
            });
            
            // Check if parent directory has a file with the same name as current directory
            const parentDir = path.dirname(dir);
            const parentFilesResult = await Fs.getFiles(parentDir, [".js", ".jsx", ".ts", ".tsx"]);
            
            if (parentFilesResult.ok) {
                const parentDirNameFile = parentFilesResult.data.find(file => {
                    const fileName = path.basename(file, path.extname(file));
                    return fileName === dirName;
                });
                
                if (parentDirNameFile && localIndexFile) {
                    const conflictMessage = `Routing conflict detected: Parent directory "${parentDir}" contains a file "${path.basename(parentDirNameFile)}" with the same name as directory "${dirName}", and directory "${dir}" also contains an index file. This creates a routing conflict as both would handle the same route.`;
                    if (shouldLog) {
                        logr.error("❌ Routing conflict detected:");
                        logr.error(`   ${conflictMessage}`);
                    }
                    throw new Error(conflictMessage);
                }
            }
        }
        
        // output current directory
        if (shouldLog) {
            const prefix = indent + (isLast ? "└── " : "├── ");
            const slugIndicator = isSlug ? ` [${name}]` : "";
            // If this directory uses a parent file as index, show it in the directory name
            const parentIndexIndicator = (!isSlug && indexHandler && !indexHandler.path.startsWith(dir)) ? ` (index: ${path.basename(indexHandler.path)})` : "";
            logr.info(`${prefix}📁 ${name}${slugIndicator}${parentIndexIndicator}`);
        }
        
        const children: (LayoutDir | PageData)[] = [];
        
        // First scan subdirectories to collect information about used files
        const dirsResult = await Fs.listDirs(dir);
        const subdirs: LayoutDir[] = [];
        const usedAsIndexHandlerFiles = new Set<string>();
        
        if (dirsResult.ok) {
            for (let i = 0; i < dirsResult.data.length; i++) {
                const subdir = dirsResult.data[i];
                const subdirPath = path.join(dir, subdir);
                const isLastSubdir = i === dirsResult.data.length - 1;
                const subdirIndent = indent + (isLast ? "    " : "│   ");
                // Scan subdirectories without logging, only collect data
                const subdirData = await scan(subdirPath, subdirIndent, isLastSubdir, false);
                if (subdirData) {
                    subdirs.push(subdirData);
                    // If this subdirectory uses a parent file as indexHandler, mark that file
                    if (subdirData.indexHandler && subdirData.indexHandler.path.startsWith(dir)) {
                        usedAsIndexHandlerFiles.add(subdirData.indexHandler.path);
                    }
                    // Also mark files that are used as index by subdirectories (from parent directory)
                    if (subdirData.indexHandler && !subdirData.indexHandler.path.startsWith(subdirPath)) {
                        usedAsIndexHandlerFiles.add(subdirData.indexHandler.path);
                    }
                }
            }
        }
        
        // Filter page files, excluding those used as indexHandler by subdirectories
        const pageFiles = files.data.filter(file => {
            const fileName = path.basename(file, path.extname(file));
            return fileName !== "layout" && fileName !== "index" && !usedAsIndexHandlerFiles.has(file);
        });
        
        // Check if there are other items after layout
        const hasItemsAfterLayout = pageFiles.length > 0 || subdirs.length > 0 || indexHandler;
        
        // Build all children to output (layout, index, page files, subdirs)
        const childrenToOutput: { type: 'layout' | 'index' | 'page' | 'dir', data: any }[] = [];
        if (layout) {
            childrenToOutput.push({ type: 'layout', data: layout });
        }
        // Only add indexHandler to children if it's a local file (not a parent directory file)
        if (indexHandler && indexHandler.path.startsWith(dir)) {
            childrenToOutput.push({ type: 'index', data: indexHandler });
        }
        for (const file of pageFiles) {
            childrenToOutput.push({ type: 'page', data: { name: path.basename(file, path.extname(file)), path: file } });
        }
        for (const subdir of subdirs) {
            childrenToOutput.push({ type: 'dir', data: subdir });
        }

        // Output all children with proper tree structure
        if (shouldLog) {
            for (let i = 0; i < childrenToOutput.length; i++) {
                const child = childrenToOutput[i];
                const isLastChild = i === childrenToOutput.length - 1;
                let prefix = indent + (isLast ? "    " : "│   ") + (isLastChild ? "└── " : "├── ");
                if (child.type === 'layout') {
                    logr.info(`${prefix}📄 layout${path.extname(child.data.path)} (layout)`);
                    children.push(child.data);
                } else if (child.type === 'index') {
                    logr.info(`${prefix}📄 ${path.basename(child.data.path, path.extname(child.data.path))}${path.extname(child.data.path)} (index)`);
                    children.push(child.data);
                } else if (child.type === 'page') {
                    logr.info(`${prefix}📄 ${child.data.name}${path.extname(child.data.path)}`);
                    children.push(child.data);
                } else if (child.type === 'dir') {
                    // Output the subdirectory itself
                    const subdirSlugIndicator = child.data.isSlug ? ` [${child.data.name}]` : "";
                    const subdirParentIndexIndicator = (!child.data.isSlug && child.data.indexHandler && !child.data.indexHandler.path.startsWith(child.data.path)) ? ` (index: ${path.basename(child.data.indexHandler.path)})` : "";
                    logr.info(`${prefix}📁 ${child.data.name}${subdirSlugIndicator}${subdirParentIndexIndicator}`);
                    
                    // Recursively output the subdirectory's contents
                    await outputSubdirContents(child.data, indent + (isLast ? "    " : "│   "), isLastChild);
                    children.push(child.data);
                }
            }
        } else {
            // If not logging, just add to children directly
            for (const child of childrenToOutput) {
                children.push(child.data);
            }
            if (indexHandler && !indexHandler.path.startsWith(dir)) {
                children.push(indexHandler);
            }
        }

        if (!layout && children.length === 0) {
            return null;
        }

        return {
            name,
            path: dir,
            isSlug,
            layout,
            indexHandler,
            children
        };
    };
    
    // Helper function: output subdirectory contents recursively
    const outputSubdirContents = async function (subdir: LayoutDir, parentIndent: string, isParentLast: boolean) {
        const childrenToOutput: { type: 'layout' | 'index' | 'page' | 'dir', data: any }[] = [];
        const processedPaths = new Set<string>();

        // Add layout file if exists
        if (subdir.layout) {
            childrenToOutput.push({ type: 'layout', data: subdir.layout });
            processedPaths.add(subdir.layout.path);
        }
        
        // Add index handler if exists
        if (subdir.indexHandler) {
            childrenToOutput.push({ type: 'index', data: subdir.indexHandler });
            processedPaths.add(subdir.indexHandler.path);
        }
        
        // Add page files and subdirectories
        for (const child of subdir.children) {
            if ('children' in child) {
                // This is a subdirectory (LayoutDir)
                childrenToOutput.push({ type: 'dir', data: child });
            } else if ('path' in child) {
                if (processedPaths.has(child.path)) {
                    continue;
                }
                // This is a page file (PageData)
                const fileName = path.basename(child.path, path.extname(child.path));
                if (fileName !== 'layout' && fileName !== 'index') {
                    childrenToOutput.push({ type: 'page', data: child });
                    processedPaths.add(child.path);
                }
            }
        }
        
        // Output all children with proper tree structure
        for (let i = 0; i < childrenToOutput.length; i++) {
            const child = childrenToOutput[i];
            const isLastChild = i === childrenToOutput.length - 1;
            let prefix = parentIndent + (isParentLast ? "    " : "│   ") + (isLastChild ? "└── " : "├── ");
            
            if (child.type === 'layout') {
                logr.info(`${prefix}📄 layout${path.extname(child.data.path)} (layout)`);
            } else if (child.type === 'index') {
                logr.info(`${prefix}📄 ${path.basename(child.data.path, path.extname(child.data.path))}${path.extname(child.data.path)} (index)`);
            } else if (child.type === 'page') {
                logr.info(`${prefix}📄 ${child.data.name}${path.extname(child.data.path)}`);
            } else if (child.type === 'dir') {
                // Output the subdirectory itself
                const subdirSlugIndicator = child.data.isSlug ? ` [${child.data.name}]` : "";
                const subdirParentIndexIndicator = (!child.data.isSlug && child.data.indexHandler && !child.data.indexHandler.path.startsWith(child.data.path)) ? ` (index: ${path.basename(child.data.indexHandler.path)})` : "";
                logr.info(`${prefix}📁 ${child.data.name}${subdirSlugIndicator}${subdirParentIndexIndicator}`);
                
                // Recursively output the subdirectory's contents
                await outputSubdirContents(child.data, parentIndent + (isParentLast ? "    " : "│   "), isLastChild);
            }
        }
    };
    
    logr.info("Start scanning pages directory...");
    const root = await scan(pagesDir);
    if (!root) {
        throw new Error("No pages found");
    }
    
    logr.info("✅ Pages directory structure scanning completed");

    return {
        root
    };
}
