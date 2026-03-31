import type { Requirement } from "../models/requirement.model";
import type { CodeAnalysis } from "../models/codeAnalysis.model";

/**
 * Build the architecture prompt using a Requirement and CodeAnalysis.
 * Instructs the LLM to define the implementation structure.
 */
export function buildArchitecturePrompt(
  requirement: Requirement,
  codeAnalysis: CodeAnalysis
): string {
  return `
You are a software architect.

Based on the requirement and existing project structure below, define the architecture for this feature.

Output format (JSON):

{
  "newModules": [],
  "newFiles": [],
  "updatedFiles": [],
  "layers": []
}

Rules:
- layers must include at least: "domain", "data", "presentation"
- newFiles should follow clean architecture conventions
- updatedFiles should reference existing files that need changes

Existing project structure:
${JSON.stringify(codeAnalysis, null, 2)}

Requirement:
${JSON.stringify(requirement, null, 2)}
`;
}
