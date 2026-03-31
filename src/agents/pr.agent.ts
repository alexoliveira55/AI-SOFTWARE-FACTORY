import { execSync } from "node:child_process";
import { logger } from "../utils/logger";

/**
 * PR Agent — stages, commits, and pushes the feature branch.
 * Does NOT fail the pipeline if push fails (logs a warning instead).
 */
export async function prAgent(
  projectPath: string,
  featureName: string,
  branchName: string
): Promise<void> {
  const run = (cmd: string) => {
    logger.info(`PR Agent — running: ${cmd}`);
    execSync(cmd, { cwd: projectPath, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  };

  // Stage all changes
  run("git add .");
  logger.info("PR Agent — all changes staged");

  // Commit
  const commitMsg = `feat: ${featureName}`;
  run(`git commit -m "${commitMsg}"`);
  logger.info(`PR Agent — committed: "${commitMsg}"`);

  // Push (non-fatal)
  try {
    run(`git push origin ${branchName}`);
    logger.info(`PR Agent — pushed to origin/${branchName}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`PR Agent — push failed (non-fatal): ${msg}`);
  }

  // TODO: Future — integrate with GitHub API to create PR
}
