const esbuild = require('esbuild');

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
};

Promise.all([
  esbuild.build({ ...commonOptions, format: 'cjs', outfile: 'dist/index.cjs' }),
  esbuild.build({ ...commonOptions, format: 'esm', outfile: 'dist/index.mjs' }),
  esbuild.build({
    entryPoints: ['src/cli.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'dist/cli.js',
    alias: {
      '@': './src',
      '@core': './src/core',
    },
    logLevel: 'info',
  }),
]).catch(() => process.exit(1));
