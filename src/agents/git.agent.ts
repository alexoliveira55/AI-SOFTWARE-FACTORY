import type { ProjectConfig } from "../models/projectConfig.model";
import {
  checkoutBranch,
  pullLatest,
  createBranch,
  branchExists,
  branchExistsRemote,
} from "../services/git.service";
import { logger } from "../utils/logger";

/**
 * Git agent: checks out the default branch, pulls latest,
 * then creates a new feature branch or reuses it if it already exists.
 * Only executes pull when the branch has a remote counterpart.
 * Branch naming convention: features/[feature_name]
 */
export async function gitAgent(
  project: ProjectConfig,
  featureName: string
): Promise<string> {
  const branchName = `features/${featureName}`;

  logger.info(`Git Agent: preparing branch "${branchName}" for project "${project.name}"`);

  if (branchExists(project.path, branchName)) {
    // Branch already exists — checkout it
    logger.info(`Git Agent: branch "${branchName}" already exists, switching to it`);
    checkoutBranch(project.path, branchName);

    // Only pull if the branch exists on the remote
    if (branchExistsRemote(project.path, branchName)) {
      pullLatest(project.path);
    } else {
      logger.info(`Git Agent: branch "${branchName}" is local-only, skipping pull`);
    }
  } else {
    // Checkout default branch, pull latest, then create the feature branch
    checkoutBranch(project.path, project.defaultBranch);

    // Only pull default branch if it exists on the remote
    if (branchExistsRemote(project.path, project.defaultBranch)) {
      pullLatest(project.path);
    } else {
      logger.info(`Git Agent: default branch "${project.defaultBranch}" has no remote, skipping pull`);
    }

    createBranch(project.path, branchName);
    logger.info(`Git Agent: branch "${branchName}" created successfully`);
  }

  return branchName;
}
