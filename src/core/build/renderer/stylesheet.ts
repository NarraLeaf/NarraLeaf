import { App } from "@/cli/app";
import { WebpackModule } from "@core/build/webpack";
import path from "path";

export class StyleSheet extends WebpackModule {
    public test: RegExp = /\.css$/;
    public exclude: RegExp = /node_modules/;

    constructor(private usePostcss: boolean = true) {
        super();
    }

    public getLoader(app: App) {
        return [
            "style-loader",
            "css-loader",
            ...(this.usePostcss ? [{
                loader: "postcss-loader",
                options: {
                    postcssOptions: {
                        plugins: [
                            [
                                "tailwindcss",
                                {
                                    config: app.resolvePath("tailwind.config.js"),
                                }
                            ],
                            "autoprefixer",
                        ],
                    },
                },
            }] : []),
        ];
    }
}
