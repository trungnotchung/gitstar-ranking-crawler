
import repoQueue from './queue';

repoQueue.process(async (job: any) => {
  console.log("Processing repo:", job.data.repoFullName);
});
