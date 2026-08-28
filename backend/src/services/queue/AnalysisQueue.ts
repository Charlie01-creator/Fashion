export interface AnalysisJob {
  itemId: string;
  userId: string;
}

export type AnalysisJobProcessor = (job: AnalysisJob) => Promise<void>;

/**
 * Abstraction over "how does AI analysis actually get run in the
 * background". `clothingService` only ever calls `enqueue()` — it never
 * knows or cares whether that means "runs on the next tick of this same
 * process" (today) or "published to a durable queue and picked up by a
 * separate worker" (the production version of this). See
 * InMemoryAnalysisQueue for what's actually implemented right now, and
 * docs/ARCHITECTURE.md for the upgrade path.
 */
export interface AnalysisQueue {
  /** Registers the function that actually performs the work. Called once at startup. */
  setProcessor(processor: AnalysisJobProcessor): void;
  /** Schedules a job. Resolves once the job is scheduled — NOT once it's finished. */
  enqueue(job: AnalysisJob): Promise<void>;
}
