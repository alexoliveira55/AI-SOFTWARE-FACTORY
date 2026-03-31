import { execSync } from "node:child_process";
import { logger } from "../utils/logger";

/**
 * Run a git command inside the given working directory.
 * Returns the stdout output as a trimmed string.
 */
function runGit(command: string, cwd: string): string {
  logger.debug(`git ${command} (in ${cwd})`);
  const output = execSync(`git ${command}`, {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return output.trim();
}

/**
 * Checkout a branch by name
 */
export function checkoutBranch(projectPath: string, branch: string): void {
  runGit(`checkout ${branch}`, projectPath);
  logger.info(`Checked out branch: ${branch}`);
}

/**
 * Pull latest changes on the current branch
 */
export function pullLatest(projectPath: string): void {
  runGit("pull", projectPath);
  logger.info("Pulled latest changes");
}

/**
 * Check if a branch exists locally
 */
export function branchExistsLocal(projectPath: string, branchName: string): boolean {
  try {
    const local = runGit("branch --list", projectPath);
    return local.split("\n").some((b) => b.replace("* ", "").trim() === branchName);
  } catch {
    return false;
  }
}

/**
 * Check if a branch exists on the remote (origin) by querying ls-remote.
 * This actually contacts the server, so the result is up-to-date.
 */
export function branchExistsRemote(projectPath: string, branchName: string): boolean {
  try {
    const output = runGit(`ls-remote --heads origin ${branchName}`, projectPath);
    return output.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if a branch exists locally or remotely
 */
export function branchExists(projectPath: string, branchName: string): boolean {
  return branchExistsLocal(projectPath, branchName) || branchExistsRemote(projectPath, branchName);
}

/**
 * Create and switch to a new branch
 */
export function createBranch(projectPath: string, branchName: string): void {
  runGit(`checkout -b ${branchName}`, projectPath);
  logger.info(`Created and switched to branch: ${branchName}`);
}
