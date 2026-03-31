import readline from "node:readline";

/**
 * CLI input result returned to the orchestrator
 */
export interface CliInput {
  projectName: string;
  featureName: string;
  requirementFilePath: string;
}

/**
 * Prompt the user with a question and return their answer
 */
function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Interactive CLI flow: asks user for project name, feature name,
 * and path to the requirement file.
 */
export async function getCliInput(): Promise<CliInput> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const projectName = await ask(rl, "Enter the project name: ");
    if (!projectName) {
      throw new Error("Project name is required.");
    }

    const featureName = await ask(rl, "Enter the feature name: ");
    if (!featureName) {
      throw new Error("Feature name is required.");
    }

    const requirementFilePath = await ask(
      rl,
      "Enter the path to the requirement file (.txt, .md, .xml): "
    );
    if (!requirementFilePath) {
      throw new Error("Requirement file path is required.");
    }

    return { projectName, featureName, requirementFilePath };
  } finally {
    rl.close();
  }
}
