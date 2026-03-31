import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger";
import { loadArtifact, saveArtifact } from "../services/artifact.service";
import type { CodeAnalysis } from "../models/codeAnalysis.model";
import type { RefactorIssue, RefactorReport } from "../models/refactor.model";

// ── Thresholds ──────────────────────────────────────────────────
const MAX_FILE_LINES = 300;
const MAX_METHOD_LINES = 50;
const MAX_METHODS_PER_CLASS = 15;

// ── Ignore sets (reuse same rules as code-analysis) ─────────────
const FLUTTER_IGNORE = new Set(["build", ".dart_tool", "node_modules"]);
const DOTNET_IGNORE = new Set(["bin", "obj", ".vs", "node_modules"]);

// ── File scanner ────────────────────────────────────────────────
function collectFiles(
  dir: string,
  extensions: Set<string>,
  ignoreSet: Set<string>
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
      results.push(...collectFiles(path.join(dir, entry.name), extensions, ignoreSet));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.has(ext)) results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

// ── Shared detectors ────────────────────────────────────────────

function detectLargeFiles(rel: string, lines: string[]): RefactorIssue | null {
  if (lines.length > MAX_FILE_LINES) {
    return {
      file: rel,
      type: "large-file",
      severity: lines.length > 600 ? "high" : "medium",
      description: `File has ${lines.length} lines (threshold: ${MAX_FILE_LINES})`,
      suggestion: "Split into smaller, focused files or extract helper classes.",
    };
  }
  return null;
}

function detectTodoFixme(rel: string, lines: string[]): RefactorIssue[] {
  const issues: RefactorIssue[] = [];
  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].toUpperCase();
    if (upper.includes("TODO") || upper.includes("FIXME")) {
      issues.push({
        file: rel,
        type: "todo-fixme",
        severity: "low",
        description: `Line ${i + 1}: ${lines[i].trim().slice(0, 120)}`,
        suggestion: "Resolve or track this TODO/FIXME item.",
      });
      break; // report once per file to keep noise low
    }
  }
  return issues;
}

function detectLongMethods(
  rel: string,
  lines: string[],
  methodPattern: RegExp
): RefactorIssue[] {
  const issues: RefactorIssue[] = [];
  let braceDepth = 0;
  let methodStart = -1;
  let methodName = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (methodStart === -1) {
      const match = line.match(methodPattern);
      if (match) {
        methodName = match[1] ?? "unknown";
        methodStart = i;
        braceDepth = 0;
      }
    }

    if (methodStart !== -1) {
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      if (braceDepth <= 0 && methodStart !== i) {
        const length = i - methodStart + 1;
        if (length > MAX_METHOD_LINES) {
          issues.push({
            file: rel,
            type: "long-method",
            severity: length > 100 ? "high" : "medium",
            description: `Method "${methodName}" is ${length} lines (threshold: ${MAX_METHOD_LINES})`,
            suggestion: `Extract smaller methods from "${methodName}".`,
          });
        }
        methodStart = -1;
      }
    }
  }
  return issues;
}

function detectManyMethods(
  rel: string,
  lines: string[],
  methodPattern: RegExp
): RefactorIssue | null {
  let count = 0;
  for (const line of lines) {
    if (methodPattern.test(line)) count++;
  }
  if (count > MAX_METHODS_PER_CLASS) {
    return {
      file: rel,
      type: "too-many-methods",
      severity: "medium",
      description: `File has ${count} methods (threshold: ${MAX_METHODS_PER_CLASS})`,
      suggestion: "Split class into smaller, single-responsibility classes.",
    };
  }
  return null;
}

// ── Flutter-specific detectors ──────────────────────────────────

