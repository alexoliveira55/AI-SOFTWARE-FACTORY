import type { Task } from "./task.model";

export interface Story {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  tasks: Task[];
}

export interface PlanningOutput {
  stories: Story[];
}