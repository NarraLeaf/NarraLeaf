// import esbuild from 'esbuild';
const esbuild = require('esbuild');

const external = [
  "babel-loader",
  "commander",
  "electron",
  "electron-builder",
  "webpack",
  "chalk",
  "html-webpack-plugin",
  "narraleaf-react",
  "react/jsx-runtime",
  "react",
  "react-dom",
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
    sourcemap: true,
    target: 'node22'
  }),
  esbuild.build({
    alias,
    bundle: true,
    entryPoints: ['src/cli.ts'],
    external,
    format: 'cjs',
    loader: {
      ".ejs": "text",
    },
    logLevel: 'info',
    outfile: 'dist/cli.cjs',
    platform: 'node',
    target: 'node16'
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
    platform: 'browser',
  }),
]).catch(() => process.exit(1));
