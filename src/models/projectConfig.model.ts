/**
 * Represents a single project entry in project.config.json
 */
export interface ProjectConfig {
  name: string;
  path: string;
  technology: string;
  jiraProjectKey: string;
  defaultBranch: string;
  featuresFolder: string;
}
