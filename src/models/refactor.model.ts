export interface RefactorIssue {
  file: string;
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  suggestion: string;
}

export interface RefactorReport {
  projectType: "flutter" | "dotnet";
  issues: RefactorIssue[];
}
