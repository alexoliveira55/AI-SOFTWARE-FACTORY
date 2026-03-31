import { createIssue } from "../services/jira.service";
import { logger } from "../utils/logger";
import type { PlanningOutput } from "../models/story.model";

/**
 * Jira Agent: creates a full hierarchy in Jira:
 *   1. Epic  — FEATURE - [Feature Name]
 *   2. Stories linked to the Epic
 *   3. Subtasks linked to each Story
 */
export async function jiraAgent(
  projectKey: string,
  featureName: string,
  planning: PlanningOutput
): Promise<void> {
  // 1. Create the Epic
  const epicSummary = `FEATURE - ${featureName}`;
  const epicDescription = `Epic for feature: ${featureName}`;
  const epicKey = await createIssue(
    projectKey,
    epicSummary,
    epicDescription,
    "Epic"
  );
  logger.info(`Jira Agent: Epic created — ${epicKey}`);

  // 2. Create Stories linked to the Epic
  for (const story of planning.stories) {
    const storyKey = await createIssue(
      projectKey,
      story.title,
      story.description,
      "Story",
      epicKey
    );
    logger.info(`Jira Agent: Story created — ${storyKey} (under ${epicKey})`);

    // 3. Create Subtasks linked to the Story
    for (const task of story.tasks) {
      const taskKey = await createIssue(
        projectKey,
        task.title,
        task.description,
        "Subtask",
        storyKey
      );
      logger.info(`Jira Agent: Subtask created — ${taskKey} (under ${storyKey})`);
    }
  }

  logger.info(`Jira Agent: finished creating all issues for "${featureName}"`);
}