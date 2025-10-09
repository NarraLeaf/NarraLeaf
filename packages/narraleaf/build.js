/*!
 *       ___           ___           ___           ___           ___           ___       ___           ___           ___
 *      /\__\         /\  \         /\  \         /\  \         /\  \         /\__\     /\  \         /\  \         /\  \
 *     /::|  |       /::\  \       /::\  \       /::\  \       /::\  \       /:/  /    /::\  \       /::\  \       /::\  \
 *    /:|:|  |      /:/\:\  \     /:/\:\  \     /:/\:\  \     /:/\:\  \     /:/  /    /:/\:\  \     /:/\:\  \     /:/\:\  \
 *   /:/|:|  |__   /::\~\:\  \   /::\~\:\  \   /::\~\:\  \   /::\~\:\  \   /:/  /    /::\~\:\  \   /::\~\:\  \   /::\~\:\  \
 *  /:/ |:| /\__\ /:/\:\ \:\__\ /:/\:\ \:\__\ /:/\:\ \:\__\ /:/\:\ \:\__\ /:/__/    /:/\:\ \:\__\ /:/\:\ \:\__\ /:/\:\ \:\__\
 *  \/__|:|/:/  / \/__\:\/:/  / \/_|::\/:/  / \/_|::\/:/  / \/__\:\/:/  / \:\  \    \:\~\:\ \/__/ \/__\:\/:/  / \/__\:\ \/__/
 *      |:/:/  /       \::/  /     |:|::/  /     |:|::/  /       \::/  /   \:\  \    \:\ \:\__\        \::/  /       \:\__\
 *      |::/  /        /:/  /      |:|\/__/      |:|\/__/        /:/  /     \:\  \    \:\ \/__/        /:/  /         \/__/
 *      /:/  /        /:/  /       |:|  |        |:|  |         /:/  /       \:\__\    \:\__\         /:/  /
 *      \/__/         \/__/         \|__|         \|__|         \/__/         \/__/     \/__/         \/__/
 *
 * NarraLeaf https://github.com/NarraLeaf/NarraLeaf
 * © 2025 Nomen (helloyork)
 * A new definition of Visual Novel Engine
 *
 * @author: Nomen (helloyork) https://github.com/helloyork
 * @license: MPL-2.0
 */
/*!
 * NarraLeaf-React https://github.com/NarraLeaf/narraleaf-react
 * © 2025 Nomen (helloyork)
 * Make your own visual novel using a lightweight front-end visual novel framework.
 *
 * @author: Nomen (helloyork) https://github.com/helloyork
 * @license: MPL-2.0
 */
const esbuild = require('esbuild');
const CssModulesPlugin = require('esbuild-css-modules-plugin');

const isDev = process.argv.includes('--dev');
const LICENSE_TEXT = `/*!
 *       ___           ___           ___           ___           ___           ___       ___           ___           ___
 *      /\\__\\         /\\  \\         /\\  \\         /\\  \\         /\\  \\         /\\__\\     /\\  \\         /\\  \\         /\\  \\
 *     /::|  |       /::\\  \\       /::\\  \\       /::\\  \\       /::\\  \\       /:/  /    /::\\  \\       /::\\  \\       /::\\  \\
 *    /:|:|  |      /:/\\:\\  \\     /:/\\:\\  \\     /:/\\:\\  \\     /:/\\:\\  \\     /:/  /    /:/\\:\\  \\     /:/\\:\\  \\     /:/\\:\\  \\
 *   /:/|:|  |__   /::\\~\\:\\  \\   /::\\~\\:\\  \\   /::\\~\\:\\  \\   /::\\~\\:\\  \\   /:/  /    /::\\~\\:\\  \\   /::\\~\\:\\  \\   /::\\~\\:\\  \\
 *  /:/ |:| /\\__\\ /:/\\:\\ \\:\\__\\ /:/\\:\\ \\:\\__\\ /:/\\:\\ \\:\\__\\ /:/\\:\\ \\:\\__\\ /:/__/    /:/\\:\\ \\:\\__\\ /:/\\:\\ \\:\\__\\ /:/\\:\\ \\:\\__\\
 *  \\/__|:|/:/  / \\/__\\:\\/:/  / \\/_|::\\/:/  / \\/_|::\\/:/  / \\/__\\:\\/:/  / \\:\\  \\    \\:\\~\\:\\ \\/__/ \\/__\\:\\/:/  / \\/__\\:\\ \\/__/
 *      |:/:/  /       \\::/  /     |:|::/  /     |:|::/  /       \\::/  /   \\:\\  \\    \\:\\ \\:\\__\\        \\::/  /       \\:\\__\\
 *      |::/  /        /:/  /      |:|\\/__/      |:|\\/__/        /:/  /     \\:\\  \\    \\:\\ \\/__/        /:/  /         \\/__/
 *      /:/  /        /:/  /       |:|  |        |:|  |         /:/  /       \\:\\__\\    \\:\\__\\         /:/  /
 *      \\/__/         \\/__/         \\|__|         \\|__|         \\/__/         \\/__/     \\/__/         \\/__/
 *
 * NarraLeaf https://github.com/NarraLeaf/NarraLeaf
 * © 2025 Nomen (helloyork)
 * A new definition of Visual Novel Engine
 *
 * @author: Nomen (helloyork) https://github.com/helloyork
 * @license: MPL-2.0
 */`;

if (isDev) {
  console.log("Building in dev mode");
} else {
  console.log("Building in production mode");
}

const external = [
  "electron",
  "electron-builder",
  "narraleaf-react",
  "react/jsx-runtime",
  "react",
  "react-dom",
];

const alias = {
  '@': './src',
  '@main': './src/main',
  '@renderer': './src/renderer',
  '@shared': './src/shared',
};

const common = {
  alias,
  bundle: true,
  logLevel: 'info',
  platform: 'node',
  banner: {
    js: LICENSE_TEXT
  },
  minify: !isDev,
}

Promise.all([
  esbuild.build({
    ...common,
    entryPoints: ['src/main/index.ts'],
    external,
    format: 'esm',
    outfile: 'dist/index.mjs',
    target: 'node22',
    sourcemap: true,
  }),
  esbuild.build({
    ...common,
    entryPoints: ['src/main/index.ts'],
    external,
    format: 'cjs',
    outfile: 'dist/index.cjs',
    sourcemap: true,
    target: 'node22',
  }),
  esbuild.build({
    ...common,
    entryPoints: ['src/renderer/index.ts'],
    external,
    format: 'esm',
    outfile: 'dist/renderer.mjs',
    platform: 'browser',
    minify: !isDev,
    plugins: [
      CssModulesPlugin({
        inject: {
          insertAt: 'top',
        },
        force: true,
      }),
    ],
    metafile: true,
    loader: {
      '.css': 'css',
    },
    sourcemap: true,
  }),
  esbuild.build({
    ...common,
    entryPoints: ['src/main/preload.ts'],
    external,
    format: 'cjs',
    outfile: 'dist/preload.js',
    target: 'node16',
    minify: !isDev,
  }),
  esbuild.build({
    ...common,
    entryPoints: ['src/config/index.ts'],
    external,
    format: 'cjs',
    outfile: 'dist/config.cjs',
    target: 'node16',
    minify: !isDev,
  }),
  esbuild.build({
    ...common,
    entryPoints: ['src/config/index.ts'],
    external,
    format: 'esm',
    outfile: 'dist/config.mjs',
    target: 'node16',
    minify: !isDev,
  }),
]).catch(() => process.exit(1));
