import { buildPlanningPrompt } from "../prompts/planning.prompt";
import { callLLM } from "../utils/llm";
import { logger } from "../utils/logger";
import { loadArtifact, saveArtifact } from "../services/artifact.service";
import type { Requirement } from "../models/requirement.model";
import type { PlanningOutput } from "../models/story.model";

/**
 * Planning Agent: takes a structured Requirement and generates
 * a PlanningOutput (stories with tasks) via the LLM.
 * Uses artifact caching to avoid reprocessing.
 */
export async function planningAgent(
  requirement: Requirement,
  projectPath: string,
  featureName: string
): Promise<PlanningOutput> {
  // Try cached artifact first
  const cached = await loadArtifact(projectPath, featureName, "planning");
  if (cached) {
    logger.info("Planning Agent: using cached artifact");
    return cached as PlanningOutput;
  }

  logger.info("Planning Agent: building prompt...");
  const prompt = buildPlanningPrompt(requirement);

  logger.info("Planning Agent: calling LLM...");
  const raw = await callLLM(prompt);

  // Parse the LLM JSON response
  const parsed = JSON.parse(raw) as PlanningOutput;

  // Validate top-level structure
  if (!parsed.stories || !Array.isArray(parsed.stories)) {
    throw new Error("Planning Agent: LLM response missing 'stories' array");
  }

  if (parsed.stories.length === 0) {
    throw new Error("Planning Agent: LLM returned empty stories array");
  }

  // Validate each story has tasks
  for (const story of parsed.stories) {
    if (!story.title || !story.description) {
      throw new Error(`Planning Agent: story missing title or description`);
    }
    if (!Array.isArray(story.tasks) || story.tasks.length === 0) {
      throw new Error(`Planning Agent: story "${story.title}" has no tasks`);
    }
  }

  logger.info(`Planning Agent: generated ${parsed.stories.length} stories`);

  // Save artifact
  await saveArtifact(projectPath, featureName, "planning", parsed);

  return parsed;
}