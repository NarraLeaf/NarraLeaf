const { execSync } = require("child_process");

const isDev = process.argv.includes('--dev');

function detectManager() {
  const ua = process.env.npm_config_user_agent || "";
  const execPath = process.env.npm_execpath || "";

  if (process.env.YARN_VERSION) return "yarn";
  if (ua.includes("yarn") || execPath.includes("yarn")) return "yarn";
  if (ua.includes("pnpm") || execPath.includes("pnpm")) return "pnpm";
  return "npm";
}

const mgr = detectManager();
const sharedFirstCmd = {
  yarn: "yarn workspace @narraleaf/shared build:dev",
  pnpm: "pnpm --filter @narraleaf/shared run build:dev",
  npm:  "npm run build:dev --workspace=@narraleaf/shared",
};

// Build shared first in dev mode
if (isDev) {
  execSync(sharedFirstCmd[mgr], { stdio: "inherit", shell: true });
}

const cmdMap = {
  yarn: `yarn workspaces foreach -A -p --topological-dev --exclude @narraleaf/shared run ${isDev ? "build:dev" : "build"}`,
  pnpm: `pnpm -r --filter ./... --filter '!@narraleaf/shared' run ${isDev ? "build:dev" : "build"}`,
  npm:  `npm run ${isDev ? "build:dev" : "build"} --workspaces`,
};

execSync(cmdMap[mgr], { stdio: "inherit", shell: true });