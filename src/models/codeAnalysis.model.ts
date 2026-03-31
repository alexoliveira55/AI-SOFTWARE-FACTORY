export interface CodeAnalysis {
  projectType: "flutter" | "dotnet";
  modules: string[];
  controllers: string[];
  services: string[];
  repositories: string[];
  models: string[];
  dtos: string[];
  interfaces: string[];
}
