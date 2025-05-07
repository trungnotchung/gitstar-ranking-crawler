// src/parallel-crawl/add-job.ts
import { crawlTopRepos } from "../crawlService";
import { ServiceFactory } from "../serviceFactory";

async function addJobsToQueue(numRepos: number) {
  const queue = ServiceFactory.getRepoQueue();
  const topRepos = await crawlTopRepos(numRepos);

  for (const repo of topRepos) {
    await queue.add(
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

  console.log(`Added ${topRepos.length} jobs to the queue`);
}

export async function setupDailyJob() {
  const queue = ServiceFactory.getRepoQueue();

  // Create a repeatable job that runs every 24 hours
  await queue.add(
    "fetch-top-repos",
    { numRepos: 5000   },
    {
      repeat: {
        every: 24 * 60 * 60 * 1000, // Every 24 hours in milliseconds
      },
    }
  );

  // Trigger the initial fetch
  await addJobsToQueue(5000);

  console.log("Set up daily repository fetching");
  console.log("Run 'pnpm run docker:up' to start processing the jobs");
}
