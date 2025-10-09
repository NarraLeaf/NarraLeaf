#!/usr/bin/env node
/*
  Bump version for all workspace packages and align internal dependency versions.
  Usage examples:
    # via npm script
    npm run version:all -- 0.2.0-beta.1

    # via env variable
    VERSION=0.2.0 node project/update-version.js

    # explicit flag
    node project/update-version.js --version 0.2.0
*/
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  let ver;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--version' || a === '-v') {
      ver = args[i + 1];
      break;
    }
    if (!a.startsWith('-')) {
      ver = a;
      break;
    }
  }
  return ver || process.env.VERSION;
}

const targetVersion = parseArgs();
if (!targetVersion) {
  console.error('[update-version] Error: target version not provided.');
  console.error('  Provide it as positional arg, "--version <ver>", or env VERSION=<ver>');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

// Read all package.json under packages/*
const packageDirs = fs.readdirSync(packagesDir).filter((dir) => {
  return fs.existsSync(path.join(packagesDir, dir, 'package.json'));
});

// Map of internal name -> dir
const nameToDir = {};
packageDirs.forEach((dir) => {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(packagesDir, dir, 'package.json'), 'utf8'));
  nameToDir[pkgJson.name] = dir;
});

function updateDeps(obj) {
  ['dependencies', 'devDependencies', 'peerDependencies'].forEach((field) => {
    if (!obj[field]) return;
    Object.keys(obj[field]).forEach((dep) => {
      if (nameToDir[dep]) {
        obj[field][dep] = targetVersion;
      }
    });
  });
}

packageDirs.forEach((dir) => {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkgJson.version = targetVersion;
  updateDeps(pkgJson);
  fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n');
  console.log(`[update-version] ${pkgJson.name} -> ${targetVersion}`);
});

// Optionally update root package.json version (not strictly needed)
const rootPkgPath = path.join(rootDir, 'package.json');
if (fs.existsSync(rootPkgPath)) {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  rootPkg.version = targetVersion;
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
  console.log(`[update-version] root package.json -> ${targetVersion}`);
}

console.log('[update-version] Done. Remember to run your package manager install to refresh lockfile.');
