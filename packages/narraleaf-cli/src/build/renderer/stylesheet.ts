import { App } from "@/interface/app";
import { WebpackModule } from "@/build/webpack";
import fs from "fs";

export class StyleSheet extends WebpackModule {
    public test: RegExp = /\.css$/;
    public exclude: RegExp = /node_modules/;

    constructor(private usePostcss: boolean = true) {
        super();
    }

    public getLoader(app: App) {
        const loaders: any[] = [
            "style-loader",
            "css-loader",
        ];

        if (this.usePostcss) {
            const tailwindConfigPath = app.resolvePath("tailwind.config.js");
            const hasTailwindConfig = fs.existsSync(tailwindConfigPath);

            const plugins: any[] = [
                // Always include autoprefixer by default
                "autoprefixer",
            ];

            // Only add tailwindcss plugin when config file exists
            if (hasTailwindConfig) {
                plugins.unshift([
                    "tailwindcss",
                    {
                        config: tailwindConfigPath,
                    },
                ]);
            }

            loaders.push({
                loader: "postcss-loader",
                options: {
                    postcssOptions: {
                        plugins,
                    },
                },
            });
        }

        return loaders;
    }
}
