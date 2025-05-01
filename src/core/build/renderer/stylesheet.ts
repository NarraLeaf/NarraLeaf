import { App } from "@/cli/app";
import {WebpackModule} from "@core/build/webpack";
import path from "path";

export class StyleSheet extends WebpackModule {
    public test: RegExp = /\.css$/;
    public exclude: RegExp = /node_modules/;

    public getLoader(app: App) {
        const nodeModulesDir = path.resolve(app.config.cliRoot, "node_modules");

        return [
            "style-loader",
            "css-loader",
            {
                loader: path.resolve(nodeModulesDir, "postcss-loader"),
                options: {
                    postcssOptions: {
                        plugins: [
                            [
                                path.resolve(nodeModulesDir, "tailwindcss"),
                                {
                                    config: app.resolvePath("tailwind.config.js"),
                                }
                            ],
                            path.resolve(nodeModulesDir, "autoprefixer"),
                        ],
                    },
                },
            },
        ];
    }
}
