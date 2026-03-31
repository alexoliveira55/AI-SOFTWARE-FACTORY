export interface TestCase {
  title: string;
  description: string;
}

export interface TestPlan {
  story: string;
  task: string;
  tests: TestCase[];
}
