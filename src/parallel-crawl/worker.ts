import repoQueue from './queue';
import { getAllReleasesAndCommits } from './crawl';

/**
 * Process each job from the queue
 */
repoQueue.process(async (job) => {
  const repoFullName = job.data.repoFullName;
  console.log(`🚀 Processing repo: ${repoFullName}`);

  try {
    const result = await getAllReleasesAndCommits(repoFullName);
    console.log(`✅ Repo processed: ${repoFullName}`);

    // TODO: save to database 

    return { success: true, result };
  } catch (error: any) {
    console.error(`❌ Error processing ${repoFullName}:`, error.message);
    throw error; 
  }
});

/**
 * Handle job completion
 */
repoQueue.on('completed', (job) => {
  console.log(`Job completed: ${job.id}`);
});

/**
 * Handle job failure
 */
repoQueue.on('failed', (job, err) => {
  console.error(`Job failed: ${job.id}`, err);
});
