export interface Requirement {
  title: string;
  description: string;
  businessRules: string[];
  acceptanceCriteria: string[];
  affectedModules: string[];
}