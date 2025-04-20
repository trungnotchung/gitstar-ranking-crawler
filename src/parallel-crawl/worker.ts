
import { crawl } from './crawl';
import repoQueue from './queue';

repoQueue.process(async (job: any) => {
  console.log("Processing repo:", job.data.repoFullName);
  const result = await crawl(job.data.repoFullName);
  console.log(result);
  // TODO: save to db
  console.log("Repo processed:", job.data.repoFullName);
  return { success: true, result };
});

repoQueue.on('completed', (job: any) => {
  console.log("Job completed:", job.id);
});

repoQueue.on('failed', (job: any, err: any) => {
  console.log("Job failed:", job.id, err);
});
