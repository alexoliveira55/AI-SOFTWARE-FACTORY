import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

export const env = {
  jiraUrl: process.env.JIRA_URL!,
  jiraEmail: process.env.JIRA_EMAIL!,
  jiraToken: process.env.JIRA_TOKEN!,
  jiraProject: process.env.JIRA_PROJECT!,
};