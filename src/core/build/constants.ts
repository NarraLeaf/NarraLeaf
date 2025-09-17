export const RendererOutputFileName = "App.js";
export const RendererOutputHTMLFileName = "index.html";
export const MainOutputFileName = "main.js";
export const DefaultDevServerPort = 5050;
export const DefaultDevHTTPServerPort = 5051;
export const ENV_DEV_SERVER_PORT = "NARRALEAF_DEV_SERVER_PORT";
export const NarraLeaf = "NarraLeaf" as const;
export const PreloadFileName = "preload.js";
export const AppProtocol = "app" as const;
export const AppPublicHostName = "localhost";
export const RendererHomePage = "home";
export enum AppHost {
    Public = "localhost",
    Root = "localhost",
    Renderer = "localhost",
    DevServer = "__dev_server",
}
export const QuickSaveId = "quick-save" as const;