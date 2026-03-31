import axios from "axios";
import { logger } from "../utils/logger";
import { env } from "../config/env";

const baseURL = env.jiraUrl;
const email = env.jiraEmail;
const token = env.jiraToken;

const auth = Buffer.from(`${email}:${token}`).toString("base64");

/**
 * Common headers for Jira API requests
 */
const headers = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};

/**
 * Cached map of canonical type name → Jira issue type id.
 * Populated once per project on first call.
 */
const issueTypeCache = new Map<string, Map<string, string>>();

/**
 * Known aliases for each canonical type so we can match
 * regardless of the Jira instance language (PT, EN, ES…).
 */
const TYPE_ALIASES: Record<string, string[]> = {
  Epic:    ["epic", "épico"],
  Story:   ["story", "história", "historia", "user story"],
  Subtask: ["subtask", "sub-task", "subtarefa", "sub-tarefa"],
  Task:    ["task", "tarefa"],
  Bug:     ["bug", "defeito"],
};

/**
 * Fetch the available issue types for a project and build
 * a lookup map: canonical name → Jira issue type id.
 */
async function loadIssueTypes(projectKey: string): Promise<Map<string, string>> {
  if (issueTypeCache.has(projectKey)) {
    return issueTypeCache.get(projectKey)!;
  }

  const url = `${baseURL}rest/api/3/project/${projectKey}/statuses`;
  logger.debug(`Jira: fetching issue types from ${url}`);

  const response = await axios.get(url, { headers });
  const types = response.data as Array<{ name: string; id: string }>;

  logger.info(
    `Jira: available issue types for ${projectKey}: ${types.map((t) => `${t.name} (${t.id})`).join(", ")}`
  );

  const map = new Map<string, string>();

  for (const jiraType of types) {
    const jiraNameLower = jiraType.name.toLowerCase();

    for (const [canonical, aliases] of Object.entries(TYPE_ALIASES)) {
      if (aliases.includes(jiraNameLower) || jiraNameLower === canonical.toLowerCase()) {
        map.set(canonical, jiraType.id);
      }
    }
  }

  issueTypeCache.set(projectKey, map);
  return map;
}

/**
 * Resolve a canonical issue type name ("Epic", "Story", "Subtask")
 * to the Jira issue type id configured in the project.
 */
async function resolveIssueTypeId(projectKey: string, canonicalType: string): Promise<string> {
  const map = await loadIssueTypes(projectKey);
  const id = map.get(canonicalType);

  if (!id) {
    const available = Array.from(map.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    throw new Error(
      `Issue type "${canonicalType}" not found for project ${projectKey}. Resolved types: ${available || "(none)"}`
    );
  }

  return id;
}

/**
 * Create a Jira issue (Epic, Story, or Subtask).
 * Returns the created issue key (e.g. "APP-123").
 *
 * @param projectKey - The Jira project key (e.g. "TPA")
 * @param summary - Issue title
 * @param description - Issue description
 * @param type - Canonical issue type: "Epic", "Story", "Subtask"
 * @param parentKey - Optional parent issue key for linking
 */
export async function createIssue(
  projectKey: string,
  summary: string,
  description: string,
  type: string,
  parentKey?: string
): Promise<string> {
  // Resolve the issue type id (language-independent)
  const issueTypeId = await resolveIssueTypeId(projectKey, type);

  // Build the fields payload
  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary,
    description: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: description }],
        },
      ],
    },
    issuetype: { id: issueTypeId },
  };

  // Link child issues to their parent (Story→Epic or Subtask→Story)
  if (parentKey) {
    fields["parent"] = { key: parentKey };
  }

  const url = `${baseURL}rest/api/3/issue`;
  logger.debug(`Jira request: POST ${url}`);
  logger.debug(`Jira payload: ${JSON.stringify({ fields }, null, 2)}`);

  try {
    const response = await axios.post(url, { fields }, { headers });
    const issueKey = response.data.key as string;
    logger.info(`Jira: created ${type} ${issueKey} - ${summary}`);
    return issueKey;
  } catch (error: unknown) {
    // Extract detailed error from Jira API response
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const data = JSON.stringify(error.response.data, null, 2);
      logger.error(`Jira API error (${status}): ${data}`);
      throw new Error(`Jira API ${status}: ${data}`);
    }
    throw error;
  }
}