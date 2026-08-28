import { InMemoryAnalysisQueue } from "./InMemoryAnalysisQueue";

// Single instance for the process's lifetime — same pattern as
// services/storage and services/ai: one factory-selected singleton that
// the rest of the app imports and never constructs directly.
export const analysisQueue = new InMemoryAnalysisQueue();

export type { AnalysisJob, AnalysisJobProcessor, AnalysisQueue } from "./AnalysisQueue";
