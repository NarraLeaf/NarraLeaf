const { execSync } = require("child_process");

function detectManager() {
  const ua = process.env.npm_config_user_agent || "";
  const execPath = process.env.npm_execpath || "";

  if (process.env.YARN_VERSION) return "yarn";
  if (ua.includes("yarn") || execPath.includes("yarn")) return "yarn";
  if (ua.includes("pnpm") || execPath.includes("pnpm")) return "pnpm";
  return "npm";
}

const mgr = detectManager();
const cmdMap = {
  yarn: "yarn workspaces foreach -A -p --topological-dev run build",
  pnpm: "pnpm -r --filter ./... run build",
  npm:  "npm run build --workspaces",
};

execSync(cmdMap[mgr], { stdio: "inherit", shell: true });