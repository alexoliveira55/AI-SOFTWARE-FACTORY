/**
 * Build the requirement prompt from raw feature input text.
 * Instructs the LLM to produce a structured Requirement in JSON.
 */
export function buildRequirementPrompt(input: string): string {
  return `
You are a requirements analyst.

Generate a structured requirement in JSON with the following shape:

{
  "title": "",
  "description": "",
  "businessRules": [],
  "acceptanceCriteria": [],
  "affectedModules": []
}

Feature description:
${input}
`;
}