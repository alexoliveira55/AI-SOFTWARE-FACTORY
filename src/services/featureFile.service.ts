import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger";

// Allowed requirement file extensions
const ALLOWED_EXTENSIONS = [".txt", ".md", ".xml"];

/**
 * Validate that the requirement file has an accepted extension
 */
function validateExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Invalid file extension "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }
}

/**
 * Read the content of a requirement file from the given path
 */
export function readFeatureFile(filePath: string): string {
  validateExtension(filePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Requirement file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  logger.info(`Feature file read: ${filePath} (${content.length} chars)`);
  return content;
}

/**
 * Copy the requirement file into the project's features folder.
 * File is saved as FEATURE_[FEATURE_NAME].md, converting content to .md.
 * Ensures the features folder exists.
 */
export function copyFeatureFileToProject(
  sourcePath: string,
  projectPath: string,
  featuresFolder: string,
  featureName: string
): string {
  validateExtension(sourcePath);

  // Ensure features directory exists inside the project
  const featuresDir = path.join(projectPath, featuresFolder);
  if (!fs.existsSync(featuresDir)) {
    fs.mkdirSync(featuresDir, { recursive: true });
    logger.info(`Created features folder: ${featuresDir}`);
  }

  // Build destination file name following naming convention
  const destFileName = `FEATURE_${featureName.toUpperCase()}.md`;
  const destPath = path.join(featuresDir, destFileName);

  // Read source content and write as .md
  const content = fs.readFileSync(sourcePath, "utf-8");
  fs.writeFileSync(destPath, content, "utf-8");

  logger.info(`Feature file copied to: ${destPath}`);
  return destPath;
}
