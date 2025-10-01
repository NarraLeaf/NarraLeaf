// import esbuild from 'esbuild';
const esbuild = require('esbuild');

const isDev = process.argv.includes('--dev');

if (isDev) {
  console.log("Building in dev mode");
} else {
  console.log("Building in production mode");
}

const external = [
  "babel-loader",
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
    format: 'cjs',
    outfile: 'dist/index.cjs',
    target: 'node16',
    banner: {
        js: "#!/usr/bin/env node"
    },
  }),
]).catch(() => process.exit(1));
