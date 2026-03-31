import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../utils/logger";

/**
 * Supported artifact types produced by AI agents
 */
export type ArtifactType =
  | "requirement"
  | "planning"
  | "architecture"
  | "code-analysis"
  | "refactor"
  | "tests"
  | "review";

/**
 * Build the full file path for an artifact.
 */
function artifactPath(
  projectPath: string,
  featureName: string,
  artifactType: ArtifactType
): string {
  const dir = path.join(projectPath, "ai", artifactType);
  const fileName = `FEATURE_${featureName.toUpperCase()}.json`;
  return path.join(dir, fileName);
}

/**
 * Save an AI agent output as a JSON file inside the target project.
 *
 * Files are stored at:
 *   [projectPath]/ai/[artifactType]/FEATURE_[FEATURE_NAME].json
 *
 * Folders are created automatically if they don't exist.
 */
export async function saveArtifact(
  projectPath: string,
  featureName: string,
  artifactType: ArtifactType,
  data: unknown
): Promise<void> {
  const filePath = artifactPath(projectPath, featureName, artifactType);

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    logger.info(`Artifact saved: ${filePath}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to save artifact (${artifactType}): ${msg}`);
  }
}

/**
 * Load a previously saved artifact from disk.
 * Returns the parsed JSON data, or null if the file does not exist.
 */
export async function loadArtifact(
  projectPath: string,
  featureName: string,
  artifactType: ArtifactType
): Promise<unknown | null> {
  const filePath = artifactPath(projectPath, featureName, artifactType);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    logger.info(`Artifact loaded: ${filePath}`);
    return JSON.parse(raw);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      logger.info(`Artifact not found: ${filePath}`);
      return null;
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to load artifact (${artifactType}): ${msg}`);
    return null;
  }
}
