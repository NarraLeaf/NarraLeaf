const esbuild = require('esbuild');

(async () => {
  await Promise.all([
    esbuild.build({
      entryPoints: ['src/index.ts'],
      format: 'esm',
      outfile: 'dist/index.mjs',
      target: 'node22',
      bundle: true,
    }),
    esbuild.build({
      entryPoints: ['src/index.ts'],
      format: 'cjs',
      outfile: 'dist/index.cjs',
      target: 'node16',
      bundle: true,
    }),
  ]);
})().catch(() => process.exit(1));
