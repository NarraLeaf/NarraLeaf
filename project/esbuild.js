import esbuild from 'esbuild';

const external = [
  "@babel/core",
  "@babel/preset-env",
  "@babel/preset-react",
  "@babel/preset-typescript",
  "@inquirer/prompts",
  "@swc/core",
  "@swc/core-win32-x64-msvc",
  "@swc/wasm",
  "babel-loader",
  "commander",
  "chalk",
  "ejs",
  "electron",
  "electron-builder",
  "html-webpack-plugin",
  "jsonc",
  "lodash",
  "uglify-js",
  "webpack",
];

const alias = {
  '@': './src',
  '@core': './src/core',
  '@cli': './src/cli',
  '@client': './src/client',
  '@main': './src/main',
};

Promise.all([
  esbuild.build({
    alias,
    bundle: true,
    entryPoints: ['src/index.ts'],
    external,
    format: 'esm',
    loader: {
      ".ejs": "text",
    },
    logLevel: 'info',
    outfile: 'dist/index.mjs',
    platform: 'node',
    sourcemap: true
  }),
  esbuild.build({
    alias,
    bundle: true,
    entryPoints: ['src/cli.ts'],
    external,
    format: 'esm',
    loader: {
      ".ejs": "text",
    },
    logLevel: 'info',
    outfile: 'dist/cli.mjs',
    platform: 'node',
  }),
  esbuild.build({
    alias,
    bundle: true,
    entryPoints: ['src/client.ts'],
    external,
    format: 'esm',
    loader: {
      ".ejs": "text",
    },
    logLevel: 'info',
    outfile: 'dist/client.mjs',
    platform: 'node',
  }),
]).catch(() => process.exit(1));
