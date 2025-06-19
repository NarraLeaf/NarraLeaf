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
import { Page, Layout } from "narraleaf-react";
import { useApp } from "@/client/components/lib/providers/AppProvider";
import { CriticalRendererProcessError } from "@/main/utils/error";

export function Pages({ appRouterData }: { appRouterData: ProductionAppRouterModuleData | AppRouterModuleData }) {
    const app = useApp();
    const { root } = appRouterData;

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

    const createLayout = (layout: ProductionLayoutModuleDir | LayoutModuleDir): React.ReactNode => {
        const { name, isSlug, layout: page, indexHandler, children } = layout;
        const sourcePath = "path" in layout ? layout.path : null;
        const layoutName = isSlug ? `:${name}` : name;

        const childrenNodes = children.map((v) => {
            if ("module" in v) {
                return createPage(v);
            } else {
                return createLayout(v);
            }
        }).filter(Boolean);
        const LayoutWrapper = page ? assertComponent(page.module, sourcePath ?? undefined) : undefined;

        if (LayoutWrapper) {
            return (
                <RouterErrorBoundary path={sourcePath ?? undefined} appInfo={app.config.appInfo} key={layoutName}>
                    <Layout name={layoutName} key={layoutName}>
                        <LayoutWrapper>
                            {indexHandler && createPage(indexHandler)}
                            {childrenNodes}
                        </LayoutWrapper>
                    </Layout>
                </RouterErrorBoundary>
            );
        }

        return (
            <RouterErrorBoundary path={sourcePath ?? undefined} appInfo={app.config.appInfo} key={layoutName}>
                <Layout name={layoutName} key={layoutName}>
                    {indexHandler && createPage(indexHandler)}
                    {childrenNodes}
                </Layout>
            </RouterErrorBoundary>
        );
    };

    const createPage = (page: ProductionPageModuleData | PageModuleData): React.ReactNode => {
        const { name, module } = page;
        const sourcePath = "path" in page ? page.path : null;

        const PageNode = assertComponent(module, sourcePath ?? undefined);

        return (
            <RouterErrorBoundary path={sourcePath ?? undefined} appInfo={app.config.appInfo} key={name}>
                <Page name={name} key={name}>
                    <PageNode />                    
                </Page>
            </RouterErrorBoundary>
        );
    };

    const {layout, indexHandler, children} = root;
    const rootNodes = children.map((v) => {
        if ("module" in v) {
            return createPage(v);
        } else {
            return createLayout(v);
        }
    }).filter(Boolean);
    
    if (indexHandler) {
        const PageNode = assertComponent(indexHandler.module, "path" in indexHandler ? indexHandler.path : undefined);
        rootNodes.push(
            <RouterErrorBoundary appInfo={app.config.appInfo} key={"/"}>
                <Page name={null} key={null}>
                    <PageNode />
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
