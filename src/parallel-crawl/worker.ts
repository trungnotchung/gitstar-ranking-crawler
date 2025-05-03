import fs from "fs";
import { PROXY_URL_1, PROXY_URL_2, PROXY_URL_3, PROXY_URL_4 } from "../config";
import { getAllReleasesAndCommits } from "../crawlService";
import repoQueue from "./queue";

const CACHE_FILE = "cache.json";

// Initialize cache file if it doesn't exist
if (!fs.existsSync(CACHE_FILE)) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({}));
}

// Get worker ID from environment variable or use default
const workerId = process.env.WORKER_ID || "1";
const proxyUrls = {
  "1": PROXY_URL_1,
  "2": PROXY_URL_2,
  "3": PROXY_URL_3,
  "4": PROXY_URL_4,
};

const currentProxyUrl =
  proxyUrls[workerId as keyof typeof proxyUrls] || PROXY_URL_1;

/**
 * Process each job from the queue
 */
repoQueue.process(async (job) => {
  const repoFullName = job.data.repoFullName;
  console.log(
    `🚀 Worker ${workerId} (Proxy: ${currentProxyUrl}) Processing repo: ${repoFullName}`
  );

  try {
    // Read the cache file
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));

    // Check if repository is in cache
    if (cache[repoFullName]) {
      console.log(`📦 Using cached data for ${repoFullName}`);
      return { success: true, result: cache[repoFullName], cached: true };
    }

    const result = await getAllReleasesAndCommits(
      repoFullName,
      currentProxyUrl
    );
    console.log(`✅ Worker ${workerId} completed repo: ${repoFullName}`);

    // Update cache with new data
    cache[repoFullName] = result;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

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
