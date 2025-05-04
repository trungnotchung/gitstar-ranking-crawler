import {
  getAllReleasesAndCommits,
  crawlTopRepos,
} from "../crawlService";
import { ServiceFactory } from "../serviceFactory";

const repoQueue = ServiceFactory.getRepoQueue();

// Get worker ID from environment variable or use default
const workerId = process.env.WORKER_ID || "1";

/**
 * Process individual repository crawling
 */
repoQueue.process("crawl-repo", async (job) => {
  const repoFullName = job.data.repoFullName;
  console.log(`🚀 Worker ${workerId} Processing repo: ${repoFullName}`);

  try {
    const result = await getAllReleasesAndCommits(repoFullName);
    console.log(`✅ Worker ${workerId} completed repo: ${repoFullName}`);
    return { success: true, result, cached: false };
  } catch (error: any) {
    console.error(
      `❌ Worker ${workerId} error processing ${repoFullName}:`,
      error.message
    );
    throw error;
  }
});

/**
 * Process top repositories fetching
 */
repoQueue.process("fetch-top-repos", async (job) => {
  const numRepos = job.data.numRepos || 5000;
  console.log(`Worker ${workerId} Fetching top ${numRepos} repositories`);

  try {
    const repos = await crawlTopRepos(numRepos);
    console.log(`Fetched ${repos.length} repositories`);

    for (const repo of repos) {
      await repoQueue.add(
        "crawl-repo",
        {
          repoFullName: repo.full_name,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        }
      );
    }

    console.log(`Added ${repos.length} jobs to the queue`);
    return { success: true };
  } catch (error: any) {
    console.error(
      `❌ Worker ${workerId} error fetching top repositories:`,
      error.message
    );
    throw error;
  }
});

/**
 * Handle job completion
 */
repoQueue.on("completed", (job) => {
  console.log(`Worker ${workerId} completed job: ${job.id}`);
});

/**
 * Handle job failure
 */
repoQueue.on("failed", (job, err) => {
  console.error(`Worker ${workerId} failed job: ${job.id}`, err);
});
