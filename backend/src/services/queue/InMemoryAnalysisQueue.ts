import type { AnalysisJob, AnalysisJobProcessor, AnalysisQueue } from "./AnalysisQueue";
import { logger } from "../../config/logger";

/**
 * In-process, in-memory queue. This is what "prepared for background jobs"
 * means at this phase: a real interface boundary exists (AnalysisQueue),
 * and `clothingService` is already written against it rather than calling
 * the analyzer directly — but the implementation behind that boundary is
 * intentionally the simplest thing that works, not a production job system.
 *
 * Concretely, this means jobs are NOT durable: a process restart between
 * `enqueue()` and the job running loses that job silently (the item is
 * left at aiStatus "PENDING" forever until someone manually retries via
 * POST /clothing/:id/analyze). There's also no cross-instance coordination —
 * fine for a single backend process, not fine once you run more than one.
 *
 * Upgrade path when that matters: implement `class BullMqAnalysisQueue
 * implements AnalysisQueue` backed by Redis, move the processor into a
 * separate worker process (`npm run worker`), swap the export in
 * queue/index.ts. `clothingService` does not change at all.
 */
export class InMemoryAnalysisQueue implements AnalysisQueue {
  private processor: AnalysisJobProcessor | null = null;

  setProcessor(processor: AnalysisJobProcessor): void {
    this.processor = processor;
  }

  async enqueue(job: AnalysisJob): Promise<void> {
    if (!this.processor) {
      throw new Error("AnalysisQueue.enqueue() called before a processor was registered");
    }
    const processor = this.processor;

    // setImmediate, not direct invocation: yields to the event loop so
    // enqueue() itself returns immediately and the HTTP response isn't
    // delayed by even the first tick of analysis work.
    setImmediate(() => {
      processor(job).catch((err) => {
        logger.error("Unhandled error in AI analysis job", {
          itemId: job.itemId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    });
  }
}
