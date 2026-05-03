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
  yarn: isDev ? "yarn workspace @narraleaf/shared build:dev" : "yarn workspace @narraleaf/shared build",
  pnpm: isDev ? "pnpm --filter @narraleaf/shared run build:dev" : "pnpm --filter @narraleaf/shared run build",
  npm: isDev ? "npm run build:dev --workspace=@narraleaf/shared" : "npm run build --workspace=@narraleaf/shared",
};

// Other workspaces import @narraleaf/shared; build it first (types + JS) and keep it out of the parallel graph.
execSync(sharedFirstCmd[mgr], { stdio: "inherit", shell: true });

const cmdMap = {
  yarn: `yarn workspaces foreach -A -p --topological-dev --exclude @narraleaf/shared run ${isDev ? "build:dev" : "build"}`,
  pnpm: `pnpm -r --filter ./... --filter '!@narraleaf/shared' run ${isDev ? "build:dev" : "build"}`,
  npm:  `npm run ${isDev ? "build:dev" : "build"} --workspaces`,
};

execSync(cmdMap[mgr], { stdio: "inherit", shell: true });