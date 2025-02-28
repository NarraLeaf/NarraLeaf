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

const common = {
  alias,
  bundle: true,
  loader: {
    ".ejs": "text",
  },
  logLevel: 'info',
  platform: 'node',
}

Promise.all([
  esbuild.build({
    ...common,
    entryPoints: ['src/index.ts'],
    external,
    format: 'esm',
    outfile: 'dist/index.mjs',
    target: 'node22'
  }),
  esbuild.build({
    ...common,
    entryPoints: ['src/index.ts'],
    external,
    format: 'cjs',
    outfile: 'dist/index.cjs',
    sourcemap: true,
    target: 'node22'
  }),
  esbuild.build({
    ...common,
    entryPoints: ['src/cli.ts'],
    external,
    format: 'cjs',
    outfile: 'dist/cli.cjs',
    target: 'node16'
  }),
  esbuild.build({
    ...common,
    entryPoints: ['src/client.ts'],
    external,
    format: 'esm',
    outfile: 'dist/client.mjs',
    platform: 'browser',
  }),
  esbuild.build({
    ...common,
    entryPoints: ['src/preload.ts'],
    external,
    format: 'cjs',
    outfile: 'dist/preload.cjs',
    target: 'node16'
  }),
]).catch(() => process.exit(1));
