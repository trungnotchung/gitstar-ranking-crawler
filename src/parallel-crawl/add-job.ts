// src/parallel-crawl/add-job.ts
import repoQueue from './queue';

interface JobData {
  repoFullName: string;
}

async function addJobToQueue() {
  // Add the job to the queue
  const job = await repoQueue.add({ repoFullName: "facebook/react" });

  console.log("Job added to queue with ID:", job.id);

  // Wait for job completion or failure using the queue event listeners
  repoQueue.on('completed', (job) => {
    console.log(`Job with ID ${job.id} completed.`);
  });

  repoQueue.on('failed', (job, err) => {
    console.log(`Job with ID ${job.id} failed with error:`, err);
  });
}

addJobToQueue();
