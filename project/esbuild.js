import esbuild from 'esbuild';

const external = [
  "commander",
  "chalk",
  "ejs",
  "lodash",
  "webpack",
  "babel-loader",
  "@babel/core",
  "@babel/preset-env",
  "@babel/preset-react",
  "@babel/preset-typescript",
  "@swc/core",
  "@swc/core-win32-x64-msvc",
  "@swc/wasm",
  "uglify-js",
  "jsonc",
  "@inquirer/prompts",
  "html-webpack-plugin"
];


const commonOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  sourcemap: true,
  alias: {
    '@': './src',
    '@core': './src/core',
  },
  logLevel: 'info',
  loader: {
    ".ejs": "text",
  },
  external,
};

Promise.all([
  esbuild.build({ ...commonOptions, format: 'esm', outfile: 'dist/index.mjs' }),
  esbuild.build({
    entryPoints: ['src/cli.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: 'dist/cli.mjs',
    alias: {
      '@': './src',
      '@core': './src/core',
    },
    logLevel: 'info',
    loader: {
      ".ejs": "text",
    },
    external,
  }),
]).catch(() => process.exit(1));
