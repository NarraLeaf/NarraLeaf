import React from "react";
import {
    AppRouterModuleData,
    ProductionAppRouterModuleData,
    ProductionLayoutModuleDir,
    ProductionPageModuleData,
    LayoutModuleDir,
    PageModuleData,
    LayoutModule,
    PageModule,
} from "@/client/app/app.types";
import { RouterErrorBoundary } from "@/client/components/errorHandling/RouterErrorBoundary";
import { Page, Layout, LayoutRouterProvider } from "narraleaf-react";
import { useApp } from "@/client/components/lib/providers/AppProvider";
import { CriticalRendererProcessError } from "@/main/utils/error";
import { BaseAppErrorFallback } from "../../errorHandling/BaseAppErrorFallback";
import { motion, AnimatePresence } from "motion/react";

const ignorePageNames = ["index", "layout"];

export function Pages({ appRouterData }: { appRouterData: ProductionAppRouterModuleData | AppRouterModuleData }) {
    const app = useApp();
    const { root, errorHandler } = appRouterData;
    const ErrorFallbackComponent = errorHandler?.module?.default || BaseAppErrorFallback;

    const assertComponent = (module: LayoutModule | PageModule, path?: string): React.ComponentType<any> => {
        if (typeof module.default !== "function") {
            throw new CriticalRendererProcessError(
                "Error when tring to render a page or layout: LayoutModule or PageModule must be a function. "
                + "This is likely caused by a missing default export in the module."
                + (path ? `\nSource Path: ${path}` : "")
            );
        }
        return module.default;
    };

    const createLayout = (layout: ProductionLayoutModuleDir | LayoutModuleDir, parentPath: string, key?: string): React.ReactNode => {
        const { name, isSlug, layout: page, indexHandler, children } = layout;
        const sourcePath = "path" in layout ? layout.path : null;
        const layoutName = isSlug ? `:${name}` : name;

        const LayoutWrapper = page ? assertComponent(page.module, sourcePath ?? undefined) : undefined;
        const joinParentPath = (path: string) => {
            if (parentPath === "/") {
                return path;
            }
            return parentPath + "/" + path;
        };

        const childrenNodes = children.map((v, i) => {
            if ("module" in v) {
                if (ignorePageNames.includes(v.name)) return null;
                if (!LayoutWrapper) {
                    return (
                        <LayoutRouterProvider path={joinParentPath(layoutName)} key={`${layoutName}-${v.name}`}>
                            {createPage(v, undefined, i.toString())}
                        </LayoutRouterProvider>
                    );
                }
                return createPage(v, undefined, i.toString());
            } else {
                return createLayout(v, joinParentPath(layoutName), i.toString());
            }
        }).filter(Boolean);

        if (LayoutWrapper) {
            return (
                <RouterErrorBoundary path={sourcePath ?? undefined} appInfo={app.config.appInfo} key={key ?? layoutName} fallback={ErrorFallbackComponent}>
                    <Layout name={layoutName}>
                        <LayoutWrapper>
                            {indexHandler && createPage(indexHandler, null, "@index")}
                            {childrenNodes}
                        </LayoutWrapper>
                    </Layout>
                </RouterErrorBoundary>
            );
        }

        const allNodes = [
            ...(indexHandler ? [(
                <LayoutRouterProvider path={joinParentPath(layoutName)} key={`${layoutName}-index`}>
                    {createPage(indexHandler, null, "@index")}
                </LayoutRouterProvider>
            )] : []),
            ...childrenNodes
        ];
        
        return allNodes;
    };

    const createPage = (page: ProductionPageModuleData | PageModuleData, pageName?: string | null, key?: string): React.ReactNode => {
        const { name, module } = page;
        const sourcePath = "path" in page ? page.path : null;

        const configName = pageName !== undefined ? pageName : name;

        if (configName && ignorePageNames.includes(configName)) {
            throw new Error(`Page Ignoration Violation: Page name ${configName} is ignored. `);
        };

        const PageNode = assertComponent(module, sourcePath ?? undefined);

        return (
            <RouterErrorBoundary path={sourcePath ?? undefined} appInfo={app.config.appInfo} key={key ?? name} fallback={ErrorFallbackComponent}>
                <AnimatePresence mode="wait">
                    <Page name={configName} key={configName}>
                        <motion.div
                            key={`${configName}-motion`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            onAnimationStart={(definition) => {
                                console.log("Animation started:", definition, "for page:", configName);
                            }}
                            onAnimationComplete={(definition) => {
                                console.log("Animation completed:", definition, "for page:", configName);
                            }}
                        >
                            <PageNode key={configName ?? "index"} />
                        </motion.div>
                    </Page>
                </AnimatePresence>
            </RouterErrorBoundary>
        );
    };

    const {layout, indexHandler, children} = root;
    const rootNodes = children.map((v, i) => {
        if ("module" in v) {
            if (ignorePageNames.includes(v.name)) return null;
            return createPage(v, undefined, i.toString());
        } else {
            return createLayout(v, "/", i.toString());
        }
    }).filter(Boolean);
    
    if (indexHandler) {
        const PageNode = assertComponent(indexHandler.module, "path" in indexHandler ? indexHandler.path : undefined);
        rootNodes.push(
            <RouterErrorBoundary appInfo={app.config.appInfo} key={"/"} fallback={ErrorFallbackComponent}>
                <Page name={null}>
                    <PageNode key={"/"} />
                </Page>
            </RouterErrorBoundary>
        );
    }

    if (layout) {
        const RootLayout = assertComponent(layout.module, "path" in layout ? layout.path : undefined);
        return (
            <RootLayout>
                {rootNodes}
            </RootLayout>
        );
    }
    return rootNodes;
}
