import React from "react";
import { HTMLMotionProps } from "motion/react";
import {
    AppRouterModuleData,
    ProductionAppRouterModuleData,
    ProductionLayoutModuleDir,
    ProductionPageModuleData,
    LayoutModuleDir,
    PageModuleData,
} from "@/client/app/app.types";
import { RouterErrorBoundary } from "@/client/components/errorHandling/RouterErrorBoundary";
import { Page, Layout } from "narraleaf-react";
import { useApp } from "../../hooks/useApp";

export function Pages({ appRouterData }: { appRouterData: ProductionAppRouterModuleData | AppRouterModuleData }) {
    const app = useApp();
    const { root } = appRouterData;
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
        const LayoutWrapper = page ? page.module.default : undefined;

        if (LayoutWrapper) {
            return (
                <RouterErrorBoundary path={sourcePath ?? undefined} appInfo={app.config.appInfo}>
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
            <RouterErrorBoundary path={sourcePath ?? undefined} appInfo={app.config.appInfo}>
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

        const PageNode = module.default;

        return (
            <RouterErrorBoundary path={sourcePath ?? undefined} appInfo={app.config.appInfo}>
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
    return [
        (layout && <React.Fragment key={layout.name}>
            
        </React.Fragment>),

    ];
}
