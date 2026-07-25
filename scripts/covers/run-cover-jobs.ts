export type CoverJobFailureHandler<T> = (
  job: T,
  error: unknown,
) => void;

export async function runCoverJobs<T>(
  jobs: T[],
  concurrency: number,
  processJob: (job: T) => Promise<void>,
  onFailure?: CoverJobFailureHandler<T>,
): Promise<void> {
  const queue = [...jobs];
  const errors: unknown[] = [];
  const requestedWorkers = Number.isFinite(concurrency)
    ? Math.floor(concurrency)
    : 1;
  const workerCount = Math.max(1, requestedWorkers);

  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const job = queue.shift();
      if (job === undefined) break;

      try {
        await processJob(job);
      } catch (error) {
        errors.push(error);
        onFailure?.(job, error);
      }
    }
  });

  await Promise.all(workers);
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `${errors.length} cover job(s) failed.`,
    );
  }
}
