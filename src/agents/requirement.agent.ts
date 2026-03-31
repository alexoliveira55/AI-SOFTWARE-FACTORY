import { buildRequirementPrompt } from "../prompts/requirement.prompt";
import { callLLM } from "../utils/llm";
import { logger } from "../utils/logger";
import { loadArtifact, saveArtifact } from "../services/artifact.service";
import type { Requirement } from "../models/requirement.model";

/**
 * Requirement Agent: takes raw feature content and produces
 * a structured Requirement via the LLM.
 * Uses artifact caching to avoid reprocessing.
 */
export async function requirementAgent(
  input: string,
  projectPath: string,
  featureName: string
): Promise<Requirement> {
  // Try cached artifact first
  const cached = await loadArtifact(projectPath, featureName, "requirement");
  if (cached) {
    logger.info("Requirement Agent: using cached artifact");
    return cached as Requirement;
  }

  logger.info("Requirement Agent: building prompt...");
  const prompt = buildRequirementPrompt(input);

  logger.info("Requirement Agent: calling LLM...");
  const raw = await callLLM(prompt);

  // Parse the LLM JSON response into a Requirement
  const requirement = JSON.parse(raw) as Requirement;

  if (!requirement.title || !requirement.description) {
    throw new Error("Requirement Agent: LLM returned invalid requirement (missing title or description)");
  }

  logger.info("Requirement Agent: requirement generated");

  // Save artifact
  await saveArtifact(projectPath, featureName, "requirement", requirement);

  return requirement;
}