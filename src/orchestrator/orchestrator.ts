import { getCliInput } from "../utils/cli";
import { getProjectByName } from "../services/projectConfig.service";
import { gitAgent } from "../agents/git.agent";
import {
  readFeatureFile,
  copyFeatureFileToProject,
} from "../services/featureFile.service";
import { requirementAgent } from "../agents/requirement.agent";
import { planningAgent } from "../agents/planning.agent";
import { architectureAgent } from "../agents/architecture.agent";
import { devAgent } from "../agents/dev.agent";
import { testAgent } from "../agents/test.agent";
import { jiraAgent } from "../agents/jira.agent";
import { codeAnalysisAgent } from "../agents/code-analysis.agent";
import { refactorAgent } from "../agents/refactor.agent";
import { prAgent } from "../agents/pr.agent";
import { logger } from "../utils/logger";
import type { CodeAnalysis } from "../models/codeAnalysis.model";
import type { RefactorReport } from "../models/refactor.model";
import type { Requirement } from "../models/requirement.model";
import type { PlanningOutput } from "../models/story.model";
import type { Architecture } from "../models/architecture.model";

// ── Helpers ─────────────────────────────────────────────────────

function stepLog(step: number, name: string, phase: "START" | "DONE" | "FAILED"): void {
  logger.info(`[STEP ${step}] ${name} — ${phase}`);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Run a pipeline step. If it fails and is not critical, log the
 * error and return undefined so the pipeline can continue.
 */
async function runStep<T>(
  step: number,
  name: string,
  critical: boolean,
  fn: () => Promise<T>
): Promise<T | undefined> {
  stepLog(step, name, "START");
  try {
    const result = await fn();
    stepLog(step, name, "DONE");
    return result;
  } catch (err: unknown) {
    stepLog(step, name, "FAILED");
    logger.error(`[STEP ${step}] ${name} error: ${errorMessage(err)}`);
    if (critical) throw err;
    return undefined;
  }
}

// ── Pipeline ────────────────────────────────────────────────────

/**
 * AI Software Factory — Official Execution Pipeline
 *
 *  STEP  1  Git Agent          — Create or checkout branch (critical)
 *  STEP  2  Code Analysis      — Analyze project structure
 *  STEP  3  Refactor Agent     — Generate refactor report
 *  STEP  4  Requirement Agent  — Generate structured requirement
 *  STEP  5  Planning Agent     — Generate stories and tasks
 *  STEP  6  Architecture Agent — Define system structure
 *  STEP  7  Dev Agent          — Generate code structure
 *  STEP  8  Test Agent         — Generate test definitions
 *  STEP  9  Jira Agent         — Create Epic, Stories, Tasks
 *  STEP 10  PR Agent           — Commit and push
 *
 * Agents with artifact caching (2-8) automatically load cached
 * results when available and save new outputs after generation.
 */
export async function run(): Promise<void> {
  logger.info("=== AI Software Factory — Starting ===");

  // ── CLI input & project config ────────────────────────────────
  const cliInput = await getCliInput();
  const featureName = cliInput.featureName;
  logger.info(
    `CLI Input — project: ${cliInput.projectName}, feature: ${featureName}, file: ${cliInput.requirementFilePath}`
  );

  const project = getProjectByName(cliInput.projectName);
  logger.info(`Project config loaded: ${project.name} @ ${project.path}`);

  // Copy & read feature file
  const destPath = copyFeatureFileToProject(
    cliInput.requirementFilePath,
    project.path,
    project.featuresFolder,
    featureName
  );
  logger.info(`Feature file copied to: ${destPath}`);

  const featureContent = readFeatureFile(cliInput.requirementFilePath);
  logger.info("Feature file content loaded");

  // ── Shared state flowing between steps ────────────────────────
  let branchName: string | undefined;
  let codeAnalysis: CodeAnalysis | undefined;
  let refactorReport: RefactorReport | undefined;
  let requirement: Requirement | undefined;
  let planning: PlanningOutput | undefined;
  let architecture: Architecture | undefined;

  // ── STEP 1 — Git Agent (critical) ────────────────────────────
  branchName = await runStep(1, "Git Agent", true, () =>
    gitAgent(project, featureName)
  );

  // ── STEP 2 — Code Analysis Agent ─────────────────────────────
  codeAnalysis = await runStep(2, "Code Analysis", false, () =>
    codeAnalysisAgent(project.path, featureName)
  );

  // ── STEP 3 — Refactor Agent ──────────────────────────────────
  if (codeAnalysis) {
    refactorReport = await runStep(3, "Refactor Agent", false, () =>
      refactorAgent(project.path, codeAnalysis!, featureName)
    );
  } else {
    stepLog(3, "Refactor Agent", "START");
    logger.info("[STEP 3] Refactor Agent — skipped (no code analysis)");
  }

  // ── STEP 4 — Requirement Agent ───────────────────────────────
  requirement = await runStep(4, "Requirement Agent", false, () =>
    requirementAgent(featureContent, project.path, featureName)
  );

  // ── STEP 5 — Planning Agent ──────────────────────────────────
  if (requirement) {
    planning = await runStep(5, "Planning Agent", false, () =>
      planningAgent(requirement!, project.path, featureName)
    );
  } else {
    stepLog(5, "Planning Agent", "START");
    logger.info("[STEP 5] Planning Agent — skipped (no requirement)");
  }

  // ── STEP 6 — Architecture Agent ──────────────────────────────
  if (requirement && codeAnalysis) {
    architecture = await runStep(6, "Architecture Agent", false, () =>
      architectureAgent(requirement!, codeAnalysis!, project.path, featureName)
    );
  } else {
    stepLog(6, "Architecture Agent", "START");
    logger.info("[STEP 6] Architecture Agent — skipped (missing requirement or code analysis)");
  }

  // ── STEP 7 — Dev Agent ───────────────────────────────────────
  if (architecture && codeAnalysis) {
    await runStep(7, "Dev Agent", false, () =>
      devAgent(architecture!, project.path, featureName, codeAnalysis!)
    );
  } else {
    stepLog(7, "Dev Agent", "START");
    logger.info("[STEP 7] Dev Agent — skipped (missing architecture or code analysis)");
  }

  // ── STEP 8 — Test Agent ──────────────────────────────────────
  if (planning) {
    await runStep(8, "Test Agent", false, () =>
      testAgent(planning!, project.path, featureName)
    );
  } else {
    stepLog(8, "Test Agent", "START");
    logger.info("[STEP 8] Test Agent — skipped (no planning)");
  }

  // ── STEP 9 — Jira Agent ─────────────────────────────────────
  if (planning) {
    await runStep(9, "Jira Agent", false, () =>
      jiraAgent(project.jiraProjectKey, featureName, planning!)
    );
  } else {
    stepLog(9, "Jira Agent", "START");
    logger.info("[STEP 9] Jira Agent — skipped (no planning)");
  }

  // ── STEP 10 — PR Agent ──────────────────────────────────────
  if (branchName) {
    await runStep(10, "PR Agent", false, () =>
      prAgent(project.path, featureName, branchName!)
    );
  }

  logger.info("=== AI Software Factory — Finished ===");
}