import fs from "fs";
import { getAllReleasesAndCommits } from "../crawlService";
import repoQueue from "./queue";
import { config } from "../config";

// Get worker ID from environment variable or use default
const workerId = process.env.WORKER_ID || "1";

const currentProxyUrl = config.proxyUrls[parseInt(workerId) - 1];

/**
 * Process each job from the queue
 */
repoQueue.process(async (job) => {
  const repoFullName = job.data.repoFullName;
  console.log(
    `🚀 Worker ${workerId} (Proxy: ${currentProxyUrl}) Processing repo: ${repoFullName}`
  );

  try {
    const result = await getAllReleasesAndCommits(
      repoFullName,
      currentProxyUrl
    );
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
