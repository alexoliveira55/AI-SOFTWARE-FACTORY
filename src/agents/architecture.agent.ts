import { buildArchitecturePrompt } from "../prompts/architecture.prompt";
import { callLLM } from "../utils/llm";
import { logger } from "../utils/logger";
import { loadArtifact, saveArtifact } from "../services/artifact.service";
import type { Requirement } from "../models/requirement.model";
import type { CodeAnalysis } from "../models/codeAnalysis.model";
import type { Architecture } from "../models/architecture.model";

/**
 * Architecture Agent: defines how the feature should be implemented
 * based on the requirement and existing project structure.
 * Uses artifact caching to avoid reprocessing.
 */
export async function architectureAgent(
  requirement: Requirement,
  codeAnalysis: CodeAnalysis,
  projectPath: string,
  featureName: string
): Promise<Architecture> {
  // Try cached artifact first
  const cached = await loadArtifact(projectPath, featureName, "architecture");
  if (cached) {
    logger.info("Architecture Agent: using cached artifact");
    return cached as Architecture;
  }

  logger.info("Architecture Agent: building prompt...");
  const prompt = buildArchitecturePrompt(requirement, codeAnalysis);

  logger.info("Architecture Agent: calling LLM...");
  const raw = await callLLM(prompt);

  // Parse and validate the LLM response
  const architecture = JSON.parse(raw) as Architecture;

  if (!Array.isArray(architecture.layers) || architecture.layers.length === 0) {
    throw new Error("Architecture Agent: LLM response missing 'layers'");
  }

  if (!Array.isArray(architecture.newFiles)) {
    throw new Error("Architecture Agent: LLM response missing 'newFiles'");
  }

  logger.info(
    `Architecture Agent: ${architecture.layers.length} layers, ` +
    `${architecture.newModules.length} new modules, ` +
    `${architecture.newFiles.length} new files, ` +
    `${architecture.updatedFiles.length} updated files`
  );

  // Save artifact
  await saveArtifact(projectPath, featureName, "architecture", architecture);

  return architecture;
}