const DART_METHOD_RE = /^\s+\w[\w<>?]*\s+(\w+)\s*\(/;

function analyzeFlutterFile(rel: string, lines: string[]): RefactorIssue[] {
  const issues: RefactorIssue[] = [];
  const fileName = path.basename(rel).toLowerCase();

  // UI file with business logic (direct http/dio/database calls)
  if (fileName.includes("page") || fileName.includes("screen") || fileName.includes("widget")) {
    const text = lines.join("\n").toLowerCase();
    if (text.includes("http.") || text.includes("dio.") || text.includes("sqflite") || text.includes("firestore")) {
      issues.push({
        file: rel,
        type: "business-logic-in-ui",
        severity: "high",
        description: "UI file contains direct data access or HTTP calls.",
        suggestion: "Move business logic to a controller or service; use a repository for data access.",
      });
    }
  }

  // Service accessing database directly (no repository pattern)
  if (fileName.includes("service") && !fileName.includes("repository")) {
    const text = lines.join("\n").toLowerCase();
    if (text.includes("sqflite") || text.includes("firestore") || text.includes("hive")) {
      issues.push({
        file: rel,
        type: "service-direct-db-access",
        severity: "medium",
        description: "Service accesses database directly without a repository layer.",
        suggestion: "Introduce a repository to abstract data access from the service.",
      });
    }
  }

  // Unused imports
  const imports = lines.filter((l) => l.trimStart().startsWith("import "));
  if (imports.length > 15) {
    issues.push({
      file: rel,
      type: "excessive-imports",
      severity: "low",
      description: `File has ${imports.length} import statements.`,
      suggestion: "Review and remove unused imports.",
    });
  }

  return issues;
}

// ── C# / .NET-specific detectors ────────────────────────────────

const CS_METHOD_RE = /^\s+(?:public|private|protected|internal)\s+\w[\w<>?]*\s+(\w+)\s*\(/;

function analyzeDotnetFile(rel: string, lines: string[], codeAnalysis: CodeAnalysis): RefactorIssue[] {
  const issues: RefactorIssue[] = [];
  const fileName = path.basename(rel);
  const text = lines.join("\n");

  // Controller with business logic (direct DbContext / repository instantiation)
  if (fileName.endsWith("Controller.cs")) {
    if (text.includes("DbContext") || text.includes("SqlConnection") || text.includes("new HttpClient")) {
      issues.push({
        file: rel,
        type: "controller-business-logic",
        severity: "high",
        description: "Controller contains direct data access or infrastructure code.",
        suggestion: "Keep controllers thin — delegate logic to services.",
      });
    }
  }

  // Repository without interface
  if (fileName.endsWith("Repository.cs") && !fileName.startsWith("I")) {
    const baseName = fileName.replace(".cs", "");
    const hasInterface = codeAnalysis.interfaces.some(
      (i) => path.basename(i) === `I${baseName}.cs`
    );
    if (!hasInterface) {
      issues.push({
        file: rel,
        type: "repository-no-interface",
        severity: "medium",
        description: `Repository "${baseName}" has no matching interface.`,
        suggestion: `Create "I${baseName}.cs" in the Domain/Interfaces folder.`,
      });
    }
  }

  // Entity without DTO
  if (rel.toLowerCase().includes("/entities/") || rel.toLowerCase().includes("/models/")) {
    const entityName = fileName.replace(".cs", "");
    const hasDto = codeAnalysis.dtos.some(
      (d) => path.basename(d).toLowerCase() === `${entityName.toLowerCase()}dto.cs`
    );
    if (!hasDto) {
      issues.push({
        file: rel,
        type: "missing-dto",
        severity: "low",
        description: `Entity "${entityName}" has no matching DTO.`,
        suggestion: `Create "${entityName}Dto.cs" in Application/DTOs.`,
      });
    }
  }

  // Service accessing DbContext directly
  if (fileName.endsWith("Service.cs") && !fileName.startsWith("I")) {
    if (text.includes("DbContext") || text.includes("SqlConnection")) {
      issues.push({
        file: rel,
        type: "service-direct-db-access",
        severity: "medium",
        description: "Service accesses database directly without a repository layer.",
        suggestion: "Inject a repository interface instead of using DbContext in services.",
      });
    }
  }

  // Naming inconsistency: class in wrong folder
  if (fileName.endsWith("Controller.cs") && !rel.includes("Controller")) {
    if (!rel.toLowerCase().includes("api/") && !rel.toLowerCase().includes("controllers/")) {
      issues.push({
        file: rel,
        type: "naming-inconsistency",
        severity: "low",
        description: "Controller file is not inside an API/Controllers folder.",
        suggestion: "Move to API/Controllers for consistent project structure.",
      });
    }
  }

  return issues;
}

// ── Optional automatic refactor stubs ───────────────────────────

/** Extract a large class into smaller classes (stub). */
export async function extractLargeClass(
  filePath: string,
  _projectPath: string
): Promise<string[]> {
  logger.info(`Refactor (stub): extractLargeClass for ${filePath}`);
  // TODO: implement — split class into multiple files
  return [];
}

/** Extract a long method into smaller methods (stub). */
export async function extractMethod(
  filePath: string,
  _methodName: string
): Promise<void> {
  logger.info(`Refactor (stub): extractMethod "${_methodName}" in ${filePath}`);
  // TODO: implement — extract method body into helper
}

/** Move a file to the correct architectural layer (stub). */
export async function moveFileToLayer(
  filePath: string,
  _targetLayer: string,
  _projectPath: string
): Promise<string> {
  logger.info(`Refactor (stub): moveFileToLayer ${filePath} → ${_targetLayer}`);
  // TODO: implement — move file and update imports
  return filePath;
}

/** Create an interface for a repository that lacks one (stub). */
export async function createInterfaceForRepository(
  repositoryPath: string,
  _projectPath: string
): Promise<string> {
  logger.info(`Refactor (stub): createInterfaceForRepository for ${repositoryPath}`);
  // TODO: implement — parse class and generate interface file
  return "";
}

/** Create a DTO from an entity class (stub). */
export async function createDtoFromEntity(
  entityPath: string,
  _projectPath: string
): Promise<string> {
  logger.info(`Refactor (stub): createDtoFromEntity for ${entityPath}`);
  // TODO: implement — parse entity properties and generate DTO
  return "";
}

// ── Public entry point ──────────────────────────────────────────

/**
 * Refactor Agent: scans source files and detects refactoring
 * opportunities for both Flutter and C# projects.
 */
export async function refactorAgent(
  projectPath: string,
  codeAnalysis: CodeAnalysis,
  featureName: string
): Promise<RefactorReport> {
  // Try cached artifact first
  const cached = await loadArtifact(projectPath, featureName, "refactor");
  if (cached) {
    logger.info("Refactor Agent: using cached artifact");
    return cached as RefactorReport;
  }

  const projectType = codeAnalysis.projectType;
  logger.info(`Refactor Agent: analyzing ${projectType} project at ${projectPath}`);

  const extensions = projectType === "flutter" ? new Set([".dart"]) : new Set([".cs"]);
  const ignoreSet = projectType === "flutter" ? FLUTTER_IGNORE : DOTNET_IGNORE;
  const methodRe = projectType === "flutter" ? DART_METHOD_RE : CS_METHOD_RE;

  const allFiles = collectFiles(projectPath, extensions, ignoreSet);
  logger.info(`Refactor Agent: ${allFiles.length} files to scan`);

  const issues: RefactorIssue[] = [];

  for (const absPath of allFiles) {
    const rel = path.relative(projectPath, absPath).replace(/\\/g, "/");

    let content: string;
    try {
      content = fs.readFileSync(absPath, "utf-8");
    } catch {
      continue;
    }
    const lines = content.split("\n");

    // Shared checks
    const largeFile = detectLargeFiles(rel, lines);
    if (largeFile) issues.push(largeFile);

    issues.push(...detectTodoFixme(rel, lines));
    issues.push(...detectLongMethods(rel, lines, methodRe));

    const manyMethods = detectManyMethods(rel, lines, methodRe);
    if (manyMethods) issues.push(manyMethods);

    // Project-specific checks
    if (projectType === "flutter") {
      issues.push(...analyzeFlutterFile(rel, lines));
    } else {
      issues.push(...analyzeDotnetFile(rel, lines, codeAnalysis));
    }
  }

  const highCount = issues.filter((i) => i.severity === "high").length;
  logger.info(
    `Refactor Agent: ${issues.length} issues found (${highCount} high severity)`
  );

  const report: RefactorReport = { projectType, issues };

  // Save artifact
  await saveArtifact(projectPath, featureName, "refactor", report);

  return report;
}
