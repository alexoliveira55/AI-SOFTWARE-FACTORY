import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger";
import { loadArtifact, saveArtifact } from "../services/artifact.service";
import type { CodeAnalysis } from "../models/codeAnalysis.model";

// ── Flutter config ──────────────────────────────────────────────
const FLUTTER_IGNORE = new Set(["build", ".dart_tool", "node_modules"]);
const FLUTTER_EXTENSIONS = new Set([".dart"]);
const FLUTTER_EXTRA_FILES = new Set(["pubspec.yaml"]);

// ── C# / .NET config ──────────────────────────────────────────────
const DOTNET_IGNORE = new Set(["bin", "obj", ".vs", "node_modules"]);
const DOTNET_EXTENSIONS = new Set([".cs", ".csproj", ".sln"]);

// ── Shared scanner ─────────────────────────────────────────────
function scanDir(
  dir: string,
  ignoreSet: Set<string>,
  extensions: Set<string>,
  extraFiles: Set<string> = new Set()
): string[] {
  const results: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoreSet.has(entry.name)) continue;
      results.push(...scanDir(path.join(dir, entry.name), ignoreSet, extensions, extraFiles));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.has(ext) || extraFiles.has(entry.name)) {
        results.push(path.join(dir, entry.name));
      }
    }
  }

  return results;
}

// ── Project type detection ──────────────────────────────────────
function detectProjectType(projectPath: string): "flutter" | "dotnet" {
  if (fs.existsSync(path.join(projectPath, "pubspec.yaml"))) return "flutter";

  // Look for any .csproj in the root or one level deep
  try {
    const entries = fs.readdirSync(projectPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".csproj")) return "dotnet";
      if (entry.isDirectory()) {
        const sub = path.join(projectPath, entry.name);
        try {
          const subEntries = fs.readdirSync(sub);
          if (subEntries.some((s) => s.endsWith(".csproj"))) return "dotnet";
        } catch { /* skip */ }
      }
    }
  } catch { /* fall through */ }

  // Default to flutter if nothing detected
  return "flutter";
}

// ── Flutter analysis ────────────────────────────────────────────
function analyzeFlutter(projectPath: string, relFiles: string[]): CodeAnalysis {
  const libPrefix = "lib/";
  const moduleSet = new Set<string>();
  const services: string[] = [];
  const repositories: string[] = [];
  const models: string[] = [];

  for (const rel of relFiles) {
    // Modules: top-level folders inside lib/
    if (rel.startsWith(libPrefix)) {
      const afterLib = rel.slice(libPrefix.length);
      const firstSlash = afterLib.indexOf("/");
      if (firstSlash > 0) {
        moduleSet.add(afterLib.slice(0, firstSlash));
      }
    }

    if (!rel.endsWith(".dart")) continue;
    const fileName = path.basename(rel).toLowerCase();

    if (fileName.includes("page") || fileName.includes("screen")) {
      // pages go into modules (presentation-layer indicator)
    }
    if (fileName.includes("service")) services.push(rel);
    if (fileName.includes("repository")) repositories.push(rel);
    if (fileName.includes("model")) models.push(rel);
  }

  return {
    projectType: "flutter",
    modules: Array.from(moduleSet).sort(),
    controllers: [],
    services: services.sort(),
    repositories: repositories.sort(),
    models: models.sort(),
    dtos: [],
    interfaces: [],
  };
}

// ── .NET / C# analysis ─────────────────────────────────────────
function analyzeDotnet(projectPath: string, relFiles: string[]): CodeAnalysis {
  const controllers: string[] = [];
  const services: string[] = [];
  const repositories: string[] = [];
  const entities: string[] = [];
  const dtos: string[] = [];
  const interfaces: string[] = [];
  const moduleSet = new Set<string>();

  for (const rel of relFiles) {
    if (!rel.endsWith(".cs")) continue;
    const fileName = path.basename(rel);

    // Top-level folders as modules
    const firstSlash = rel.indexOf("/");
    if (firstSlash > 0) {
      moduleSet.add(rel.slice(0, firstSlash));
    }

    if (fileName.endsWith("Controller.cs")) controllers.push(rel);
    if (fileName.endsWith("Service.cs")) services.push(rel);
    if (fileName.endsWith("Repository.cs")) repositories.push(rel);
    if (fileName.endsWith("Dto.cs")) dtos.push(rel);
    if (fileName.startsWith("I") && fileName.endsWith(".cs")) interfaces.push(rel);

    // Entities / Models folder
    const relLower = rel.toLowerCase();
    if (relLower.includes("/entities/") || relLower.includes("/models/")) {
      entities.push(rel);
    }
  }

  return {
    projectType: "dotnet",
    modules: Array.from(moduleSet).sort(),
    controllers: controllers.sort(),
    services: services.sort(),
    repositories: repositories.sort(),
    models: entities.sort(),
    dtos: dtos.sort(),
    interfaces: interfaces.sort(),
  };
}

// ── Public entry point ──────────────────────────────────────────
export async function codeAnalysisAgent(
  projectPath: string,
  featureName: string
): Promise<CodeAnalysis> {
  // Try cached artifact first
  const cached = await loadArtifact(projectPath, featureName, "code-analysis");
  if (cached) {
    logger.info("Code Analysis Agent: using cached artifact");
    return cached as CodeAnalysis;
  }

  const projectType = detectProjectType(projectPath);
  logger.info(`Code Analysis Agent: detected project type "${projectType}" for ${projectPath}`);

  // Scan with appropriate config
  const allFiles =
    projectType === "flutter"
      ? scanDir(projectPath, FLUTTER_IGNORE, FLUTTER_EXTENSIONS, FLUTTER_EXTRA_FILES)
      : scanDir(projectPath, DOTNET_IGNORE, DOTNET_EXTENSIONS);

  logger.info(`Code Analysis Agent: scanned ${allFiles.length} files`);

  // Normalise to forward-slash relative paths
  const relFiles = allFiles.map((f) =>
    path.relative(projectPath, f).replace(/\\/g, "/")
  );

  // Analyze based on project type
  const analysis =
    projectType === "flutter"
      ? analyzeFlutter(projectPath, relFiles)
      : analyzeDotnet(projectPath, relFiles);

  logger.info(
    `Code Analysis Agent: ${analysis.modules.length} modules, ` +
    `${analysis.services.length} services, ` +
    `${analysis.repositories.length} repositories`
  );

  // Save artifact
  await saveArtifact(projectPath, featureName, "code-analysis", analysis);

  return analysis;
}
