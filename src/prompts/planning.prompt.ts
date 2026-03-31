import type { Requirement } from "../models/requirement.model.js";

/**
 * Build the planning prompt using a structured Requirement.
 * Instructs the LLM to generate Stories and Tasks in JSON.
 */
export function buildPlanningPrompt(requirement: Requirement): string {
  return `
You are an agile project manager.

Based on the requirement below, generate user stories and tasks.

Output format (JSON array):

[
  {
    "title": "",
    "description": "",
    "acceptanceCriteria": [],
    "tasks": [
      {
        "title": "",
        "description": "",
        "estimateHours": 0
      }
    ]
  }
]

Requirement:
${JSON.stringify(requirement, null, 2)}
`;
}