// src/parallel-crawl/add-job.ts
import { config } from "../config";
import { fetchTopRepos } from "../crawlService";
import repoQueue from "./queue";

interface JobData {
  repoFullName: string;
}

async function addJobToQueue(numRepos: number) {
  const topRepos = await fetchTopRepos(numRepos, config.github.github_token);
  // Add the job to the queue
  for (const repo of topRepos) {
    console.log(`Adding job to queue for ${repo.full_name}`);
    const job = await repoQueue.add({ repoFullName: repo.full_name });
    console.log(`Job ${repo.full_name} added to queue with ID: ${job.id}`);
  }
}

// Wait for job completion or failure using the queue event listeners
repoQueue.on("completed", (job) => {
  console.log(`Job with ID ${job.id} completed.`);
});

repoQueue.on("failed", (job, err) => {
  console.log(`Job with ID ${job.id} failed with error:`, err);
});

addJobToQueue(100);
