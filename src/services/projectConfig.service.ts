import fs from "node:fs";
import path from "node:path";
import type { ProjectConfig } from "../models/projectConfig.model";
import { logger } from "../utils/logger";

// Path to the JSON config file
const configPath = path.resolve(__dirname, "..", "config", "project.config.json");

/**
 * Load all projects from the config file
 */
export function loadProjectsConfig(): ProjectConfig[] {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Project config file not found at: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as { projects: ProjectConfig[] };

  if (!Array.isArray(parsed.projects) || parsed.projects.length === 0) {
    throw new Error("No projects defined in project.config.json");
  }

  return parsed.projects;
}

/**
 * Find a project by its name. Throws if not found.
 */
export function getProjectByName(name: string): ProjectConfig {
  const projects = loadProjectsConfig();
  const project = projects.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );

  if (!project) {
    const available = projects.map((p) => p.name).join(", ");
    throw new Error(
      `Project "${name}" not found. Available projects: ${available}`
    );
  }

  logger.info(`Project loaded: ${project.name} (${project.technology})`);
  return project;
}
