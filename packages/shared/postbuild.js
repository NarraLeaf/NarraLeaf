const fs = require('fs-extra');
const path = require('path');

// Source dist directory of @narraleaf/shared
const sourceDist = path.resolve(__dirname, 'dist');

// List of sibling packages that depend on shared and should receive the fresh build
const siblingPackages = [
  '../narraleaf',
  '../narraleaf-cli',
];

siblingPackages.forEach((relativePkgPath) => {
  const pkgPath = path.resolve(__dirname, relativePkgPath);

  // Potential locations of @narraleaf/shared in that package's node_modules.
  // 1. Workspace hoisting may place it at repo root; skip that — we copy only into the package's own node_modules to ensure local require works during dev.
  const targetModulePath = path.join(pkgPath, 'node_modules', '@narraleaf', 'shared');

  if (!fs.existsSync(targetModulePath)) {
    // Skip if the dependent package has not installed its node_modules yet.
    console.warn(`[postbuild] skip ${relativePkgPath}: node_modules/@narraleaf/shared not found`);
    return;
  }

  const targetDist = path.join(targetModulePath, 'dist');

  try {
    fs.removeSync(targetDist);
    fs.copySync(sourceDist, targetDist, { overwrite: true });
    console.log(`[postbuild] Updated dist for ${relativePkgPath}`);
  } catch (err) {
    console.error(`[postbuild] Failed to update ${relativePkgPath}:`, err);
  }
});
